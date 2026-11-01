import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { InjuryEffect, InjuryResult, Member } from "../types";
import { injuryEffectDescription, injuryEffectLabel } from "../injury-effects";

export interface InjurySelection {
  resultId?: string;
  secondaryRoll?: number;
  injuries?: InjurySelection[];
  eye?: string;
  hatredTarget?: string;
  pitOutcome?: string;
  pitInjury?: InjurySelection;
  captureOutcome?: string;
}

interface InjuryDefinition {
  id: string;
  name: string;
  rolls: number[];
  ruleText: string;
  secondaryRoll?: { type: string; results?: { rolls: number[]; ruleText: string }[] };
}
interface InjuryTable {
  name: string;
  ruleText?: string;
  applicationNote?: string;
  source: { pages: number[] };
  results: InjuryDefinition[];
}
interface InjuryData {
  hatredOpponents?: HatredOpponent[] | null;
  table: InjuryTable;
  heroTable: InjuryTable;
  canAdd: boolean;
  canCheckOldWound: boolean;
  availability: { available: boolean; needsOldWoundRoll: boolean };
  conditions: InjuryEffect[];
  history: { id: string; pending: boolean; battle_number: number; model_index: number; mode: string; result: InjuryResult }[];
}
interface Preview { id: string; result: InjuryResult; modelIndex: number; battleNumber: number }

interface HatredOpponent {
  name: string;
  warband: string;
  leader: { id: string; name: string } | null;
  heroes: { id: string; name: string }[];
}

export function HatredTargetField({ value, roll, opponents, onChange }: {
  value: string; roll?: number | null; opponents?: HatredOpponent[] | null; onChange: (value: string) => void;
}) {
  const options = [...new Set((opponents ?? []).flatMap((opponent) => {
    if (roll === 6) return [`All ${opponent.warband} warbands`];
    if (roll === 5) return [opponent.name];
    if (roll === 4) return opponent.leader ? [`${opponent.leader.name} (leader of ${opponent.name})`] : [];
    return [
      ...opponent.heroes.map((hero) => `${hero.name} (${opponent.name})`),
      ...(opponent.leader ? [`${opponent.leader.name} (leader of ${opponent.name})`] : []),
    ];
  }))];
  const [custom, setCustom] = useState(false);
  return <div className="skills-field">
    {options.length > 0 && <label><span>BITTER ENMITY TARGET</span>
      <select aria-label="Bitter Enmity target" value={custom || (value && !options.includes(value)) ? "custom" : value}
        onChange={(event) => {
          setCustom(event.target.value === "custom");
          onChange(event.target.value === "custom" ? "" : event.target.value);
        }}>
        <option value="">Choose target from the opposing warband</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
        <option value="custom">Other target / type details</option>
      </select>
    </label>}
    {(options.length === 0 || custom || (value && !options.includes(value))) && <label><span>BITTER ENMITY TARGET</span>
      <input aria-label="Bitter Enmity target details" maxLength={300} placeholder="Who does this warrior hate?"
        value={value} onChange={(event) => onChange(event.target.value)} />
    </label>}
    {opponents && opponents.length === 0 && <small>No recorded opponent is available; enter the target from your tabletop battle.</small>}
    {roll && roll <= 3 && <small>If a Henchman caused the injury, record the enemy leader instead.</small>}
  </div>;
}

export function hatredTargets(result: InjuryResult): string[] {
  return [...(result.id === "bitter-enmity" ? [result.hatredTarget ?? ""] : []), ...result.children.flatMap(hatredTargets)];
}

