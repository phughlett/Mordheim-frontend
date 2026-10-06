import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { statLabels, type EquipmentSpecialRule, type EquipmentStats, type InventoryEntry, type Member, type Roster, type TradingData, type WarriorEquipmentData, type WarriorSkillsData, type WarriorSpellsData } from "../types";
import type { WarriorAdvancementsData } from "../types";
import { PrintExperienceTrack } from "./experience/print-experience-track";
import { fieldingSummary } from "../fielding-summary";
import { gradeLabel } from "./source-rules";

type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;

interface MemberSheet {
  member: Member;
  equipment: WarriorEquipmentData | null;
  skills: WarriorSkillsData | null;
  spells: WarriorSpellsData | null;
  advancements: WarriorAdvancementsData;
}

interface PrintData {
  roster: Roster;
  sheets: MemberSheet[];
  stash: InventoryEntry[];
  printedAt: string;
}

const roleOrder: Record<Member["role"], number> = { Hero: 0, "Hired Sword": 1, Henchman: 2 };

async function loadMemberSheet(member: Member, request: Request): Promise<MemberSheet> {
  const [equipment, skills, spells, advancements] = await Promise.all([
    request<WarriorEquipmentData>(`/members/${member.id}/equipment`),
    request<WarriorSkillsData>(`/members/${member.id}/skills`),
    member.role === "Henchman"
      ? Promise.resolve(null)
      : request<WarriorSpellsData>(`/members/${member.id}/spells`).catch(() => null),
    request<WarriorAdvancementsData>(`/members/${member.id}/advances`),
  ]);
  return { member, equipment, skills, spells, advancements };
}

