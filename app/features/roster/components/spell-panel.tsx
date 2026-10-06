import { useEffect, useState } from "react";
import type {
  CustomSpellInput,
  LearnSpellInput,
  KnownSpell,
  SpellAcquisitionMethod,
  SpellDiscipline,
  SpellRollResponse,
  WarriorSpellsData,
} from "../types";

interface SpellPanelProps {
  allowTomeRecording?: boolean;
  data: WarriorSpellsData | null;
  pendingAdvanceId: string | null;
  loading: boolean;
  error: string;
  onLearn: (input: LearnSpellInput) => Promise<boolean>;
  onRoll: (disciplineId: string, count: 1 | 2) => Promise<SpellRollResponse | null>;
  onForget: (warriorSpellId: string) => Promise<boolean>;
  onReduceDifficulty: (warriorSpellId: string, advanceId: string) => Promise<boolean>;
  onSetDiscipline: (disciplineId: string) => Promise<boolean>;
  onRecordTome: (unitCostPaid: number | null) => Promise<boolean>;
  onConsumeTome: () => Promise<boolean>;
}

function formatDifficulty(spell: KnownSpell, castingRollBonus: number) {
  if (spell.effectiveCastingDifficulty === null) return spell.difficultyNote || "No numeric casting difficulty";
  const parts: string[] = [];
  if (spell.castingDifficulty !== null) {
    parts.push(`base ${spell.castingDifficulty}`);
    const proficiency = spell.castingDifficulty - castingRollBonus - spell.effectiveCastingDifficulty;
    if (proficiency !== 0) parts.push(`proficiency ${proficiency > 0 ? "-" : "+"}${Math.abs(proficiency)}`);
    if (castingRollBonus) parts.push(`Sorcery -${castingRollBonus}`);
  }
  return `Roll ${spell.effectiveCastingDifficulty}+ to cast${parts.length ? ` (${parts.join(", ")})` : ""}`;
}