export function InjuryChoice({ table, heroTable, value, onChange, excluded = [], depth = 0, hatredOpponents }: {
  table: InjuryTable; heroTable: InjuryTable; value: InjurySelection;
  onChange: (value: InjurySelection) => void; excluded?: string[]; depth?: number;
  hatredOpponents?: HatredOpponent[] | null;
}) {
  const definition = table.results.find((result) => result.id === value.resultId);
  const set = (changes: Partial<InjurySelection>) => onChange({ ...value, ...changes });
  return <div className="advancement-actions">
    <label className="skills-field"><span>INJURY RESULT</span>
      <select aria-label={`Injury result level ${depth}`} value={value.resultId ?? ""} onChange={(event) => onChange({ resultId: event.target.value })}>
        <option value="">Choose what happened</option>
        {table.results.filter((result) => !excluded.includes(result.id)).map((result) =>
          <option key={result.id} value={result.id}>{result.rolls.length === 1 ? result.rolls[0] : `${result.rolls[0]}-${result.rolls.at(-1)}`} · {result.name}</option>)}
      </select>
    </label>
    {definition && <p className="advancement-rules" style={{ whiteSpace: "pre-line" }}>{definition.ruleText}</p>}
    {definition?.secondaryRoll && <label className="skills-field"><span>{definition.secondaryRoll.type} SECONDARY RESULT</span>
      <select aria-label={`Secondary injury roll level ${depth}`} value={value.secondaryRoll ?? ""} onChange={(event) => set({ secondaryRoll: Number(event.target.value), injuries: [] })}>
        <option value="">Choose secondary roll</option>
        {Array.from({ length: definition.secondaryRoll.type === "D3" ? 3 : 6 }, (_, index) => index + 1).map((roll) =>
          <option key={roll} value={roll}>{roll}{definition.secondaryRoll?.results?.find((result) => result.rolls.includes(roll)) ? ` · ${definition.secondaryRoll.results.find((result) => result.rolls.includes(roll))?.ruleText}` : ""}</option>)}
      </select>
    </label>}
    {definition?.id === "multiple-injuries" && Array.from({ length: value.secondaryRoll ?? 0 }, (_, index) =>
      <fieldset key={index}><legend>Injury {index + 1}</legend><InjuryChoice table={heroTable} heroTable={heroTable}
        depth={depth + 1} hatredOpponents={hatredOpponents} excluded={["dead", "captured", "multiple-injuries"]} value={value.injuries?.[index] ?? {}}
        onChange={(child) => set({ injuries: Array.from({ length: value.secondaryRoll ?? 0 }, (_, childIndex) =>
          childIndex === index ? child : value.injuries?.[childIndex] ?? {}) })} /></fieldset>)}
    {definition?.id === "multiple-injuries" && <p>Each resulting injury with an effect will be saved as its own tracker entry.</p>}
    {definition?.id === "blinded-in-one-eye" && <label className="skills-field"><span>EYE LOST</span><select value={value.eye ?? ""} onChange={(event) => set({ eye: event.target.value || undefined })}>
      <option value="">Determine randomly</option><option value="left">Left</option><option value="right">Right</option>
    </select></label>}
    {definition?.id === "bitter-enmity" && <HatredTargetField value={value.hatredTarget ?? ""} roll={value.secondaryRoll}
      opponents={hatredOpponents} onChange={(hatredTarget) => set({ hatredTarget })} />}
    {definition?.id === "sold-to-the-pits" && <>
      <label className="skills-field"><span>PIT FIGHT</span><select value={value.pitOutcome ?? ""} onChange={(event) => set({ pitOutcome: event.target.value || undefined })}>
        <option value="">Fight not yet resolved</option><option value="won">Won · +2 XP and +50 GC</option><option value="lost">Lost · roll injuries again</option>
      </select></label>
      {value.pitOutcome === "lost" && <fieldset><legend>Pit defeat injury</legend><InjuryChoice table={heroTable} heroTable={heroTable} depth={depth + 1}
        excluded={heroTable.results.filter((result) => result.rolls[0] > 35).map((result) => result.id)}
        hatredOpponents={hatredOpponents} value={value.pitInjury ?? {}} onChange={(child) => set({ pitInjury: child })} /></fieldset>}
    </>}
    {definition?.id === "captured" && <label className="skills-field"><span>CAPTIVITY</span><select value={value.captureOutcome ?? ""} onChange={(event) => set({ captureOutcome: event.target.value || undefined })}>
      <option value="">Still captive</option><option value="ransomed">Ransomed · equipment retained</option><option value="exchanged">Exchanged · equipment retained</option><option value="removed">Sold / killed / sacrificed · remove warrior</option>
    </select><small>Agree ransom, captor rewards and equipment transfers at the tabletop; adjust the other warband separately.</small></label>}
  </div>;
}

