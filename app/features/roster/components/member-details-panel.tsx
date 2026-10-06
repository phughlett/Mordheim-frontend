import { useState } from "react";
import type { LadsGotTalentOptions, LearnSpellInput, Member, RecordAdvanceInput, RosterCapacity, SkillCategoryChoice, SpellRollResponse, WarriorAdvancementsData, WarriorEquipmentData, WarriorSkillsData, WarriorSpellsData, WarriorTypeOption } from "../types";
import { ExperienceTracker } from "./experience/experience-tracker";
import { AdvancementPanel } from "./advancement-panel";
import { EquipmentInventoryPanel } from "./equipment-inventory-panel";
import { SkillsPanel } from "./skills-panel";
import { SpellPanel } from "./spell-panel";
import { LadsGotTalentPanel } from "./lads-got-talent-panel";
import type { InventoryEntry, PurchaseAdvanceInput } from "../types";
import { LeaderBadge } from "./leader-badge";

interface MemberDetailsPanelProps {
  member: Member;
  freebuild?: boolean;
  equipmentPurchaseLocked?: boolean;
  stashReturns: InventoryEntry[];
  canReturnToStash: boolean;
  onReturnToStash: (memberId: string, inventoryId: string, quantity: number, modelIndex: number) => Promise<void>;
  allowedActions?: string[];
  canAddGroupModel: boolean;
  onResizeGroup: (memberId: string, groupSize: number) => Promise<void>;
  warriorTypes: WarriorTypeOption[];
  selectedWarriorType: WarriorTypeOption | undefined;
  equipmentData: WarriorEquipmentData | null;
  equipmentLoading: boolean;
  equipmentError: string;
  skillsData: WarriorSkillsData | null;
  skillsLoading: boolean;
  skillsError: string;
  advancementsData: WarriorAdvancementsData | null;
  advancementsLoading: boolean;
  advancementsError: string;
  spellsData: WarriorSpellsData | null;
  spellsLoading: boolean;
  spellsError: string;
  ladsGotTalentOptions: LadsGotTalentOptions | null;
  ladsGotTalentLoading: boolean;
  ladsGotTalentError: string;
  rosterTreasury: string;
  capacity: RosterCapacity | null;
  typesLoading: boolean;
  onClose: () => void;
  onUpdateMember: (memberId: string, changes: Partial<Member>) => void;
  onSelectWarriorType: (memberId: string, typeId: string) => void;
  onPurchaseEquipment: (memberId: string, equipmentOptionId: string, modelIndex: number, quantity: number) => Promise<void>;
  onSellEquipment: (memberId: string, inventoryItemIds: string[]) => Promise<void>;
  onSetMutations: (memberId: string, mutationIds: string[]) => Promise<boolean>;
  onLearnSkill: (memberId: string, skillId: string, advanceId: string) => Promise<void>;
  onForgetSkill: (memberId: string, warriorSkillId: string) => Promise<void>;
  onRecordAdvance: (input: RecordAdvanceInput) => Promise<boolean>;
  onPurchaseAdvance: (input: PurchaseAdvanceInput) => Promise<boolean>;
  onRemoveAdvance: (advanceId: string) => Promise<boolean>;
  onLearnSpell: (input: LearnSpellInput) => Promise<boolean>;
  onRollSpells: (disciplineId: string, count: 1 | 2) => Promise<SpellRollResponse | null>;
  onForgetSpell: (warriorSpellId: string) => Promise<boolean>;
  onReduceSpellDifficulty: (warriorSpellId: string, advanceId: string) => Promise<boolean>;
  onSetSpellDiscipline: (disciplineId: string) => Promise<boolean>;
  onRecordMagicTome: (unitCostPaid: number | null) => Promise<boolean>;
  onConsumeMagicTome: () => Promise<boolean>;
  onSetLadsGotTalentChoices: (memberId: string, choices: SkillCategoryChoice[]) => Promise<void>;
  onPromote: (memberId: string) => void;
  isPromotedHenchman: (member: Member) => boolean;
}

