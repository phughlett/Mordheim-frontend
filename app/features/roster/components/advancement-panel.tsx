import { useState, type ReactNode } from "react";
import type { Member, RecordAdvanceInput, StatLabel, WarriorAdvancementsData } from "../types";

interface AdvancementPanelProps {
  member: Member;
  data: WarriorAdvancementsData | null;
  loading: boolean;
  error: string;
  onRecordAdvance: (input: RecordAdvanceInput) => Promise<boolean>;
  onRemoveAdvance: (advanceId: string) => Promise<boolean>;
  leading?: ReactNode;
}

const statNames: Record<StatLabel, string> = {
  M: "Movement",
  WS: "Weapon Skill",
  BS: "Ballistic Skill",
  S: "Strength",
  T: "Toughness",
  W: "Wounds",
  I: "Initiative",
  A: "Attacks",
  Ld: "Leadership",
};

function advanceDescription(advance: WarriorAdvancementsData["history"][number]) {
  if (advance.result === "new_skill") {
    if (advance.learnedSpellName) return `New Spell · ${advance.learnedSpellName}`;
    if (advance.reducedSpellName) return `Spell casting value reduced by 1 · ${advance.reducedSpellName}`;
    return advance.learnedSkillName
      ? `New Skill · ${advance.learnedSkillName}${advance.learnedSkillCategory ? ` (${advance.learnedSkillCategory})` : ""}`
      : "New Skill · choose a skill in the Skills panel (casters may learn a spell instead)";
  }
  if (advance.result === "lads_got_talent") return "Lad's Got Talent";
  return `+1 ${advance.stat ? statNames[advance.stat] : "characteristic"}`;
}

