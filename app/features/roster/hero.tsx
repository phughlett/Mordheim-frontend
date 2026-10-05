import { useEffect, useRef, useState } from "react";
import { type LadsGotTalentOptions, type LearnSpellInput, type Member, type MemberRole, type RecordAdvanceInput, type Roster, type SkillCategoryChoice, type SpellRollResponse, type WarbandOption, type WarriorAdvancementsData, type WarriorEquipmentData, type WarriorSkillsData, type WarriorSpellsData, type WarriorTypeOption } from "./types";
import { CapacityPanel } from "./components/capacity-panel";
import { AdvancementPanel } from "./components/advancement-panel";
import { MemberDetailsPanel } from "./components/member-details-panel";
import { MemberTable } from "./components/member-table";
import type { AdvancePurchaseRules, CampaignOption, PurchaseAdvanceInput } from "./types";
import { NewRosterDialog } from "./components/new-roster-dialog";
import { MutationHireDialog } from "./components/mutation-hire-dialog";
import { RosterFields } from "./components/roster-fields";
import { CampaignBar } from "./components/campaign-bar";
import { apiBaseUrl, getToken, type AuthUser } from "../auth/auth";
import { BattlePanel } from "./components/battle-panel";
import { RosterHeading } from "./components/roster-heading";
import { RosterSidebar } from "./components/roster-sidebar";
import { RosterPrintExport } from "./components/roster-print-export";
import { RosterSummary } from "./components/roster-summary";
import { RosterTopbar } from "./components/roster-topbar";
import { SpellPanel } from "./components/spell-panel";

const emptyRoster: Roster = {
  id: "",
  name: "",
  warband: "",
  warbandId: null,
  treasury: "0",
  rating: "0",
  members: [],
  capacity: null,
  memberOrderCustomized: false,
};


async function apiRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401) window.dispatchEvent(new Event("mordheim:signed-out"));
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result as T;
}

function rosterModelCount(roster: Roster) {
  return roster.members.reduce((total, member) => total + (member.role === "Hired Sword" ? 0 : member.role === "Henchman" ? member.groupSize : 1), 0);
}

const FREEBUILD = "freebuild";
const freebuildOption: CampaignOption = { id: FREEBUILD, name: "Freebuild (no campaign)", maxGc: 500, warbandCount: 0 };
const rosterKey = (item: Roster) => item.campaignId ?? FREEBUILD;