export function MemberDetailsPanel({
  member,
  freebuild = false,
  equipmentPurchaseLocked = false,
  stashReturns,
  canReturnToStash,
  onReturnToStash,
  allowedActions,
  canAddGroupModel,
  onResizeGroup,
  warriorTypes,
  selectedWarriorType,
  equipmentData,
  equipmentLoading,
  equipmentError,
  skillsData,
  skillsLoading,
  skillsError,
  advancementsData,
  advancementsLoading,
  advancementsError,
  spellsData,
  spellsLoading,
  spellsError,
  ladsGotTalentOptions,
  ladsGotTalentLoading,
  ladsGotTalentError,
  rosterTreasury,
  capacity,
  typesLoading,
  onClose,
  onUpdateMember,
  onSelectWarriorType,
  onPurchaseEquipment,
  onSellEquipment,
  onSetMutations,
  onLearnSkill,
  onForgetSkill,
  onRecordAdvance,
  onPurchaseAdvance,
  onRemoveAdvance,
  onLearnSpell,
  onRollSpells,
  onForgetSpell,
  onReduceSpellDifficulty,
  onSetSpellDiscipline,
  onRecordMagicTome,
  onConsumeMagicTome,
  onSetLadsGotTalentChoices,
  onPromote,
  isPromotedHenchman,
}: MemberDetailsPanelProps) {
  const [resizingGroup, setResizingGroup] = useState(false);
  const hireCost = selectedWarriorType?.hireCost;
  async function resizeGroup(groupSize: number) {
    setResizingGroup(true);
    try {
      await onResizeGroup(member.id, groupSize);
    } finally {
      setResizingGroup(false);
    }
  }
  const memberTypes = warriorTypes.filter((type) => type.category === member.role);

  const isFixedType = isPromotedHenchman(member) || member.role === "Hero" || Boolean(member.warriorTypeId);

  const hasSpells = Boolean(spellsData?.canShowSpellSection || spellsError);

  return (
    <aside className="details-panel">
      <div className="details-heading">
        <h3>Details {member.role === "Hero" && capacity?.leader?.id === member.id && <LeaderBadge />}</h3>
        <button className="close-details" onClick={onClose} aria-label="Close details" type="button">×</button>
      </div>
      <div className="details-identity">
        <div className="identity-name">
        <label className="detail-field">
          <span>NAME</span>
          <input value={member.name} onChange={(event) => onUpdateMember(member.id, { name: event.target.value })} />
        </label>
        {member.role === "Henchman" && (
          <div className="detail-field">
            <span>GROUP SIZE</span>
            <strong>{member.groupSize} / 5 models</strong>
            <div className="section-actions">
              <button
                type="button"
                className="outline-button"
                disabled={resizingGroup || member.groupSize >= 5 || !canAddGroupModel || hireCost == null || Number(rosterTreasury) < hireCost || (allowedActions !== undefined && !allowedActions.includes("hire"))}
                onClick={() => void resizeGroup(member.groupSize + 1)}
              >
                Hire one{hireCost != null ? ` · ${hireCost} GC` : ""}
              </button>
              <button
                type="button"
                className="outline-button"
                disabled={resizingGroup || member.groupSize <= 1 || (allowedActions !== undefined && !allowedActions.includes("remove"))}
                onClick={() => void resizeGroup(member.groupSize - 1)}
              >
                Remove one · refund {hireCost ?? 0} GC
              </button>
            </div>
            <small>Adding models costs their hire fee. Removing models refunds that fee; their individual equipment is removed. Use Remove in the roster to remove the entire group.</small>
          </div>
        )}
        </div>
        <div className="details-info">
          <span className="info-label">TYPE</span>
          <div><strong>{member.role}</strong>{" · "}{isFixedType ? <>{member.type || "Hero type unassigned"}{isPromotedHenchman(member) ? " (Promoted Henchman)" : ""}</> : "Type not yet selected"}</div>
        </div>
        <div className="details-info">
          <span className="info-label">LIMIT</span>
          {member.warriorTypeId && selectedWarriorType?.ruleText && <div>{selectedWarriorType.ruleText}</div>}
          {selectedWarriorType?.conditionText && <small>{selectedWarriorType.conditionText}</small>}
        </div>
      </div>
      <AdvancementPanel
        onPurchaseAdvance={onPurchaseAdvance}
        treasury={rosterTreasury}
        leading={
      <ExperienceTracker
        freebuild={freebuild}
        experience={member.experience}
        role={member.role}
        groupSize={member.groupSize}
        minimumExperience={Math.max(member.minimumExperience ?? 0, advancementsData?.lockedExperience ?? 0, advancementsData?.minimumExperience ?? selectedWarriorType?.startingExperience ?? 0)}
        canGainExperience={selectedWarriorType?.canGainExperience}
        experienceRule={selectedWarriorType?.experienceRule}
        onChange={(experience) => onUpdateMember(member.id, { experience })}
      />
        }
        member={member}
        data={advancementsData}
        loading={advancementsLoading}
        error={advancementsError}
        onRecordAdvance={onRecordAdvance}
        onRemoveAdvance={onRemoveAdvance}
      />
      {member.role === "Henchman" && <>
        <p className="group-shared-note">All models in this group share stats, experience, and advances.</p>
      </>}
      {!isFixedType && <label className="detail-field">
        <span>WARRIOR TYPE</span>
        <select value={member.warriorTypeId ?? ""} onChange={(event) => onSelectWarriorType(member.id, event.target.value)}>
          <option value="">{typesLoading ? "Loading types..." : memberTypes.length ? "Select type" : "No verified types available"}</option>
          {memberTypes.map((type) => (
            <option key={type.id} value={type.id}>{type.name}{type.availability === "conditional" ? " (Conditional)" : ""}</option>
          ))}
        </select>
      </label>}
      {member.role === "Henchman" && member.warriorTypeId && <div className="promotion-panel">
        <div className="promotion-label">LAD'S GOT TALENT</div>
        {selectedWarriorType?.promotionEligibility === "eligible"
          ? advancementsData?.history.some((advance) => advance.result === "lads_got_talent" && !advance.consumedAt)
            ? capacity && capacity.currentHeroes < capacity.maxHeroes
            ? <><p>Eligible after the Henchman group earns the promotion advance.</p><button className="promotion-button" onClick={() => onPromote(member.id)} type="button">Promote to hero</button></>
            : <p>The warband is at its {capacity?.maxHeroes ?? 6}-Hero limit. Re-roll this advance instead of promoting.</p>
            : <p>Resolve a Henchman advance and record Lad's Got Talent before promoting.</p>
          : <p>{selectedWarriorType?.promotionEligibility === "ineligible" ? "This Henchman type cannot become a Hero." : "Promotion eligibility for this type has not been verified."}</p>}
        {selectedWarriorType?.promotionRule && <small>{selectedWarriorType.promotionRule}</small>}
      </div>}
      <div className={`details-columns${hasSpells ? "" : " two-columns"}`}>
      <EquipmentInventoryPanel
        key={member.id}
        member={member}
        treasury={rosterTreasury}
        data={equipmentData}
        loading={equipmentLoading}
        error={equipmentError}
        purchaseLocked={equipmentPurchaseLocked}
        stashReturns={stashReturns}
        canReturnToStash={canReturnToStash}
        onReturnToStash={(inventoryId, quantity, modelIndex) => onReturnToStash(member.id, inventoryId, quantity, modelIndex)}
        onPurchase={(optionId, modelIndex, quantity) => onPurchaseEquipment(member.id, optionId, modelIndex, quantity)}
        onSell={(inventoryItemIds) => onSellEquipment(member.id, inventoryItemIds)}
        onSetMutations={(mutationIds) => onSetMutations(member.id, mutationIds)}
      />
      <SkillsPanel
        key={`skills-${member.id}`}
        member={member}
        data={skillsData}
        loading={skillsLoading}
        error={skillsError}
        onLearn={(skillId, advanceId) => onLearnSkill(member.id, skillId, advanceId)}
        onForget={(warriorSkillId) => onForgetSkill(member.id, warriorSkillId)}
        listPicker={isPromotedHenchman(member) ? (
          <LadsGotTalentPanel
            options={ladsGotTalentOptions}
            loading={ladsGotTalentLoading}
            error={ladsGotTalentError}
            onSave={(choices) => onSetLadsGotTalentChoices(member.id, choices)}
          />
        ) : undefined}
      />
      {(spellsData?.canShowSpellSection || spellsError) && (
        <SpellPanel
          key={`spells-${member.id}`}
          allowTomeRecording={freebuild && !equipmentPurchaseLocked}
          data={spellsData}
          pendingAdvanceId={advancementsData?.pendingSkillAdvances[0]?.id ?? null}
          loading={spellsLoading}
          error={spellsError}
          onLearn={onLearnSpell}
          onRoll={onRollSpells}
          onForget={onForgetSpell}
          onReduceDifficulty={onReduceSpellDifficulty}
          onSetDiscipline={onSetSpellDiscipline}
          onRecordTome={onRecordMagicTome}
          onConsumeTome={onConsumeMagicTome}
        />
      )}
      </div>
      <label className="detail-field">
        <span>NOTES</span>
        <textarea rows={2} placeholder="Injuries and campaign notes" value={member.notes} onChange={(event) => onUpdateMember(member.id, { notes: event.target.value })} />
      </label>
    </aside>
  );
}