export function RosterPrintExport({ roster, request, onError }: { roster: Roster; request: Request; onError: (message: string) => void }) {
  const [preparing, setPreparing] = useState(false);
  const [printData, setPrintData] = useState<PrintData | null>(null);

  useEffect(() => {
    if (!printData) return;
    const previousTitle = document.title;
    document.title = `${printData.roster.name || "Warband"} - Mordheim roster`;
    const finish = () => {
      document.title = previousTitle;
      setPrintData(null);
    };
    window.addEventListener("afterprint", finish, { once: true });
    const timer = window.setTimeout(() => window.print(), 50);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", finish);
      document.title = previousTitle;
    };
  }, [printData]);

  async function exportRoster() {
    setPreparing(true);
    try {
      const [sheets, trading] = await Promise.all([
        Promise.all(roster.members.map((member) => loadMemberSheet(member, request))),
        request<TradingData>(`/rosters/${roster.id}/trading`),
      ]);
      sheets.sort((first, second) => roleOrder[first.member.role] - roleOrder[second.member.role] || first.member.position - second.member.position);
      setPrintData({ roster, sheets, stash: trading.stash, printedAt: new Date().toLocaleDateString() });
    } catch (requestError) {
      onError(requestError instanceof Error ? `Could not prepare PDF export: ${requestError.message}` : "Could not prepare PDF export.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <>
      <button type="button" className="outline-button" disabled={preparing || !roster.id} onClick={() => void exportRoster()} title="Opens your browser's print dialog. Choose “Save as PDF” to download a PDF.">
        {preparing ? "Preparing PDF..." : "Export PDF / Print"}
      </button>
      {printData && createPortal(<RosterPrintSheet data={printData} />, document.body)}
    </>
  );
}

function formatModifier(value: string) {
  return value || "As user";
}

function weaponSummary(stats: EquipmentStats | null) {
  if (!stats) return "";
  const parts: string[] = [];
  if (stats.weapon) {
    if (stats.weapon.rangeText) parts.push(/^\d/.test(stats.weapon.rangeText) ? `Range ${stats.weapon.rangeText}` : stats.weapon.rangeText);
    parts.push(`S ${formatModifier(stats.weapon.strengthModifier)}`);
  }
  if (stats.armour) {
    if (stats.armour.saveText) parts.push(`Save ${stats.armour.saveText}`);
    if (stats.armour.movementPenalty) parts.push(stats.armour.movementPenalty);
  }
  const rules = [...(stats.weapon?.specialRules ?? []), ...(stats.armour?.specialRules ?? [])].map((rule) => rule.name);
  if (stats.materialModifier) rules.push(stats.materialModifier.name);
  if (stats.poison) rules.push(stats.poison.name);
  if (rules.length) parts.push(rules.join(", "));
  return parts.join(" · ");
}

export function equipmentStacks(sheet: MemberSheet) {
  const stacks = new Map<string, { key: string; name: string; quantity: number; models: Set<number>; stats: EquipmentStats | null }>();
  for (const item of sheet.equipment?.inventory ?? []) {
    const key = item.shopItemId ? `shop:${item.shopItemId}` : `legacy:${item.equipmentOptionId}`;
    const stack = stacks.get(key) ?? { key, name: item.name, quantity: 0, models: new Set<number>(), stats: item.stats };
    stack.quantity += item.quantity;
    stack.models.add(item.modelIndex + 1);
    stacks.set(key, stack);
  }
  return [...stacks.values()];
}

function collectReferences(sheets: MemberSheet[]) {
  const equipment = new Map<string, { name: string; stats: EquipmentStats }>();
  const specialRules = new Map<string, EquipmentSpecialRule>();
  const skills = new Map<string, { name: string; category: string; description: string }>();
  for (const sheet of sheets) {
    for (const item of sheet.equipment?.inventory ?? []) {
      if (!item.stats) continue;
      equipment.set(item.name, { name: item.name, stats: item.stats });
      for (const rule of [...(item.stats.weapon?.specialRules ?? []), ...(item.stats.armour?.specialRules ?? [])]) specialRules.set(rule.name, rule);
      if (item.stats.materialModifier) specialRules.set(item.stats.materialModifier.name, { name: item.stats.materialModifier.name, description: item.stats.materialModifier.effectText });
      if (item.stats.poison) specialRules.set(item.stats.poison.name, { name: item.stats.poison.name, description: item.stats.poison.effectText });
    }
    for (const skill of sheet.skills?.learnedSkills ?? []) {
      if (skill.description) skills.set(skill.name, { name: skill.name, category: skill.category, description: skill.description });
    }
  }
  const byName = <T extends { name: string }>(values: Iterable<T>) => [...values].sort((first, second) => first.name.localeCompare(second.name));
  return { equipment: byName(equipment.values()), specialRules: byName(specialRules.values()), skills: byName(skills.values()) };
}

export function RosterPrintSheet({ data }: { data: PrintData }) {
  const { roster, sheets } = data;
  const stash = data.stash ?? [];
  const references = collectReferences(sheets);
  const capacity = roster.capacity;
  const { totalFielded, routThreshold } = fieldingSummary(sheets.map((sheet) => sheet.member));
  return (
    <div className="print-sheet">
      <header className="print-header">
        <div>
          <div className="print-eyebrow">Mordheim warband roster</div>
          <h1>{roster.name || "Unnamed warband"}</h1>
          <div className="print-subtitle">{roster.warband || "No warband selected"}{roster.player ? ` · ${roster.player}` : ""}</div>
        </div>
        <dl className="print-totals">
          <div><dt>Campaign</dt><dd>{roster.campaignName ?? "Freebuild"}</dd></div>
          {capacity?.grade && <div><dt>Grade</dt><dd>{gradeLabel(capacity.grade)}</dd></div>}
          <div><dt>Gold Crowns</dt><dd>{roster.treasury} GC</dd></div>
          <div><dt>Wyrdstone</dt><dd>{roster.wyrdstone}</dd></div>
          <div><dt>Rating</dt><dd>{roster.rating}</dd></div>
          <div><dt>Total Fielded</dt><dd>{totalFielded} warriors</dd></div>
          <div><dt>Rout Test At</dt><dd>{totalFielded === 0 ? "—" : routThreshold} out of action (25%)</dd></div>
          {capacity && <div><dt>Models</dt><dd>{capacity.currentMembers}/{capacity.maxMembers}</dd></div>}
          <div><dt>Battles</dt><dd>{roster.battlesFought ?? roster.campaign?.battlesFought ?? 0}</dd></div>
          <div><dt>Printed</dt><dd>{data.printedAt}</dd></div>
        </dl>
      </header>

      {sheets.length === 0 && <p>This warband has no members.</p>}
      {(capacity?.specialRules?.length ?? 0) > 0 && <section className="print-glossary">
        <h2>Warband rules</h2>
        <p>Reference summaries; resolve effects manually.</p>
        {capacity?.sourceUrl && <p>Source: <a href={capacity.sourceUrl}>{capacity.sourceUrl}</a></p>}
        {capacity?.specialRules?.map((rule) => <p key={rule.name}><strong>{rule.name}:</strong> {rule.summary}</p>)}
      </section>}

      {stash.length > 0 && <section className="print-stash">
        <h2>Warband stash</h2>
        <ul>{stash.map((entry) => <li key={entry.id}>
          <strong>{entry.name} ×{entry.quantity}</strong> · {entry.category} · {entry.unitCostPaid} GC each
          {entry.description && <small> — {entry.description}</small>}
        </li>)}</ul>
      </section>}

      {sheets.map((sheet) => <MemberCard key={sheet.member.id} sheet={sheet} />)}

      {(references.equipment.length > 0 || references.specialRules.length > 0 || references.skills.length > 0) && (
        <section className="print-reference">
          <h2>Quick reference</h2>
          {references.equipment.length > 0 && (
            <table className="print-table">
              <thead><tr><th>Equipment</th><th>Range</th><th>Strength</th><th>Save</th><th>Special rules</th></tr></thead>
              <tbody>
                {references.equipment.map(({ name, stats }) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{stats.weapon?.rangeText || "-"}</td>
                    <td>{stats.weapon ? formatModifier(stats.weapon.strengthModifier) : "-"}</td>
                    <td>{stats.armour ? [stats.armour.saveText, stats.armour.movementPenalty].filter(Boolean).join("; ") || "-" : "-"}</td>
                    <td>{[...(stats.weapon?.specialRules ?? []), ...(stats.armour?.specialRules ?? [])].map((rule) => rule.name).concat(stats.materialModifier ? [stats.materialModifier.name] : [], stats.poison ? [stats.poison.name] : []).join(", ") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {references.specialRules.length > 0 && (
            <div className="print-glossary">
              <h3>Equipment rules</h3>
              {references.specialRules.map((rule) => <p key={rule.name}><strong>{rule.name}:</strong> {rule.description}</p>)}
            </div>
          )}
          {references.skills.length > 0 && (
            <div className="print-glossary">
              <h3>Skills</h3>
              {references.skills.map((skill) => <p key={skill.name}><strong>{skill.name}</strong> <em>({skill.category})</em>: {skill.description}</p>)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function MemberCard({ sheet }: { sheet: MemberSheet }) {
  const { member, skills, spells } = sheet;
  const stacks = equipmentStacks(sheet);
  const mutations = sheet.equipment?.mutations.entries ?? [];
  const learnedSkills = skills?.learnedSkills ?? [];
  const knownSpells = spells?.knownSpells ?? [];
  const isGroup = member.role === "Henchman";
  return (
    <article className="print-member">
      <div className="print-member-heading">
        <h2>{member.name || member.type}{isGroup && member.groupSize > 1 ? ` (×${member.groupSize})` : ""}</h2>
        <span>{member.name && member.name !== member.type ? `${member.type} · ` : ""}{member.role} · {member.experience || 0} XP</span>
      </div>
      <table className="print-stats">
        <thead><tr>{statLabels.map((label) => <th key={label}>{label}</th>)}</tr></thead>
        <tbody><tr>{statLabels.map((label) => <td key={label}>{member.stats[label] || "-"}</td>)}</tr></tbody>
      </table>
      <PrintExperienceTrack role={member.role} experience={member.experience} canGainExperience={sheet.advancements.canGainExperience} />
      {member.specialRules?.map((rule) => <p key={rule.name}><strong>{rule.name}:</strong> {rule.summary}</p>)}
      <div className="print-member-body">
        <div>
          <h3>Equipment</h3>
          {stacks.length ? (
            <ul>
              {stacks.map((stack) => {
                const summary = weaponSummary(stack.stats);
                const models = isGroup && stack.models.size < member.groupSize ? ` (model ${[...stack.models].sort((a, b) => a - b).join(", ")})` : "";
                return <li key={stack.key}>{stack.name}{stack.quantity > 1 ? ` ×${stack.quantity}` : ""}{models}{summary && <small> — {summary}</small>}</li>;
              })}
            </ul>
          ) : member.equipment ? <p>{member.equipment}</p> : <p className="print-empty">None</p>}
          {mutations.length > 0 && (
            <>
              <h3>Mutations</h3>
              <ul>{mutations.map((mutation) => <li key={mutation.mutationId}><strong>{mutation.name}</strong>{mutation.effectText && <small> — {mutation.effectText}</small>}</li>)}</ul>
            </>
          )}
        </div>
        <div>
          <h3>Skills</h3>
          {learnedSkills.length ? (
            <ul>{learnedSkills.map((skill) => <li key={skill.warriorSkillId}>{skill.name} <small>({skill.category}{skill.specialListName ? ` · ${skill.specialListName}` : ""})</small></li>)}</ul>
          ) : member.skills ? <p>{member.skills}</p> : <p className="print-empty">None</p>}
          {knownSpells.length > 0 && (
            <>
              <h3>Spells</h3>
              <ul>
                {knownSpells.map((spell) => (
                  <li key={spell.warriorSpellId}>
                    <strong>{spell.name}</strong> <small>({spell.disciplineName}{spell.effectiveCastingDifficulty !== null ? ` · Difficulty ${spell.effectiveCastingDifficulty}` : spell.difficultyNote ? ` · ${spell.difficultyNote}` : ""})</small>
                    {spell.effectSummary && <div className="print-spell-effect">{spell.effectSummary}</div>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      {member.notes && <p className="print-notes"><strong>Notes:</strong> {member.notes}</p>}
    </article>
  );
}