export function AdvancementPanel({ member, data, loading, error, onRecordAdvance, onRemoveAdvance, leading }: AdvancementPanelProps) {
  const [result, setResult] = useState<"stat_increase" | "new_skill" | "lads_got_talent">("stat_increase");
  const [stat, setStat] = useState<StatLabel | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [removingAdvanceId, setRemovingAdvanceId] = useState<string | null>(null);

  async function record(input: RecordAdvanceInput) {
    setSubmitting(true);
    try {
      const recorded = await onRecordAdvance(input);
      if (recorded) {
        setStat("");
        setResult("stat_increase");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function removeAdvance(advanceId: string) {
    setRemovingAdvanceId(advanceId);
    try {
      await onRemoveAdvance(advanceId);
    } finally {
      setRemovingAdvanceId(null);
    }
  }

  const availableStats = data?.availableStats ?? [];
  const isHeroTable = data?.advanceTable === "Hero";
  const showStatChoice = result === "stat_increase";
  const canSubmitManual = Boolean(data?.pending)
    && (!showStatChoice || availableStats.includes(stat as StatLabel))
    && (result !== "lads_got_talent" || data?.canPromote)
    && removingAdvanceId === null;
  const actionInProgress = submitting || removingAdvanceId !== null;

  return (
    <section className="advancement-panel" aria-label="Experience advances">
      <div className="advancement-top">
      {leading}
      <div className="advancement-main">
      <div className="advancement-heading">
        <div>
          <span className="skills-panel-label">ADVANCES</span>
          <strong>{data?.advanceTable ?? (member.role === "Hero" ? "Hero" : "Henchman")} advance table</strong>
        </div>
        {data?.pending && <span className="advancement-ready">Advance ready</span>}
      </div>
      {loading ? <p className="skills-state">Loading advances...</p> : !data ? (
        <p className="skills-state">Advance data is unavailable.</p>
      ) : !data.canGainExperience ? (
        <p className="skills-state">{data.experienceRule || "This warrior type does not gain experience."}</p>
      ) : (
        <>
          <p className="advancement-summary">
            {data.pending
              ? `Resolve the advance earned at ${data.nextAdvanceThreshold} experience.${data.pendingCount > 1 ? ` (${data.pendingCount} pending)` : ""}`
              : data.nextAdvanceThreshold === null
                ? "All listed advances have been reached."
                : `${Math.max(0, data.nextAdvanceThreshold - data.experience)} XP until the next advance.`}
          </p>
          {data.lockedExperience > data.minimumExperience && (
            <p className="advancement-rules">
              Experience is locked at {data.lockedExperience} or above by a recorded advancement. Remove the advancement award to lower it.
            </p>
          )}
          {data.maximumProfile
            ? <p className="advancement-rules">Stat limits: {data.maximumProfile} profile.</p>
            : isHeroTable && <p className="advancement-rules">No racial maximum profile is listed for this warrior.</p>}
          {data.pending && (
            <div className="advancement-actions">
              <button className="skills-learn-button" disabled={actionInProgress} onClick={() => void record({ mode: "simulated" })} type="button">
                {submitting ? "Rolling..." : "Simulate advance"}
              </button>
              <label className="skills-field">
                <span>MANUAL RESULT</span>
                <select
                  value={result}
                  disabled={actionInProgress}
                  onChange={(event) => setResult(event.target.value as typeof result)}
                >
                  <option value="stat_increase">Characteristic increase</option>
                  {isHeroTable && <option value="new_skill">New skill</option>}
                  {!isHeroTable && data.canPromote && <option value="lads_got_talent">Lad's Got Talent</option>}
                </select>
              </label>
              {showStatChoice && (
                <label className="skills-field">
                  <span>CHARACTERISTIC</span>
                  <select value={stat} disabled={actionInProgress || availableStats.length === 0} onChange={(event) => setStat(event.target.value as StatLabel | "")}>
                    <option value="">Choose characteristic</option>
                    {availableStats.map((label) => <option key={label} value={label}>{label} · {statNames[label]}</option>)}
                  </select>
                </label>
              )}
              {!isHeroTable && !data.canPromote && (
                <p className="advancement-rules">Lad's Got Talent is unavailable: the warrior type cannot be promoted or the roster is at its Hero limit.</p>
              )}
              <button className="skills-learn-button" disabled={!canSubmitManual || actionInProgress} onClick={() => void record({ mode: "manual", result, ...(showStatChoice && stat ? { stat } : {}) })} type="button">
                Record manual result
              </button>
            </div>
          )}
          {!data.pending && <p className="skills-state">Add experience to unlock an advance. Starting experience is treated as already resolved.</p>}
        </>
      )}
      {error && <p className="skills-error" role="alert">{error}</p>}
      </div>
      </div>
          {data?.canGainExperience && data.history.length > 0 && (
            <div className="advancement-history">
              <span className="skills-panel-label">RECORDED ADVANCES</span>
              <p className="advancement-rules">Undo the latest advance on a table first; its recorded stat or learned skill will also be reversed.</p>
              <div className="advancement-history-list">
              {data.history.map((advance) => (
                <div className="advancement-history-item" key={advance.id}>
                  <span>{advance.experienceThreshold} XP · {advance.advanceTable}</span>
                  <strong>{advance.roll ? `2D6 ${advance.roll}${advance.secondaryRoll ? ` · D6 ${advance.secondaryRoll}` : ""} · ` : ""}{advanceDescription(advance)}</strong>
                  {advance.consumedAt && <small>Used for promotion</small>}
                  {advance.canRemove && (
                    <button
                      className="advancement-remove-button"
                      type="button"
                      aria-label={`Remove advancement award earned at ${advance.experienceThreshold} XP`}
                      title="Undo this latest advance and reverse its recorded effect"
                      disabled={submitting || removingAdvanceId !== null}
                      onClick={() => void removeAdvance(advance.id)}
                    >
                      {removingAdvanceId === advance.id ? "Removing..." : "Remove advancement award"}
                    </button>
                  )}
                </div>
              ))}
              </div>
            </div>
          )}
    </section>
  );
}