export function SpellPanel({
  allowTomeRecording = true,
  data,
  pendingAdvanceId,
  loading,
  error,
  onLearn,
  onRoll,
  onForget,
  onReduceDifficulty,
  onSetDiscipline,
  onRecordTome,
  onConsumeTome,
}: SpellPanelProps) {
  const [selectedDisciplineId, setSelectedDisciplineId] = useState("");
  const [selectedSpellId, setSelectedSpellId] = useState("");
  const [tomeCostPaid, setTomeCostPaid] = useState("");
  const [acquisitionMethod, setAcquisitionMethod] = useState<SpellAcquisitionMethod>("advance");
  const [rolledResults, setRolledResults] = useState<SpellRollResponse["results"]>([]);
  const [customSpell, setCustomSpell] = useState<CustomSpellInput>({
    name: "",
    castingDifficulty: null,
    difficultyNote: null,
    effectSummary: null,
    sourceReference: null,
  });
  const [busy, setBusy] = useState(false);
  const [busySpellId, setBusySpellId] = useState<string | null>(null);
  const availableDisciplines = data?.availableDisciplines ?? [];
  const disciplineChoices = data?.disciplineChoices ?? [];
  const selectableDisciplines = new Map<string, { disciplineId: string; name: string; isChoice: boolean }>();
  disciplineChoices.forEach((choice) => {
    selectableDisciplines.set(choice.disciplineId, { disciplineId: choice.disciplineId, name: choice.name, isChoice: true });
  });
  availableDisciplines.forEach((discipline) => {
    if (!selectableDisciplines.has(discipline.disciplineId)) {
      selectableDisciplines.set(discipline.disciplineId, { disciplineId: discipline.disciplineId, name: discipline.name, isChoice: false });
    }
  });
  const selectableDisciplineOptions = [...selectableDisciplines.values()];
  const selectedDiscipline = availableDisciplines.find((discipline) => discipline.disciplineId === selectedDisciplineId);
  const selectedSpell = selectedDiscipline?.spells.find((spell) => spell.id === selectedSpellId);
  const knownSpells = data?.knownSpells ?? [];
  const startingRemaining = data?.startingSpellsRemaining ?? 0;
  const advanceAvailable = Boolean(pendingAdvanceId && data?.canLearnSpellFromAdvance);
  const effectiveMethod: SpellAcquisitionMethod = startingRemaining > 0
    ? "starting"
    : "advance";
  const canAcquire = startingRemaining > 0 || advanceAvailable;
  const advanceIdFor = (method: SpellAcquisitionMethod) => method === "advance" ? pendingAdvanceId ?? undefined : undefined;

  useEffect(() => {
    const nextId = data?.selectedSpellDisciplineId
      ?? (data?.availableDisciplines.length === 1 ? data.availableDisciplines[0].disciplineId : "");
    setSelectedDisciplineId(nextId ?? "");
  }, [data]);

  async function learnSelectedSpell() {
    if (!selectedSpell || selectedSpell.alreadyKnown || !selectedDiscipline) return;
    setBusy(true);
    try {
      const learned = await onLearn({ spellId: selectedSpell.id, acquisitionMethod: effectiveMethod, advanceId: advanceIdFor(effectiveMethod) });
      if (learned) {
        setSelectedSpellId("");
        setRolledResults([]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function rollSpells(count: 1 | 2) {
    if (!selectedDiscipline) return;
    setBusy(true);
    try {
      const response = await onRoll(selectedDiscipline.disciplineId, count);
      if (response) setRolledResults(response.results);
    } finally {
      setBusy(false);
    }
  }

  async function rerollResult(index: number) {
    if (!selectedDiscipline) return;
    setBusy(true);
    try {
      const response = await onRoll(selectedDiscipline.disciplineId, 1);
      if (response?.results[0]) {
        setRolledResults((current) => current.map((result, resultIndex) => resultIndex === index ? response.results[0] : result));
      }
    } finally {
      setBusy(false);
    }
  }

  async function learnRolledSpell(spellId: string) {
    setBusySpellId(spellId);
    try {
      if (await onLearn({ spellId, acquisitionMethod: effectiveMethod, advanceId: advanceIdFor(effectiveMethod) })) {
        setRolledResults([]);
      }
    } finally {
      setBusySpellId(null);
    }
  }

  async function saveDiscipline(disciplineId: string) {
    setSelectedDisciplineId(disciplineId);
    setSelectedSpellId("");
    setRolledResults([]);
    setBusy(true);
    try {
      if (!await onSetDiscipline(disciplineId)) {
        setSelectedDisciplineId(data?.selectedSpellDisciplineId ?? "");
      }
    } finally {
      setBusy(false);
    }
  }

  async function recordTome() {
    setBusy(true);
    try {
      if (await onRecordTome(tomeCostPaid ? Number(tomeCostPaid) : null)) setTomeCostPaid("");
    } finally {
      setBusy(false);
    }
  }

  async function consumeTome() {
    setBusy(true);
    try {
      await onConsumeTome();
    } finally {
      setBusy(false);
    }
  }

  async function updateKnownSpell(spell: KnownSpell, operation: "forget" | "reduce") {
    setBusySpellId(spell.warriorSpellId);
    try {
      if (operation === "forget") await onForget(spell.warriorSpellId);
      else if (pendingAdvanceId && await onReduceDifficulty(spell.warriorSpellId, pendingAdvanceId)) setRolledResults([]);
    } finally {
      setBusySpellId(null);
    }
  }

  function spellDescription(spell: { effectSummary: string | null; difficultyNote: string | null }) {
    return spell.effectSummary || spell.difficultyNote || "No effect summary recorded.";
  }

  function disciplineLabel(discipline: SpellDiscipline) {
    return `${discipline.name} · ${discipline.kind}`;
  }

  return (
    <section className="spell-panel" aria-label="Warrior spells and prayers">
      <div className="spell-panel-heading">
        <span className="skills-panel-label">SPELLS &amp; PRAYERS</span>
        <strong>Magic, prayers &amp; rituals</strong>
      </div>
      {loading ? <p className="skills-state">Loading spell access...</p> : <>
        {startingRemaining > 0 && (
          <p className="spell-rule-note" role="status">
            Starting spell required: {data?.disciplineChoices.length && !data.selectedSpellDisciplineId
              ? "choose a spell list, then roll or pick"
              : `roll or choose ${startingRemaining} starting spell${startingRemaining === 1 ? "" : "s"}`} before any other spell actions.
          </p>
        )}
        {startingRemaining === 0 && advanceAvailable && (
          <p className="spell-rule-note" role="status">
            A New Skill advance is pending. Instead of a skill, learn a new spell below (roll or choose). If you roll a spell you already know, you may improve your proficiency in it, lowering its casting value by 1.
          </p>
        )}
        {data && (disciplineChoices.length > 0 || selectableDisciplineOptions.length > 1) && (
          <label className="skills-field">
            <span>DISCIPLINE</span>
            <select value={selectedDisciplineId} onChange={(event) => void saveDiscipline(event.target.value)} disabled={busy}>
              <option value="">Choose a spell list</option>
              {selectableDisciplineOptions.map((discipline) => (
                <option key={discipline.disciplineId} value={discipline.disciplineId}>
                  {discipline.name}{discipline.isChoice ? " · choice" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {selectedDiscipline ? (
          <div className="spell-discipline">
            <div className="spell-discipline-title">{disciplineLabel(selectedDiscipline)}</div>
            <p>{selectedDiscipline.castingRuleSummary}</p>
            {selectedDiscipline.selectionRule && <small>{selectedDiscipline.selectionRule}</small>}
            {selectedDiscipline.startingSpellEligible && (
              <p className="spell-count">
                Starting spells: {selectedDiscipline.startingSpellCount === null
                  ? "the source does not specify a count"
                  : `${data?.startingSpellCountLearned ?? 0} / ${selectedDiscipline.startingSpellCount} recorded`}
              </p>
            )}
            <label className="skills-field">
              <span>RECORD A CATALOG SPELL</span>
              <select value={selectedSpellId} onChange={(event) => setSelectedSpellId(event.target.value)}>
                <option value="">Choose spell</option>
                {selectedDiscipline.spells.map((spell) => (
                  <option key={spell.id} value={spell.id} disabled={spell.alreadyKnown}>
                    {spell.roll ? `${spell.roll}. ` : ""}{spell.name}{spell.alreadyKnown ? " · already known" : ""}
                  </option>
                ))}
              </select>
            </label>
            {selectedSpell && (
              <div className="skills-detail">
                <p>{spellDescription(selectedSpell)}</p>
                <small>{selectedSpell.castingDifficulty === null ? selectedSpell.difficultyNote : `Casting value ${selectedSpell.castingDifficulty}+`}</small>
              </div>
            )}
            {startingRemaining === 0 && !advanceAvailable && (
              <p className="spell-rule-note">New spells require a pending New Skill advance. Gain experience to earn one.</p>
            )}
            <button className="skills-learn-button" type="button" disabled={!selectedSpell || selectedSpell.alreadyKnown || busy || !canAcquire} onClick={() => void learnSelectedSpell()}>
              {busy ? "Recording..." : "Record spell"}
            </button>
            <div className="spell-roll-actions">
              <button className="skills-learn-button" type="button" disabled={busy || !canAcquire || !selectedDiscipline.spells.some((spell) => spell.roll !== null)} onClick={() => void rollSpells(1)}>Roll one spell</button>
              <button className="skills-learn-button" type="button" disabled={busy || !canAcquire || !selectedDiscipline.spells.some((spell) => spell.roll !== null)} onClick={() => void rollSpells(2)}>Roll two · choose one</button>
            </div>
          </div>
        ) : disciplineChoices.length > 0 && !selectedDisciplineId ? (
          <p className="skills-state">Choose one of the sourced spell lists available to this warrior.</p>
        ) : data?.availableDisciplines.length ? (
          <p className="skills-state">Select a discipline to manage its spells.</p>
        ) : (
          <p className="skills-state">
            {data?.hasSpellcastingProfile
              ? "This profile has a sourced spell list, but no list is currently selected."
              : data?.hasAcademicSkillAccess
                ? "Learn Arcane Lore and use a Tome of Magic to unlock Lesser Magic."
                : "No spell list is currently sourced for this profile."}
          </p>
        )}
        {rolledResults.length > 0 && (
          <div className="spell-roll-results">
            <span className="skills-panel-label">ROLL RESULTS</span>
            {rolledResults.map((result, index) => {
              const isDouble = rolledResults.length === 2 && rolledResults.some((other, otherIndex) => otherIndex !== index && other.id === result.id);
              return (
              <div className="spell-roll-result" key={`${result.id}-${index}`}>
                <div>
                  <strong>{result.roll}. {result.name}</strong>
                  <p>{spellDescription(result)}</p>
                  <small>{result.castingDifficulty === null ? result.difficultyNote : `Casting value ${result.castingDifficulty}+`}</small>
                </div>
                {result.alreadyKnown ? (
                  <div className="spell-result-actions">
                    {isDouble && <button className="skills-forget-button" type="button" disabled={busy} onClick={() => void rerollResult(index)}>Reroll</button>}
                    {advanceAvailable && startingRemaining === 0 && result.knownWarriorSpellId && result.effectiveCastingDifficulty !== null && (
                      <button className="skills-forget-button" type="button" disabled={busy} onClick={() => {
                        const known = knownSpells.find((spell) => spell.warriorSpellId === result.knownWarriorSpellId);
                        if (known) void updateKnownSpell(known, "reduce");
                      }}>Improve proficiency: casting value -1</button>
                    )}
                  </div>
                ) : (
                  <div className="spell-result-actions">
                    <button className="skills-forget-button" type="button" disabled={busySpellId !== null || busy} onClick={() => void learnRolledSpell(result.id)}>
                      {busySpellId === result.id ? "Recording..." : "Choose"}
                    </button>
                    {isDouble && <button className="skills-forget-button" type="button" disabled={busy} onClick={() => void rerollResult(index)}>Reroll</button>}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
        {data?.hasAcademicSkillAccess && data.tomeAllowed && (
          <div className="spell-tome">
            <span className="skills-panel-label">TOME OF MAGIC INVENTORY · {data.tomeInventory.length} owned</span>
            <small>
              {allowTomeRecording
                ? "Record a Tome already acquired outside a campaign market. Its listed cost is 200+D6×25 GC (Rare 12); recording it here does not purchase it."
                : "In campaigns, buy the Tome of Magic through Warband stash. Manual Tome recording is disabled here."}
            </small>
            {allowTomeRecording && <>
              <label className="skills-field">
                <span>GC PAID (OPTIONAL)</span>
                <input type="number" min={0} max={1000000} step={1} value={tomeCostPaid} onChange={(event) => setTomeCostPaid(event.target.value)} />
              </label>
              <button className="skills-learn-button" type="button" disabled={busy} onClick={() => void recordTome()}>
                Record acquired Tome
              </button>
            </>}
            {data.lesserMagicUnlocked ? (
              <p className="spell-rule-note">Lesser Magic is unlocked. A Tome was consumed to learn the discipline.</p>
            ) : !data.hasArcaneLore ? (
              <p className="spell-rule-note">Learn Arcane Lore from the Academic skill list, then use a Tome from this inventory to learn Lesser Magic.</p>
            ) : data.canLearnLesserMagic ? (
              <button className="skills-learn-button" type="button" disabled={busy} onClick={() => void consumeTome()}>
                Use Tome to learn Lesser Magic · consume 1
              </button>
            ) : (
              <p className="spell-rule-note">Add a Tome of Magic to this inventory to unlock Lesser Magic.</p>
            )}
          </div>
        )}
        {(data?.castingRollBonus ?? 0) > 0 && <p className="spell-rule-note">Sorcery: +1 to casting rolls. Spell values above show any duplicate-spell reductions separately.</p>}
        {error && <p className="skills-error" role="alert">{error}</p>}
        <div className="skills-learned">
          <span className="skills-panel-label">KNOWN SPELLS</span>
          {knownSpells.length ? knownSpells.map((spell) => (
            <div className="skills-learned-item" key={spell.warriorSpellId}>
              <div className="skills-learned-item-main">
                <span>{spell.name}<small>{spell.isStarting ? "Starting · " : ""}{spell.disciplineName} · {spell.acquisitionMethod}</small></span>
                <p className="skills-learned-description">{spell.effectSummary || "No effect summary recorded."}</p>
                <p className="skills-learned-description">{formatDifficulty(spell, data?.castingRollBonus ?? 0)}</p>
              </div>
              <div className="spell-known-actions">
                <button className="skills-forget-button" type="button" disabled={busySpellId !== null || spell.acquisitionMethod === "advance"} onClick={() => void updateKnownSpell(spell, "forget")}>{spell.acquisitionMethod === "advance" ? "Via advance" : "Forget"}</button>
              </div>
            </div>
          )) : <p className="skills-state">No spells recorded yet.</p>}
        </div>
      </>}
    </section>
  );
}
