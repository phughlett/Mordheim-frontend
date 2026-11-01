import { useState } from "react";
import { statLabels, type GraveyardEntry } from "../types";
import { injuryEffectDescription, injuryEffectLabel } from "../injury-effects";
import { InjuryResultView } from "./injury-panel";

const reasons: Record<string, string> = {
  death: "Died",
  retirement: "Retired",
  captivity: "Removed in captivity",
  dismissed: "Dismissed",
  removed: "Removed",
};

export function Graveyard({ entries = [], printable = false, onRestore, readOnly = false }: {
  entries?: GraveyardEntry[]; printable?: boolean; onRestore?: (entryId: string) => Promise<void>; readOnly?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function restore(entryId: string) {
    if (!onRestore || busy) return;
    setBusy(entryId); setError("");
    try { await onRestore(entryId); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not restore this Hero."); }
    finally { setBusy(null); }
  }
  return <section className={printable ? "print-graveyard" : "advancement-panel graveyard"} aria-label="Graveyard">
    <h2>Graveyard · {entries.length}</h2>
    <p>Remembering all removed Heroes, including deaths, retirements and dismissals. These records do not count toward the active warband.</p>
    {error && <p role="alert" className="skills-error">{error}</p>}
    {entries.length === 0 && <p>No Heroes have been removed.</p>}
    {entries.map((entry) => <details key={entry.id} className="graveyard-entry" open={printable || undefined}>
      <summary>
        <strong>{entry.name || "Unnamed Hero"}</strong>
        {` · ${entry.snapshot.member.typeName ?? entry.snapshot.member.type ?? "Hero"} · ${reasons[entry.reason] ?? entry.reason} · Battle ${entry.battle_number}`}
      </summary>
      <div className="graveyard-snapshot">
        {!printable && !readOnly && onRestore && entry.reason !== "death" && <>
          <button className="outline-button" type="button" disabled={!entry.canRestore || busy !== null}
            onClick={() => void restore(entry.id)}>{busy === entry.id ? "Restoring..." : "Undo removal"}</button>
          {entry.restoreBlock && <p>{entry.restoreBlock}</p>}
        </>}
        {!entry.snapshot_complete && <p>Legacy record: this Hero was removed before full snapshots were available. Only the surviving name and injury record are known.</p>}
        {entry.snapshot_complete && <>
          <p><strong>XP:</strong> {entry.snapshot.member.experience} · Snapshot preserved before removal; equipment shown here is historical, not available to the warband.</p>
          <table className="graveyard-stats" aria-label={`${entry.name} archived stats`}>
            <thead><tr>{statLabels.map((stat) => <th key={stat}>{stat}</th>)}</tr></thead>
            <tbody><tr>{statLabels.map((stat) => <td key={stat}>{entry.snapshot.member.stats?.[stat] ?? "-"}</td>)}</tr></tbody>
          </table>
          <h3>Equipment</h3>
          {entry.snapshot.equipment.length === 0 && <p>No inventory equipment recorded.</p>}
          <ul>{entry.snapshot.equipment.map((item) => <li key={item.id}>
            <strong>{item.name} ×{item.quantity}</strong> · {item.unit_cost_paid} GC each
            {item.shop_definition?.description && <p>{item.shop_definition.description}</p>}
          </li>)}</ul>
          {entry.snapshot.member.equipment && <p>Equipment notes: {entry.snapshot.member.equipment}</p>}
          <h3>Skills</h3>
          {entry.snapshot.skills.length === 0 && <p>No learned skills recorded.</p>}
          <ul>{entry.snapshot.skills.map((skill) => <li key={skill.id}><strong>{skill.name} · {skill.category}</strong>
            <p>{skill.description}</p><small>{skill.source_reference}</small>
            {skill.notes && <p>{skill.notes}</p>}
          </li>)}</ul>
          {entry.snapshot.member.skills && <p>Skill notes: {entry.snapshot.member.skills}</p>}
          {entry.snapshot.member.specialRules?.map((rule, index) => <p key={index}><strong>{rule.name}:</strong> {rule.summary}</p>)}
          <h3>Spells</h3>
          {entry.snapshot.spells.length === 0 && <p>No spells recorded.</p>}
          <ul>{entry.snapshot.spells.map((spell) => <li key={spell.id}><strong>{spell.name}</strong>
            {spell.discipline && ` · ${spell.discipline}`}
            {spell.casting_difficulty !== null && ` · Difficulty ${spell.casting_difficulty}`}
            {spell.difficulty_note && ` · ${spell.difficulty_note}`}
            <p>{spell.effect_summary}</p>{spell.notes && <p>{spell.notes}</p>}
          </li>)}</ul>
          {entry.snapshot.member.notes && <p><strong>Notes:</strong> {entry.snapshot.member.notes}</p>}
          {entry.snapshot.member.injury_conditions?.map((effect, index) => <p key={index}>
            <strong>{injuryEffectLabel(effect)}:</strong> {injuryEffectDescription(effect)}
          </p>)}
        </>}
        {entry.cause && <><h3>Removal cause</h3><InjuryResultView result={entry.cause} /></>}
        {entry.snapshot.injuries.length > 0 && <details open={printable || undefined}>
          <summary>Earlier injury records</summary>
          {entry.snapshot.injuries.map((injury) => <InjuryResultView key={injury.id} result={injury.result} metadata={`Battle ${injury.battle_number}`} />)}
        </details>}
      </div>
    </details>)}
  </section>;
}