export function InjuryResultView({ result, metadata, actions, applied = true, onChange, hatredOpponents }: {
  result: InjuryResult; metadata?: string; actions?: ReactNode; applied?: boolean;
  onChange?: (result: InjuryResult) => void; hatredOpponents?: HatredOpponent[] | null;
}) {
  return <article className="skills-detail injury-card">
    <strong>{result.name}{result.roll !== null ? ` · Roll ${result.roll}` : ""}{result.secondaryRoll ? ` · Secondary ${result.secondaryRoll}` : ""}</strong>
    {metadata && <small>{metadata}</small>}
    {result.secondaryText && <p className="injury-rule-text"><strong>Selected effect{result.secondaryName ? ` · ${result.secondaryName}` : ""}:</strong> {result.secondaryText}</p>}
    {result.id === "bitter-enmity" && onChange && <HatredTargetField value={result.hatredTarget ?? ""}
      roll={result.secondaryRoll} opponents={hatredOpponents} onChange={(hatredTarget) => onChange({
        ...result, hatredTarget, effects: result.effects.map((effect) => effect.type === "hatred" ? { ...effect, targetDescription: hatredTarget } : effect),
      })} />}
    {Boolean(result.effects?.length) && <ul aria-label="Injury effects">
      {result.effects.map((effect, index) => <li key={index}>
        <strong>{injuryEffectLabel(effect)}:</strong> {injuryEffectDescription(effect, applied)}
        {effect.sourceReference && <small>{effect.sourceReference}</small>}
      </li>)}
    </ul>}
    <p className="injury-rule-text">{result.ruleText}</p>
    {result.eye && <p>Eye lost: {result.eye}</p>}
    {result.pitOutcome && <p>Pit fight: {result.pitOutcome}</p>}
    {result.captureOutcome && <p>Captivity: {result.captureOutcome}</p>}
    {result.pending && <p>Pending tabletop resolution · unavailable for battle.</p>}
    {result.children.length > 0 && <div className="injury-cards">
      {result.children.map((child, index) => <InjuryResultView key={index} result={child} applied={applied}
        hatredOpponents={hatredOpponents} onChange={onChange ? (updated) => onChange({
          ...result, children: result.children.map((entry, childIndex) => childIndex === index ? updated : entry),
        }) : undefined} />)}
    </div>}
    {actions}
  </article>;
}

