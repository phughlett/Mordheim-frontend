import { useEffect, useState } from "react";
import type { LadsGotTalentOptions, SkillCategoryChoice } from "../types";

function choiceKey(choice: SkillCategoryChoice) {
  return `${choice.category}|${choice.specialListName ?? ""}`;
}

function choiceLabel(choice: SkillCategoryChoice) {
  return choice.specialListName ? `${choice.category} · ${choice.specialListName}` : choice.category;
}

interface LadsGotTalentPanelProps {
  options: LadsGotTalentOptions | null;
  loading: boolean;
  error: string;
  onSave: (choices: SkillCategoryChoice[]) => Promise<void>;
}

export function LadsGotTalentPanel({ options, loading, error, onSave }: LadsGotTalentPanelProps) {
  const [firstKey, setFirstKey] = useState("");
  const [secondKey, setSecondKey] = useState("");
  const [saving, setSaving] = useState(false);
  const choices = options?.options ?? [];
  const selected = options?.selected ?? [];

  useEffect(() => {
    if (selected.length === 2) {
      setFirstKey(choiceKey(selected[0]));
      setSecondKey(choiceKey(selected[1]));
    }
  }, [options]);

  const byKey = new Map(choices.map((choice) => [choiceKey(choice), choice]));

  async function save() {
    const first = byKey.get(firstKey);
    const second = byKey.get(secondKey);
    if (!first || !second || firstKey === secondKey) return;
    setSaving(true);
    try {
      await onSave([first, second]);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="skills-state">Loading skill-list choices...</p>;
  if (!choices.length) return <p className="skills-state">No Hero skill lists are verified for this warband yet.</p>;

  return (
    <div className="lads-got-talent-picker">
      <p>Choose the 2 skill lists this promoted Hero may draw from (as a real Hero of this type normally could).</p>
      <div className="lads-got-talent-selects">
        <label className="skills-field">
          <span>LIST 1</span>
          <select value={firstKey} onChange={(event) => setFirstKey(event.target.value)}>
            <option value="">Choose list</option>
            {choices.map((choice) => <option key={choiceKey(choice)} value={choiceKey(choice)} disabled={choiceKey(choice) === secondKey}>{choiceLabel(choice)}</option>)}
          </select>
        </label>
        <label className="skills-field">
          <span>LIST 2</span>
          <select value={secondKey} onChange={(event) => setSecondKey(event.target.value)}>
            <option value="">Choose list</option>
            {choices.map((choice) => <option key={choiceKey(choice)} value={choiceKey(choice)} disabled={choiceKey(choice) === firstKey}>{choiceLabel(choice)}</option>)}
          </select>
        </label>
      </div>
      <button className="promotion-button" type="button" disabled={!firstKey || !secondKey || firstKey === secondKey || saving} onClick={() => void save()}>
        {saving ? "Saving..." : selected.length === 2 ? "Update skill lists" : "Confirm skill lists"}
      </button>
      {error && <p className="skills-error" role="alert">{error}</p>}
    </div>
  );
}