export function Hero({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [otherRosters, setOtherRosters] = useState<Roster[]>([]);
  const [warbands, setWarbands] = useState<WarbandOption[]>([]);
  const [warriorTypes, setWarriorTypes] = useState<WarriorTypeOption[]>([]);
  const [memberEquipment, setMemberEquipment] = useState<WarriorEquipmentData | null>(null);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [equipmentError, setEquipmentError] = useState("");
  const [memberSkills, setMemberSkills] = useState<WarriorSkillsData | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState("");
  const [memberAdvancements, setMemberAdvancements] = useState<WarriorAdvancementsData | null>(null);
  const [advancementsLoading, setAdvancementsLoading] = useState(false);
  const [advancementsError, setAdvancementsError] = useState("");
  const [memberSpells, setMemberSpells] = useState<WarriorSpellsData | null>(null);
  const [spellsLoading, setSpellsLoading] = useState(false);
  const [spellsError, setSpellsError] = useState("");
  const [ladsGotTalentOptions, setLadsGotTalentOptions] = useState<LadsGotTalentOptions | null>(null);
  const [ladsGotTalentLoading, setLadsGotTalentLoading] = useState(false);
  const [ladsGotTalentError, setLadsGotTalentError] = useState("");
  const [newHeroTypeId, setNewHeroTypeId] = useState("");
  const [mutationHireTypeId, setMutationHireTypeId] = useState<string | null>(null);
  const [newHenchmanTypeId, setNewHenchmanTypeId] = useState("");
  const [newHenchmanGroupSize, setNewHenchmanGroupSize] = useState(1);
  const [newHiredSwordTypeId, setNewHiredSwordTypeId] = useState("");
  const [newHiredSwordEquipmentChoiceId, setNewHiredSwordEquipmentChoiceId] = useState("");
  const [activeRosterId, setActiveRosterId] = useState("");
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [typesLoading, setTypesLoading] = useState(false);
  const [deletingRoster, setDeletingRoster] = useState(false);
  const [creatingRoster, setCreatingRoster] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [newRosterDialogOpen, setNewRosterDialogOpen] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState("");
  const [copiedShareLink, setCopiedShareLink] = useState("");
  const rosterTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const memberTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingRosterUpdates = useRef(new Map<string, Partial<Roster>>());
  const pendingMemberUpdates = useRef(new Map<string, Partial<Member>>());

  useEffect(() => {
    let cancelled = false;
    void Promise.all([apiRequest<Roster[]>("/rosters"), apiRequest<WarbandOption[]>("/warbands"), apiRequest<CampaignOption[]>("/campaigns")])
      .then(async ([items, availableWarbands, availableCampaigns]) => {
        const code = new URL(window.location.href).searchParams.get("share");
        let shared: Roster | null = null;
        let shareError = "";
        if (code !== null) {
          try {
            shared = await apiRequest<Roster>("/shared-rosters/join", "POST", { code });
          } catch (requestError) {
            shareError = requestError instanceof Error ? requestError.message : "Could not open shared warband.";
          }
        }
        if (cancelled) return;
        setCampaigns(availableCampaigns);
        setActiveCampaignId(shared ? rosterKey(shared) : items[0] ? rosterKey(items[0]) : availableCampaigns[0]?.id ?? FREEBUILD);
        setRosters(items);
        if (shared && shared.ownerId !== user.id) setOtherRosters([shared]);
        setWarbands(availableWarbands);
        setActiveRosterId(shared?.id ?? items[0]?.id ?? "");
        setError(shareError);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Could not load rosters.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      rosterTimers.current.forEach(clearTimeout);
      memberTimers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      campaigns.some((item) => item.id === activeCampaignId) ? apiRequest<Roster[]>(`/campaigns/${activeCampaignId}/rosters`) : Promise.resolve([] as Roster[]),
      apiRequest<Roster[]>("/shared-rosters"),
    ]).then(([mates, shared]) => {
      if (cancelled) return;
      const seen = new Set<string>();
      setOtherRosters([...mates, ...shared].filter((item) => item.ownerId !== user.id && !seen.has(item.id) && seen.add(item.id)));
    }).catch((requestError: unknown) => {
      if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Could not load shared warbands.");
    });
    return () => { cancelled = true; };
  }, [activeCampaignId, campaigns, user.id]);

  const campaignRosters = rosters.filter((item) => rosterKey(item) === activeCampaignId);
  const visibleOthers = otherRosters.filter((item) => rosterKey(item) === activeCampaignId || (item.campaignId && !campaigns.some((c) => c.id === item.campaignId)));
  const viewing = visibleOthers.find((item) => item.id === activeRosterId) ?? null;
  const activeCampaign = activeCampaignId === FREEBUILD ? freebuildOption : campaigns.find((item) => item.id === activeCampaignId) ?? null;
  const roster = viewing ?? campaignRosters.find((item) => item.id === activeRosterId) ?? campaignRosters[0] ?? emptyRoster;
  const readOnly = viewing !== null;
  const shareLink = roster.shareCode
    ? `${window.location.origin}/?share=${encodeURIComponent(roster.shareCode)}`
    : "";
  const members = roster.members;
  const selectedMember = members.find((item) => item.id === activeMemberId);
  const heroes = members.filter((member) => member.role === "Hero").length;
  const henchmen = members.filter((member) => member.role === "Henchman").reduce((total, member) => total + member.groupSize, 0);
  const canHire = roster.campaign?.allowedActions.includes("hire") ?? true;
  const hiredSwords = members.filter((member) => member.role === "Hired Sword").length;
  const capacity = roster.capacity;
  const atMemberLimit = Boolean(capacity && capacity.currentMembers >= capacity.maxMembers);
  const atHeroLimit = Boolean(capacity && capacity.currentHeroes >= capacity.maxHeroes);
  const selectedHiredSword = warriorTypes.find((type) => type.id === newHiredSwordTypeId);
  const pricedHeroTypes = warriorTypes.filter((type) => type.category === "Hero" && type.hireCost !== null);
  const pricedHenchmanTypes = warriorTypes.filter((type) => type.category === "Henchman" && type.hireCost !== null);
  const selectedHeroType = pricedHeroTypes.find((type) => type.id === newHeroTypeId);
  const mutationHireType = pricedHeroTypes.find((type) => type.id === mutationHireTypeId);
  const selectedHenchmanType = pricedHenchmanTypes.find((type) => type.id === newHenchmanTypeId);
  const selectedHenchmanCount = selectedHenchmanType
    ? members.filter((member) => member.warriorTypeId === selectedHenchmanType.id).reduce((total, member) => total + member.groupSize, 0)
    : 0;
  const selectedHenchmanMaximum = selectedHenchmanType ? warriorTypeMaxCount(selectedHenchmanType) : null;
  const selectedHenchmanHireCost = (selectedHenchmanType?.hireCost ?? 0) * newHenchmanGroupSize;
  const selectedWarriorType = selectedMember
    ? warriorTypes.find((type) => type.id === selectedMember.warriorTypeId)
    : undefined;

  function isPromotedHenchman(member: Member) {
    return member.role === "Hero"
      && warriorTypes.some((type) => type.id === member.warriorTypeId && type.category === "Henchman");
  }

  function warriorTypeMaxCount(type: WarriorTypeOption, exceptMemberId?: string) {
    const referenceCount = type.maxCountReferenceTypes.length
      ? members.filter((member) => member.id !== exceptMemberId && type.maxCountReferenceTypes.includes(member.type)).reduce((total, member) => total + member.groupSize, 0) * type.maxCountMultiplier
      : null;
    if (type.maxCount === null) return referenceCount;
    return referenceCount === null ? type.maxCount : Math.min(type.maxCount, referenceCount);
  }

  function isWarriorTypeAtLimit(type: WarriorTypeOption, exceptMemberId?: string) {
    const maximum = warriorTypeMaxCount(type, exceptMemberId);
    const current = members.filter((member) => member.id !== exceptMemberId && member.warriorTypeId === type.id).reduce((total, member) => total + member.groupSize, 0);
    return maximum !== null && current >= maximum;
  }

  function warriorTypeOptionLabel(type: WarriorTypeOption, exceptMemberId?: string) {
    const selectedMember = members.find((member) => member.id === exceptMemberId);
    const countExclusion = selectedMember?.warriorTypeId === type.id ? undefined : exceptMemberId;
    const maximum = warriorTypeMaxCount(type, countExclusion);
    const current = members.filter((member) => member.id !== countExclusion && member.warriorTypeId === type.id).reduce((total, member) => total + member.groupSize, 0);
    const count = maximum === null ? "" : ` (${current}/${maximum})`;
    const bonus = type.memberLimitBonus > 0 ? ` (+${type.memberLimitBonus} size)` : "";
    const conditional = type.availability === "conditional" ? " (Conditional)" : "";
    return `${type.name}${count}${bonus}${conditional}`;
  }

  useEffect(() => {
    if (!roster.warbandId) {
      setWarriorTypes([]);
      setTypesLoading(false);
      return;
    }
    let cancelled = false;
    setTypesLoading(true);
    void apiRequest<WarriorTypeOption[]>(`/warbands/${roster.warbandId}/warrior-types`)
      .then((types) => {
        if (!cancelled) setWarriorTypes(types);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Could not load warrior types.");
      })
      .finally(() => {
        if (!cancelled) setTypesLoading(false);
      });
    return () => { cancelled = true; };
  }, [roster.warbandId]);

  useEffect(() => {
    if (!selectedMember) {
      setMemberEquipment(null);
      setEquipmentLoading(false);
      setEquipmentError("");
      return;
    }
    let cancelled = false;
    setEquipmentLoading(true);
    setEquipmentError("");
    void apiRequest<WarriorEquipmentData>(`/members/${selectedMember.id}/equipment`)
      .then((equipment) => { if (!cancelled) setMemberEquipment(equipment); })
      .catch((requestError: unknown) => {
        if (!cancelled) setEquipmentError(requestError instanceof Error ? requestError.message : "Could not load equipment.");
      })
      .finally(() => { if (!cancelled) setEquipmentLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMember?.id, selectedMember?.warriorTypeId, selectedMember?.groupSize]);

  function loadMemberSkills(memberId: string) {
    let cancelled = false;
    setSkillsLoading(true);
    setSkillsError("");
    void apiRequest<WarriorSkillsData>(`/members/${memberId}/skills`)
      .then((skills) => { if (!cancelled) setMemberSkills(skills); })
      .catch((requestError: unknown) => {
        if (!cancelled) setSkillsError(requestError instanceof Error ? requestError.message : "Could not load skills.");
      })
      .finally(() => { if (!cancelled) setSkillsLoading(false); });
    return () => { cancelled = true; };
  }

  useEffect(() => {
    if (!selectedMember) {
      setMemberSkills(null);
      setSkillsLoading(false);
      setSkillsError("");
      return;
    }
    return loadMemberSkills(selectedMember.id);
  }, [selectedMember?.id, selectedMember?.warriorTypeId]);

  useEffect(() => {
    if (!selectedMember) {
      setMemberAdvancements(null);
      setAdvancementsLoading(false);
      setAdvancementsError("");
      return;
    }
    let cancelled = false;
    setAdvancementsLoading(true);
    setAdvancementsError("");
    void apiRequest<WarriorAdvancementsData>(`/members/${selectedMember.id}/advances`)
      .then((advancements) => { if (!cancelled) setMemberAdvancements(advancements); })
      .catch((requestError: unknown) => {
        if (!cancelled) setAdvancementsError(requestError instanceof Error ? requestError.message : "Could not load advances.");
      })
      .finally(() => { if (!cancelled) setAdvancementsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMember?.id, selectedMember?.warriorTypeId, selectedMember?.experience, selectedMember?.role]);

  useEffect(() => {
    if (!selectedMember) {
      setMemberSpells(null);
      setSpellsLoading(false);
      setSpellsError("");
      return;
    }
    let cancelled = false;
    setSpellsLoading(true);
    setSpellsError("");
    void apiRequest<WarriorSpellsData>(`/members/${selectedMember.id}/spells`)
      .then((spells) => { if (!cancelled) setMemberSpells(spells); })
      .catch((requestError: unknown) => {
        if (!cancelled) setSpellsError(requestError instanceof Error ? requestError.message : "Could not load spells.");
      })
      .finally(() => { if (!cancelled) setSpellsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMember?.id, selectedMember?.warriorTypeId]);

  useEffect(() => {
    if (!selectedMember || !isPromotedHenchman(selectedMember)) {
      setLadsGotTalentOptions(null);
      setLadsGotTalentLoading(false);
      setLadsGotTalentError("");
      return;
    }
    let cancelled = false;
    setLadsGotTalentLoading(true);
    setLadsGotTalentError("");
    void apiRequest<LadsGotTalentOptions>(`/members/${selectedMember.id}/lads-got-talent-options`)
      .then((options) => { if (!cancelled) setLadsGotTalentOptions(options); })
      .catch((requestError: unknown) => {
        if (!cancelled) setLadsGotTalentError(requestError instanceof Error ? requestError.message : "Could not load skill-list choices.");
      })
      .finally(() => { if (!cancelled) setLadsGotTalentLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMember?.id, selectedMember?.warriorTypeId]);

  async function refreshRosters() {
    setRosters(await apiRequest<Roster[]>("/rosters"));
  }

  function replaceRoster(updated: Roster) {
    setRosters((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  function updateRoster(changes: Partial<Roster>) {
    if (!roster.id) return;
    const { members: _members, ...fields } = changes;
    if (Object.keys(fields).length === 0) return;
    setSaved(false);
    setError("");
    setRosters((current) => current.map((item) => item.id === roster.id ? { ...item, ...fields } : item));
    const pending = pendingRosterUpdates.current;
    pending.set(roster.id, { ...pending.get(roster.id), ...fields });
    const existingTimer = rosterTimers.current.get(roster.id);
    if (existingTimer) clearTimeout(existingTimer);
    rosterTimers.current.set(roster.id, setTimeout(async () => {
      const update = pending.get(roster.id);
      pending.delete(roster.id);
      rosterTimers.current.delete(roster.id);
      if (!update) return;
      try {
        const stored = await apiRequest<Roster>(`/rosters/${roster.id}`, "PATCH", update);
        setRosters((current) => current.map((item) => item.id === roster.id ? { ...item, ...stored, members: item.members } : item));
        if (rosterTimers.current.size === 0 && memberTimers.current.size === 0) setSaved(true);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not save roster changes.");
      }
    }, 350));
  }

  function selectWarriorType(memberId: string, typeId: string) {
    const selected = warriorTypes.find((type) => type.id === typeId);
    if (!selected) {
      updateMember(memberId, { warriorTypeId: null, memberLimitBonus: 0, large: false, type: "" });
      return;
    }
    updateMember(memberId, {
      warriorTypeId: selected.id,
      memberLimitBonus: selected.memberLimitBonus,
      large: selected.large,
      type: selected.name,
      role: selected.category,
    });
  }

  async function promoteMember(memberId: string) {
    const member = members.find((item) => item.id === memberId);
    if (!member || !window.confirm(`Promote ${member.name} after a successful Lad's Got Talent advance?`)) return;
    setSaved(false);
    setError("");
    try {
      const promotedMember = await apiRequest<Member>(`/members/${memberId}/promote`, "POST");
      const updatedRoster = await apiRequest<Roster>(`/rosters/${roster.id}`);
      setRosters((current) => current.map((item) => item.id === roster.id ? updatedRoster : item));
      setActiveMemberId(promotedMember.id);
      setSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not promote this Henchman.");
      setSaved(true);
    }
  }

  function beginHeroRecruitment() {
    if (!selectedHeroType) return;
    if (selectedHeroType.mutationOptions.length) {
      setError("");
      setMutationHireTypeId(selectedHeroType.id);
    } else {
      void addMember("Hero", selectedHeroType.id);
    }
  }

  async function addMember(role: MemberRole, warriorTypeId?: string, groupSize = 1, equipmentChoiceId?: string, mutationIds?: string[]) {
    if (!roster.id) return false;
    try {
      setSaved(false);
      const selectedType = warriorTypes.find((type) => type.id === warriorTypeId);
      const member = await apiRequest<Member>(`/rosters/${roster.id}/members`, "POST", {
        name: (role === "Hero" || role === "Henchman" || role === "Hired Sword") && selectedType
          ? selectedType.name
          : `${role} ${members.filter((item) => item.role === role).length + 1}`,
        role,
        ...(role === "Henchman" ? { groupSize } : {}),
        ...(warriorTypeId ? { warriorTypeId } : {}),
        ...(equipmentChoiceId ? { equipmentChoiceId } : {}),
        ...(mutationIds ? { mutationIds } : {}),
      });
      const updatedRoster = await apiRequest<Roster>(`/rosters/${roster.id}`);
      setRosters((current) => current.map((item) => item.id === roster.id ? updatedRoster : item));
      setActiveMemberId(member.id);
      if (role === "Hero") setNewHeroTypeId("");
      if (role === "Henchman") {
        setNewHenchmanTypeId("");
        setNewHenchmanGroupSize(1);
      }
      if (role === "Hired Sword") {
        setNewHiredSwordTypeId("");
        setNewHiredSwordEquipmentChoiceId("");
      }
      setSaved(true);
      setError("");
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not add warrior.");
      setSaved(false);
      return false;
    }
  }

  async function setMutations(memberId: string, mutationIds: string[]) {
    setSaved(false);
    try {
      const updated = await apiRequest<WarriorEquipmentData & { treasury: string }>(`/members/${memberId}/mutations`, "PUT", { mutationIds });
      setMemberEquipment(updated);
      replaceRoster(await apiRequest<Roster>(`/rosters/${roster.id}`));
      setEquipmentError("");
      setSaved(true);
      return true;
    } catch (requestError) {
      setEquipmentError(requestError instanceof Error ? requestError.message : "Could not save mutations.");
      setSaved(false);
      return false;
    }
  }

  async function purchaseEquipment(memberId: string, equipmentOptionId: string, modelIndex: number, quantity: number) {
    if (!roster.id) return;
    setSaved(false);
    try {
      const purchase = await apiRequest<WarriorEquipmentData & { treasury: string }>(`/members/${memberId}/equipment`, "POST", {
        equipmentOptionId,
        modelIndex,
        quantity,
      });
      setMemberEquipment(purchase);
      const updatedRoster = await apiRequest<Roster>(`/rosters/${roster.id}`);
      setRosters((current) => current.map((item) => item.id === roster.id ? updatedRoster : item));
      setEquipmentError("");
      setError("");
    } catch (requestError) {
      setEquipmentError(requestError instanceof Error ? requestError.message : "Could not purchase equipment.");
    } finally {
      setSaved(true);
    }
  }

  async function sellEquipment(memberId: string, inventoryItemIds: string[]) {
    if (!roster.id) return;
    setSaved(false);
    try {
      const sale = await apiRequest<WarriorEquipmentData & { treasury: string; refundAmount: number }>(`/members/${memberId}/equipment`, "DELETE", { inventoryItemIds });
      setMemberEquipment(sale);
      const updatedRoster = await apiRequest<Roster>(`/rosters/${roster.id}`);
      setRosters((current) => current.map((item) => item.id === roster.id ? updatedRoster : item));
      setEquipmentError("");
      setError("");
    } catch (requestError) {
      setEquipmentError(requestError instanceof Error ? requestError.message : "Could not sell equipment.");
    } finally {
      setSaved(true);
    }
  }

  async function learnSkill(memberId: string, skillId: string, advanceId: string) {
    setSkillsError("");
    try {
      const skills = await apiRequest<WarriorSkillsData>(`/members/${memberId}/skills`, "POST", { skillId, advanceId });
      setMemberSkills(skills);
      setMemberAdvancements(await apiRequest<WarriorAdvancementsData>(`/members/${memberId}/advances`));
    } catch (requestError) {
      setSkillsError(requestError instanceof Error ? requestError.message : "Could not learn this skill.");
    }
  }

  async function forgetSkill(memberId: string, warriorSkillId: string) {
    setSkillsError("");
    try {
      const skills = await apiRequest<WarriorSkillsData>(`/members/${memberId}/skills/${warriorSkillId}`, "DELETE");
      setMemberSkills(skills);
      setMemberAdvancements(await apiRequest<WarriorAdvancementsData>(`/members/${memberId}/advances`));
      replaceRoster(await apiRequest<Roster>(`/rosters/${roster.id}`));
    } catch (requestError) {
      setSkillsError(requestError instanceof Error ? requestError.message : "Could not forget this skill.");
    }
  }

  async function setLadsGotTalentChoices(memberId: string, choices: SkillCategoryChoice[]) {
    setLadsGotTalentError("");
    try {
      const skills = await apiRequest<WarriorSkillsData>(`/members/${memberId}/skill-category-overrides`, "PUT", { choices });
      setMemberSkills(skills);
      const options = await apiRequest<LadsGotTalentOptions>(`/members/${memberId}/lads-got-talent-options`);
      setLadsGotTalentOptions(options);
    } catch (requestError) {
      setLadsGotTalentError(requestError instanceof Error ? requestError.message : "Could not save skill-list choices.");
    }
  }

  async function learnSpell(memberId: string, input: LearnSpellInput) {
    setSpellsError("");
    try {
      const spells = await apiRequest<WarriorSpellsData>(`/members/${memberId}/spells`, "POST", input);
      setMemberSpells(spells);
      if (input.advanceId) setMemberAdvancements(await apiRequest<WarriorAdvancementsData>(`/members/${memberId}/advances`));
      return true;
    } catch (requestError) {
      setSpellsError(requestError instanceof Error ? requestError.message : "Could not record this spell.");
      return false;
    }
  }

  async function rollSpells(memberId: string, disciplineId: string, count: 1 | 2) {
    setSpellsError("");
    try {
      return await apiRequest<SpellRollResponse>(`/members/${memberId}/spells/roll`, "POST", { disciplineId, count });
    } catch (requestError) {
      setSpellsError(requestError instanceof Error ? requestError.message : "Could not roll spells.");
      return null;
    }
  }

  async function forgetSpell(memberId: string, warriorSpellId: string) {
    setSpellsError("");
    try {
      setMemberSpells(await apiRequest<WarriorSpellsData>(`/members/${memberId}/spells/${warriorSpellId}`, "DELETE"));
      return true;
    } catch (requestError) {
      setSpellsError(requestError instanceof Error ? requestError.message : "Could not forget this spell.");
      return false;
    }
  }

  async function reduceSpellDifficulty(memberId: string, warriorSpellId: string, advanceId: string) {
    setSpellsError("");
    try {
      setMemberSpells(await apiRequest<WarriorSpellsData>(`/members/${memberId}/spells/${warriorSpellId}/reduce-difficulty`, "POST", { advanceId }));
      setMemberAdvancements(await apiRequest<WarriorAdvancementsData>(`/members/${memberId}/advances`));
      return true;
    } catch (requestError) {
      setSpellsError(requestError instanceof Error ? requestError.message : "Could not reduce this spell's casting difficulty.");
      return false;
    }
  }

  async function setSpellDiscipline(memberId: string, disciplineId: string) {
    setSpellsError("");
    try {
      setMemberSpells(await apiRequest<WarriorSpellsData>(`/members/${memberId}/spells/discipline`, "PUT", { disciplineId }));
      return true;
    } catch (requestError) {
      setSpellsError(requestError instanceof Error ? requestError.message : "Could not select this spell list.");
      return false;
    }
  }

  async function recordMagicTome(memberId: string, unitCostPaid: number | null) {
    setSpellsError("");
    try {
      setMemberSpells(await apiRequest<WarriorSpellsData>(`/members/${memberId}/spells/tomes`, "POST", { unitCostPaid }));
      return true;
    } catch (requestError) {
      setSpellsError(requestError instanceof Error ? requestError.message : "Could not record the Tome of Magic.");
      return false;
    }
  }

  async function consumeMagicTome(memberId: string) {
    setSpellsError("");
    try {
      setMemberSpells(await apiRequest<WarriorSpellsData>(`/members/${memberId}/spells/learn-lesser-magic`, "POST"));
      return true;
    } catch (requestError) {
      setSpellsError(requestError instanceof Error ? requestError.message : "Could not use this Tome to learn Lesser Magic.");
      return false;
    }
  }

  async function purchaseAdvance(memberId: string, input: PurchaseAdvanceInput) {
    setAdvancementsError("");
    try {
      setMemberAdvancements(await apiRequest<WarriorAdvancementsData>(`/members/${memberId}/advance-purchases`, "POST", input));
      setMemberSkills(await apiRequest<WarriorSkillsData>(`/members/${memberId}/skills`));
      replaceRoster(await apiRequest<Roster>(`/rosters/${roster.id}`));
      setSaved(true);
      return true;
    } catch (requestError) {
      setAdvancementsError(requestError instanceof Error ? requestError.message : "Could not purchase this advancement.");
      return false;
    }
  }

  async function recordMemberAdvance(memberId: string, input: RecordAdvanceInput) {
    setAdvancementsError("");
    try {
      const advancements = await apiRequest<WarriorAdvancementsData>(`/members/${memberId}/advances`, "POST", input);
      setMemberAdvancements(advancements);
      setMemberSkills(await apiRequest<WarriorSkillsData>(`/members/${memberId}/skills`));
      const updatedRoster = await apiRequest<Roster>(`/rosters/${roster.id}`);
      setRosters((current) => current.map((item) => item.id === roster.id ? updatedRoster : item));
      setSaved(true);
      return true;
    } catch (requestError) {
      setAdvancementsError(requestError instanceof Error ? requestError.message : "Could not record this advance.");
      return false;
    }
  }

  async function removeMemberAdvance(memberId: string, advanceId: string) {
    setAdvancementsError("");
    try {
      const advancements = await apiRequest<WarriorAdvancementsData>(`/members/${memberId}/advances/${advanceId}`, "DELETE");
      setMemberAdvancements(advancements);
      setMemberSkills(await apiRequest<WarriorSkillsData>(`/members/${memberId}/skills`));
      setMemberSpells(await apiRequest<WarriorSpellsData>(`/members/${memberId}/spells`));
      const updatedRoster = await apiRequest<Roster>(`/rosters/${roster.id}`);
      setRosters((current) => current.map((item) => item.id === roster.id ? updatedRoster : item));
      setSaved(true);
      return true;
    } catch (requestError) {
      setAdvancementsError(requestError instanceof Error ? requestError.message : "Could not remove this advance.");
      return false;
    }
  }

  async function resizeHenchmanGroup(memberId: string, groupSize: number) {
    if (!roster.id) return;
    setSaved(false);
    try {
      await apiRequest<Member>(`/members/${memberId}`, "PATCH", { groupSize });
      const updated = await apiRequest<Roster>(`/rosters/${roster.id}`);
      setRosters((current) => current.map((item) => item.id === updated.id ? updated : item));
      setError("");
      if (rosterTimers.current.size === 0 && memberTimers.current.size === 0) setSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not resize the Henchman group.");
      setSaved(true);
    }
  }

  function updateMember(id: string, changes: Partial<Member>) {
    if (!roster.id) return;
    setSaved(false);
    setError("");
    setRosters((current) => current.map((item) => item.id === roster.id ? {
      ...item,
      members: item.members.map((member) => member.id === id ? { ...member, ...changes } : member),
    } : item));
    const pending = pendingMemberUpdates.current;
    pending.set(id, { ...pending.get(id), ...changes });
    const existingTimer = memberTimers.current.get(id);
    if (existingTimer) clearTimeout(existingTimer);
    memberTimers.current.set(id, setTimeout(async () => {
      const update = pending.get(id);
      pending.delete(id);
      memberTimers.current.delete(id);
      if (!update) return;
      try {
        await apiRequest<Member>(`/members/${id}`, "PATCH", update);
        const updatedRoster = await apiRequest<Roster>(`/rosters/${roster.id}`);
        setRosters((current) => current.map((item) => item.id === roster.id ? updatedRoster : item));
        if (activeMemberId === id) {
          try {
            setMemberAdvancements(await apiRequest<WarriorAdvancementsData>(`/members/${id}/advances`));
            setAdvancementsError("");
          } catch (requestError) {
            setAdvancementsError(requestError instanceof Error ? requestError.message : "Could not refresh advances.");
          }
        }
        if (rosterTimers.current.size === 0 && memberTimers.current.size === 0) setSaved(true);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not save warrior changes.");
        try {
          const currentRoster = await apiRequest<Roster>(`/rosters/${roster.id}`);
          setRosters((current) => current.map((item) => item.id === roster.id ? currentRoster : item));
          setSaved(true);
        } catch {
          setSaved(false);
        }
      }
    }, 350));
  }

  function selectCampaign(campaignId: string) {
    setActiveCampaignId(campaignId);
    setActiveRosterId(rosters.find((item) => rosterKey(item) === campaignId)?.id ?? "");
    setActiveMemberId(null);
  }

  async function createCampaign(name: string, maxGc: number, advancePurchaseRules: AdvancePurchaseRules) {
    try {
      const created = await apiRequest<CampaignOption>("/campaigns", "POST", { name, maxGc, advancePurchaseRules });
      setCampaigns((current) => [...current, created]);
      selectCampaign(created.id);
      setError("");
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create campaign.");
      return false;
    }
  }

  async function joinCampaign(code: string) {
    try {
      const joined = await apiRequest<CampaignOption>("/campaigns/join", "POST", { code });
      setCampaigns((current) => current.some((item) => item.id === joined.id) ? current : [...current, joined]);
      selectCampaign(joined.id);
      setError("");
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not join campaign.");
      return false;
    }
  }

  async function redeemShare(code: string) {
    try {
      const shared = await apiRequest<Roster>("/shared-rosters/join", "POST", { code });
      if (shared.ownerId !== user.id) {
        setOtherRosters((current) => current.some((item) => item.id === shared.id) ? current : [...current, shared]);
      }
      setActiveCampaignId(rosterKey(shared));
      setActiveRosterId(shared.id);
      setActiveMemberId(null);
      setError("");
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not add shared warband.");
      return false;
    }
  }

  async function toggleShare() {
    try {
      const updated = await apiRequest<Roster>(`/rosters/${roster.id}/share`, roster.shareCode ? "DELETE" : "POST");
      setRosters((current) => current.map((item) => item.id === roster.id ? { ...item, shareCode: updated.shareCode } : item));
      setCopiedShareLink("");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update sharing.");
    }

  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedShareLink(shareLink);
    } catch (copyError) {
      setError(copyError instanceof Error ? `Could not copy share link: ${copyError.message}` : "Could not copy share link. Copy the displayed link manually.");
    }
  }

  async function createRoster(warbandId: string, gc?: number) {
    setCreatingRoster(true);
    try {
      setSaved(false);
      const campaignId = activeCampaignId;
      const next = await apiRequest<Roster>("/rosters", "POST", { name: "Untitled Warband", warbandId, ...(campaignId === FREEBUILD ? { treasury: gc ?? 500 } : { campaignId }) });
      setCampaigns((current) => current.map((item) => item.id === campaignId ? { ...item, warbandCount: item.warbandCount + 1 } : item));
      setRosters((current) => [...current, next]);
      setActiveRosterId(next.id);
      setActiveMemberId(null);
      setSaved(true);
      setError("");
      setNewRosterDialogOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create roster.");
      setSaved(false);
    } finally {
      setCreatingRoster(false);
    }
  }

  function openNewRosterDialog() {
    setNewRosterDialogOpen(true);
  }

  async function removeRoster() {
    if (!roster.id || !window.confirm(`Delete “${roster.name}” and all of its warriors? This cannot be undone.`)) return;
    const rosterTimer = rosterTimers.current.get(roster.id);
    if (rosterTimer) clearTimeout(rosterTimer);
    rosterTimers.current.delete(roster.id);
    pendingRosterUpdates.current.delete(roster.id);
    for (const member of roster.members) {
      const memberTimer = memberTimers.current.get(member.id);
      if (memberTimer) clearTimeout(memberTimer);
      memberTimers.current.delete(member.id);
      pendingMemberUpdates.current.delete(member.id);
    }
    setDeletingRoster(true);
    setError("");
    try {
      await apiRequest<void>(`/rosters/${roster.id}`, "DELETE");
      const remaining = rosters.filter((item) => item.id !== roster.id);
      setRosters(remaining);
      setActiveRosterId(remaining[0]?.id ?? "");
      setActiveMemberId(null);
      setSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete roster.");
    } finally {
      setDeletingRoster(false);
    }
  }

  async function removeMember(id: string) {
    const pendingTimer = memberTimers.current.get(id);
    if (pendingTimer) clearTimeout(pendingTimer);
    memberTimers.current.delete(id);
    pendingMemberUpdates.current.delete(id);
    setSaved(false);
    try {
      await apiRequest<void>(`/members/${id}`, "DELETE");
      if (roster.id) {
        const updatedRoster = await apiRequest<Roster>(`/rosters/${roster.id}`);
        setRosters((current) => current.map((item) => item.id === roster.id ? updatedRoster : item));
      }
      if (activeMemberId === id) setActiveMemberId(null);
      setSaved(true);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not remove warrior.");
    }
  }

  async function reorderMembers(memberIds: string[]) {
    if (!roster.id) return;
    const membersById = new Map(roster.members.map((member) => [member.id, member]));
    const reorderedMembers = memberIds.map((id) => membersById.get(id)).filter((member): member is Member => Boolean(member));
    if (reorderedMembers.length !== roster.members.length) return;

    setSaved(false);
    setError("");
    setRosters((current) => current.map((item) => item.id === roster.id
      ? { ...item, members: reorderedMembers, memberOrderCustomized: true }
      : item));
    try {
      const updatedRoster = await apiRequest<Roster>(`/rosters/${roster.id}/member-order`, "PUT", { memberIds });
      setRosters((current) => current.map((item) => item.id === roster.id ? updatedRoster : item));
      setSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save warrior order.");
      try {
        const currentRoster = await apiRequest<Roster>(`/rosters/${roster.id}`);
        setRosters((current) => current.map((item) => item.id === roster.id ? currentRoster : item));
        setSaved(true);
      } catch {
        setSaved(false);
      }
    }
  }

  async function setCapacityModifier(modifierId: string, enabled: boolean) {
    if (!roster.id || !capacity) return;
    const modifierIds = new Set(capacity.selectedModifiers.map((modifier) => modifier.id));
    if (enabled) modifierIds.add(modifierId);
    else modifierIds.delete(modifierId);
    try {
      const updatedRoster = await apiRequest<Roster>(`/rosters/${roster.id}/capacity-modifiers`, "PUT", { modifierIds: [...modifierIds] });
      setRosters((current) => current.map((item) => item.id === roster.id ? updatedRoster : item));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update capacity items.");
    }
  }

  return (
    <div className="roster-app">
      <RosterSidebar
        rosters={campaignRosters}
        otherRosters={visibleOthers}
        onRedeemShare={redeemShare}
        campaigns={[freebuildOption, ...campaigns]}
        activeCampaignId={activeCampaignId}
        onSelectCampaign={selectCampaign}
        onCreateCampaign={createCampaign}
        campaignError={error}
        onJoinCampaign={joinCampaign}
        username={user.username}
        onLogout={onLogout}
        activeRosterId={roster.id}
        saved={saved}
        onSelectRoster={(rosterId) => { setActiveRosterId(rosterId); setActiveMemberId(null); }}
        onCreateRoster={openNewRosterDialog}
        canCreateRoster={activeCampaign !== null}
      />

      <main className="workspace" id="roster">
        <RosterTopbar loading={loading} saved={saved} />

        <div className="page-content">
          {error && <div className="api-error" role="alert">{error}<button type="button" onClick={() => window.location.reload()}>Retry connection</button></div>}
          {readOnly && <div className="readonly-banner">Viewing {roster.player ?? "another player"}'s warband · read-only</div>}
          {roster.id && (
            <div className="share-bar">
              <RosterPrintExport roster={roster} request={apiRequest} onError={setError} />
              {!readOnly && <button type="button" className="outline-button" onClick={() => void toggleShare()}>{roster.shareCode ? "Stop sharing" : "Share warband"}</button>}
              {!readOnly && roster.shareCode && <>
                <a href={shareLink}>{shareLink}</a>
                <button type="button" className="outline-button" onClick={() => void copyShareLink()}>{copiedShareLink === shareLink ? "Link copied" : "Copy link"}</button>
                <span>Share code: <code>{roster.shareCode}</code></span>
              </>}
            </div>
          )}
          <fieldset className="readonly-fieldset" disabled={readOnly}>
          <RosterHeading
            rosterId={roster.id}
            name={roster.name}
            loading={loading}
            deleting={deletingRoster}
            onNameChange={(name) => updateRoster({ name })}
            onDelete={removeRoster}
            onCreate={openNewRosterDialog}
          />
          {roster.campaignId && <CampaignBar roster={roster} onChange={replaceRoster} onError={setError} request={(path, method, body) => apiRequest<Roster>(path, method, body)} />}
          {roster.campaignId && (roster.campaign?.phase === "pre_battle" || roster.campaign?.phase === "battle") && (
            <BattlePanel campaignId={roster.campaignId} rosters={campaignRosters} request={apiRequest} onRostersChanged={refreshRosters} onError={setError} />
          )}
          <section className="roster-overview" aria-label="Warband overview">
            <RosterFields roster={roster} onUpdate={updateRoster} />
            {capacity && <CapacityPanel capacity={capacity} onToggleModifier={setCapacityModifier} />}
            <RosterSummary roster={roster} heroes={heroes} henchmen={henchmen} hiredSwords={hiredSwords} />
          </section>

          <section className="roster-section">
            <div className="section-heading">
              <div><div className="eyebrow">FIELD RECORD</div><h2>Warband members <span>{capacity?.currentMembers ?? rosterModelCount(roster)}</span></h2></div>
              <div className="section-actions">
                <div className="henchman-add">
                  <select aria-label="Henchman type to hire" value={newHenchmanTypeId} onChange={(event) => setNewHenchmanTypeId(event.target.value)} disabled={!canHire || !roster.warbandId || loading || typesLoading}>
                    <option value="">{pricedHenchmanTypes.length ? "Choose Henchman" : "No verified Henchman prices"}</option>
                    {pricedHenchmanTypes.map((type) => <option key={type.id} value={type.id} disabled={isWarriorTypeAtLimit(type)}>{type.name} · {type.hireCost === 0 ? "special recruitment · no GC" : `${type.hireCost} GC/model`}</option>)}
                  </select>
                  <input aria-label="Henchman group size" type="number" min={1} max={5} step={1} value={newHenchmanGroupSize} onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isInteger(value) && value >= 1 && value <= 5) setNewHenchmanGroupSize(value);
                  }} />
                  <button className="outline-button add-button" disabled={!canHire || !roster.warbandId || loading || typesLoading || !selectedHenchmanType || Number(roster.treasury) < selectedHenchmanHireCost || (capacity !== null && capacity.currentMembers + newHenchmanGroupSize > capacity.maxMembers + (selectedHenchmanType?.memberLimitBonus ?? 0)) || (selectedHenchmanMaximum !== null && selectedHenchmanCount + newHenchmanGroupSize > selectedHenchmanMaximum)} onClick={() => selectedHenchmanType && addMember("Henchman", newHenchmanTypeId, newHenchmanGroupSize)} type="button">
                    <span>+</span> {selectedHenchmanType ? selectedHenchmanHireCost === 0 ? "Add group · no GC" : `Hire group · ${selectedHenchmanHireCost} GC` : "Hire Henchmen"}
                  </button>
                </div>
                <div className="hero-add">
                  <select aria-label="Hero type to hire" value={newHeroTypeId} onChange={(event) => setNewHeroTypeId(event.target.value)} disabled={!canHire || !roster.warbandId || loading || typesLoading}>
                    <option value="">{pricedHeroTypes.length ? "Choose priced Hero" : "No verified Hero prices"}</option>
                    {pricedHeroTypes.map((type) => <option key={type.id} value={type.id}>{type.name} · {type.hireCost} GC</option>)}
                  </select>
                  <button className="primary-button" disabled={!canHire || !roster.warbandId || loading || typesLoading || !selectedHeroType || Number(roster.treasury) < (selectedHeroType?.hireCost ?? 0) || atMemberLimit || atHeroLimit} onClick={beginHeroRecruitment} type="button">
                    <span>+</span> {selectedHeroType ? `Hire Hero · ${selectedHeroType.hireCost} GC${selectedHeroType.mutationOptions.length ? " + mutations" : ""}` : "Hire Hero"}
                  </button>
                </div>
                <div className="hired-sword-add">
                  <select aria-label="Hired Sword type to add" value={newHiredSwordTypeId} onChange={(event) => { setNewHiredSwordTypeId(event.target.value); setNewHiredSwordEquipmentChoiceId(""); }} disabled={!canHire || !roster.warbandId || loading || typesLoading}>
                    <option value="">Choose Hired Sword</option>
                    {warriorTypes.filter((type) => type.category === "Hired Sword").map((type) => <option key={type.id} value={type.id} disabled={isWarriorTypeAtLimit(type)}>{warriorTypeOptionLabel(type)}{type.hireCost != null ? ` · ${type.hireCost} GC` : ""}</option>)}
                  </select>
                  {Boolean(selectedHiredSword?.equipmentChoices.length) && <select aria-label="Hired Sword starting equipment" value={newHiredSwordEquipmentChoiceId} onChange={(event) => setNewHiredSwordEquipmentChoiceId(event.target.value)} disabled={loading || typesLoading}>
                    <option value="">Choose starting equipment</option>
                    {selectedHiredSword?.equipmentChoices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
                  </select>}
                  <button className="outline-button add-button" disabled={!canHire || !roster.warbandId || loading || typesLoading || !selectedHiredSword || isWarriorTypeAtLimit(selectedHiredSword) || Number(roster.treasury) < (selectedHiredSword.hireCost ?? 0) || (Boolean(selectedHiredSword.equipmentChoices.length) && !newHiredSwordEquipmentChoiceId)} onClick={() => addMember("Hired Sword", newHiredSwordTypeId, 1, newHiredSwordEquipmentChoiceId || undefined)} type="button"><span>+</span> Add Hired Sword</button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="empty-state"><h3>Loading rosters...</h3></div>
            ) : !roster.id ? (
              <div className="empty-state"><div className="empty-mark">*</div><h3>No warband yet.</h3><p>Create a roster to start recording your campaign.</p><button className="primary-button" onClick={openNewRosterDialog} type="button"><span>+</span> Create first roster</button></div>
            ) : !roster.warbandId ? (
              <div className="empty-state"><div className="empty-mark">*</div><h3>Choose your warband.</h3><p>Select a warband to load its verified warrior types.</p></div>
            ) : roster.members.length === 0 ? (
              <div className="empty-state"><div className="empty-mark">*</div><h3>Your roster is waiting.</h3><p>Add a hero, henchman, or Hired Sword to begin recording this warband.</p><button className="primary-button" disabled={!canHire || !selectedHeroType || Number(roster.treasury) < (selectedHeroType?.hireCost ?? 0) || atHeroLimit || atMemberLimit} onClick={beginHeroRecruitment} type="button"><span>+</span> Hire first hero</button></div>
            ) : (
              <div className="member-layout">
                <MemberTable
                  freebuild={!roster.campaignId}
                  members={roster.members}
                  activeMemberId={activeMemberId}
                  warriorTypes={warriorTypes}
                  memberOrderCustomized={roster.memberOrderCustomized}
                  onReorderMembers={reorderMembers}
                  onSelectMember={setActiveMemberId}
                  onSelectWarriorType={selectWarriorType}
                  onUpdateMember={updateMember}
                  onRemoveMember={removeMember}
                  allowedActions={roster.campaign?.allowedActions}
                  isPromotedHenchman={isPromotedHenchman}
                  isWarriorTypeAtLimit={isWarriorTypeAtLimit}
                  warriorTypeOptionLabel={warriorTypeOptionLabel}
                  activeDetails={selectedMember ? (
                  <MemberDetailsPanel
                  allowedActions={roster.campaign?.allowedActions}
                  canAddGroupModel={!atMemberLimit && (!selectedWarriorType || !isWarriorTypeAtLimit(selectedWarriorType))}
                  onResizeGroup={resizeHenchmanGroup}
                  onSetMutations={setMutations}
                  freebuild={!roster.campaignId}
                  member={selectedMember}
                  warriorTypes={warriorTypes}
                  selectedWarriorType={selectedWarriorType}
                  equipmentData={memberEquipment}
                  equipmentLoading={equipmentLoading}
                  equipmentError={equipmentError}
                  skillsData={memberSkills}
                  skillsLoading={skillsLoading}
                  skillsError={skillsError}
                  advancementsData={memberAdvancements}
                  advancementsLoading={advancementsLoading}
                  advancementsError={advancementsError}
                  spellsData={memberSpells}
                  spellsLoading={spellsLoading}
                  spellsError={spellsError}
                  ladsGotTalentOptions={ladsGotTalentOptions}
                  ladsGotTalentLoading={ladsGotTalentLoading}
                  ladsGotTalentError={ladsGotTalentError}
                  rosterTreasury={roster.treasury}
                  capacity={capacity}
                  typesLoading={typesLoading}
                  onClose={() => setActiveMemberId(null)}
                  onUpdateMember={updateMember}
                  onSelectWarriorType={selectWarriorType}
                  onPurchaseEquipment={purchaseEquipment}
                  onSellEquipment={sellEquipment}
                  onLearnSkill={learnSkill}
                  onForgetSkill={forgetSkill}
                  onRecordAdvance={(input) => recordMemberAdvance(selectedMember.id, input)}
                  onPurchaseAdvance={(input) => purchaseAdvance(selectedMember.id, input)}
                  onRemoveAdvance={(advanceId) => removeMemberAdvance(selectedMember.id, advanceId)}
                  onLearnSpell={(input) => learnSpell(selectedMember.id, input)}
                  onRollSpells={(disciplineId, count) => rollSpells(selectedMember.id, disciplineId, count)}
                  onForgetSpell={(warriorSpellId) => forgetSpell(selectedMember.id, warriorSpellId)}
                  onReduceSpellDifficulty={(warriorSpellId, advanceId) => reduceSpellDifficulty(selectedMember.id, warriorSpellId, advanceId)}
                  onSetSpellDiscipline={(disciplineId) => setSpellDiscipline(selectedMember.id, disciplineId)}
                  onRecordMagicTome={(unitCostPaid) => recordMagicTome(selectedMember.id, unitCostPaid)}
                  onConsumeMagicTome={() => consumeMagicTome(selectedMember.id)}
                  onSetLadsGotTalentChoices={setLadsGotTalentChoices}
                  onPromote={promoteMember}
                  isPromotedHenchman={isPromotedHenchman}
                  />
                  ) : null}
                />
              </div>
            )}
          </section>
          </fieldset>
          <footer className="page-footer"><span>MORDHEIM ROSTER LEDGER</span><span>KEEP YOUR WITS. KEEP YOUR RECORDS.</span></footer>
        </div>
        <NewRosterDialog
          open={newRosterDialogOpen}
          submitting={creatingRoster}
          warbands={warbands}
          campaign={activeCampaign}
          onCancel={() => setNewRosterDialogOpen(false)}
          onSubmit={createRoster}
        />
        {mutationHireType && !readOnly && <MutationHireDialog
          key={`${roster.id}-${mutationHireType.id}`}
          type={mutationHireType}
          treasury={roster.treasury}
          freebuild={!roster.campaignId}
          error={error}
          onCancel={() => setMutationHireTypeId(null)}
          onHire={async (mutationIds) => {
            const hired = await addMember("Hero", mutationHireType.id, 1, undefined, mutationIds);
            if (hired) setMutationHireTypeId(null);
            return hired;
          }}
        />}
      </main>
    </div>
  );
}