export function InjuryPanel({ member, request, onChanged, readOnly = false, refreshKey }: {
  member: Member;
  request: <T>(path: string, method?: string, body?: unknown) => Promise<T>;
  onChanged: () => Promise<void>;
  readOnly?: boolean;
  refreshKey: string;
}) {
  const [data, setData] = useState<InjuryData | null>(null);
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<InjurySelection>({});
  const [modelIndex, setModelIndex] = useState(0);
  const [resolvesId, setResolvesId] = useState<string | undefined>();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [oldWoundRoll, setOldWoundRoll] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialogTitle = useId();
  useEffect(() => {
    if (!open || !data || !dialog.current) return;
    const previousFocus = trigger.current ?? document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const modal = dialog.current;
    modal.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      modal.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open, Boolean(data)]);
  const path = `/members/${member.id}/injuries`;
  const load = useCallback(async () => {
    try { setData(await request<InjuryData>(path)); setError(""); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not load injuries."); }
  }, [request, path]);
  useEffect(() => { void load(); }, [load, refreshKey]);
  const act = async (action: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await action(); }
    catch (error) { setError(error instanceof Error ? error.message : "Injury action failed."); }
    finally { setBusy(false); }
  };
  const makePreview = (mode: "manual" | "simulated") => act(async () => {
    setPreview(await request<Preview>(`${path}/preview`, "POST", { mode, selection, modelIndex, resolvesId }));
  });
  const cancel = () => act(async () => {
    if (preview) await request(`${path}/${preview.id}`, "DELETE");
    setPreview(null); setOpen(false); setResolvesId(undefined);
  });
  const disabled = busy || readOnly;
  return <section className="advancement-panel" aria-label="Injuries">
    <div className="advancement-heading"><strong>Injuries</strong>
      {data?.canAdd && <button className="outline-button" disabled={disabled || open} type="button" onClick={(event) => {
        trigger.current = event.currentTarget;
        setOpen(true); setSelection({}); setModelIndex(0); setResolvesId(undefined);
      }}>Add injury</button>}
    </div>
    {error && !open && <p role="alert" className="skills-error">{error}</p>}
    {Boolean(data?.conditions?.length) && <div className="injury-cards" aria-label="Current injury effects">
      {data?.conditions.filter((condition) => condition.type !== "old-battle-check").map((condition, index) =>
        <article className="skills-detail injury-card" key={index}>
          <strong>{injuryEffectLabel(condition)}</strong>
          <small>Caused by {condition.name}</small>
          <p className="injury-rule-text">{injuryEffectDescription(condition)}</p>
          {condition.sourceReference && <small>{condition.sourceReference}</small>}
        </article>)}
    </div>}
    {data && !data.availability.available && <p className="skills-error">Unavailable for battle due to injuries.</p>}
    {data?.availability.needsOldWoundRoll && data.canCheckOldWound && <div className="advancement-actions">
      <p>Old battle wound · check once before the next battle. A 1 prevents participation.</p>
      <button type="button" disabled={disabled} onClick={() => void act(async () => {
        await request(`${path}/old-wound`, "POST", { mode: "simulated" }); await load(); await onChanged();
      })}>Simulate old wound check</button>
      <label>D6 result <select value={oldWoundRoll} onChange={(event) => setOldWoundRoll(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6].map((roll) => <option key={roll}>{roll}</option>)}</select></label>
      <button type="button" disabled={disabled} onClick={() => void act(async () => {
        await request(`${path}/old-wound`, "POST", { mode: "manual", roll: oldWoundRoll }); await load(); await onChanged();
      })}>Record old wound check</button>
    </div>}
    {data && open && <dialog ref={dialog} className="new-roster-dialog injury-dialog" role="dialog" aria-modal="true" aria-labelledby={dialogTitle}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        if (!busy) void cancel();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) void cancel();
      }}>
      <div className="advancement-heading">
        <h2 id={dialogTitle}>{resolvesId ? "Resolve injury" : "Add injury"} · {member.name || "Unnamed warrior"}</h2>
        <button className="outline-button" type="button" disabled={busy} aria-label="Close injury dialog" onClick={() => void cancel()}>Close</button>
      </div>
      {error && <p role="alert" className="skills-error">{error}</p>}
      <fieldset disabled={disabled}>
      <legend>{data.table.name}</legend>
      <p>Only record injuries for models taken out of action. Only outcomes with effects are saved; Full Recovery adds no record and does not clear existing injuries. Previewing does not change stats, equipment or gold.</p>
      {member.role === "Henchman" && !preview && <label>MODEL <select aria-label="Injured model" value={modelIndex} onChange={(event) => setModelIndex(Number(event.target.value))}>
        {Array.from({ length: member.groupSize }, (_, index) => <option key={index} value={index}>Model {index + 1}</option>)}
      </select></label>}
      {!preview ? <>
        {data.table.ruleText && <p>{data.table.ruleText}</p>}
        {data.table.applicationNote && <p>{data.table.applicationNote}</p>}
        <InjuryChoice table={resolvesId ? { ...data.heroTable, results: data.heroTable.results.filter((result) => result.id === selection.resultId) } : data.table}
          heroTable={data.heroTable} value={selection} onChange={setSelection} hatredOpponents={data.hatredOpponents} />
        <button className="skills-learn-button" type="button" disabled={resolvesId !== undefined && !selection.pitOutcome && !selection.captureOutcome} onClick={() => void makePreview("simulated")}>Simulate injury roll</button>
        <button className="skills-learn-button" type="button" disabled={!selection.resultId} onClick={() => void makePreview("manual")}>Preview selected injury</button>
      </> : <>
        {member.role === "Henchman" && <p>Injured model: {preview.modelIndex + 1}</p>}
        <div className="injury-cards"><InjuryResultView result={preview.result} applied={false}
          hatredOpponents={data.hatredOpponents} onChange={(result) => setPreview({ ...preview, result })} /></div>
        <p>Apply saves only effects and their cause. Stat changes are applied to the roster; psychology rules are referenced during gameplay, not permanent changes to base stats. Death or retirement removes the selected warrior or model without a refund.</p>
        <button className="primary-button" type="button" onClick={() => void act(async () => {
          const applied = await request<{ removed: boolean }>(`${path}/${preview.id}/apply`, "POST", { hatredTargets: hatredTargets(preview.result) });
          setPreview(null); setOpen(false); setResolvesId(undefined);
          await onChanged();
          if (!applied.removed || (member.role === "Henchman" && member.groupSize > 1)) await load();
        })}>Apply injury</button>
      </>}
      <button className="outline-button" type="button" onClick={() => void cancel()}>Cancel · save nothing</button>
      </fieldset>
    </dialog>}
    {Boolean(data?.history.length) && <div className="injury-cards" aria-label="Recorded injuries">
      {data?.history.map((entry) => <InjuryResultView key={entry.id} result={entry.result}
        metadata={`Battle ${entry.battle_number} · ${entry.mode}${member.role === "Henchman" ? ` · Model ${entry.model_index + 1} at time of injury` : ""}${entry.pending ? " · Pending" : ""}`}
        actions={entry.pending && data.canAdd && <button className="outline-button" type="button" disabled={disabled || open} onClick={(event) => {
        trigger.current = event.currentTarget;
        setResolvesId(entry.id); setSelection({ resultId: entry.result.id }); setOpen(true); setModelIndex(0);
      }}>Resolve {entry.result.name}</button>} />)}
    </div>}
  </section>;
}
