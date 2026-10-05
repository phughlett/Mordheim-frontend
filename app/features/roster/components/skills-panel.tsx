import { useState, type ReactNode } from "react";
import type { Member, SkillCategoryChoice, WarriorSkillsData } from "../types";

function eligibilityLabel(choice: SkillCategoryChoice) {
  return choice.specialListName ? `${choice.category} · ${choice.specialListName}` : choice.category;
}

interface SkillsPanelProps {
  member: Member;
  data: WarriorSkillsData | null;
  loading: boolean;
  error: string;
  onLearn: (skillId: string, advanceId: string) => Promise<void>;
  onForget: (warriorSkillId: string) => Promise<void>;
  listPicker?: ReactNode;
}

export function SkillsPanel({ member, data, loading, error, onLearn, onForget, listPicker }: SkillsPanelProps) {
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [learning, setLearning] = useState(false);
  const [editingLists, setEditingLists] = useState(false);
  const [forgettingId, setForgettingId] = useState<string | null>(null);

  const availableSkills = data?.availableSkills ?? [];
  const eligibility = data?.eligibility ?? [];
  const learnedSkills = data?.learnedSkills ?? [];
  const pendingSkillAdvances = data?.pendingSkillAdvances ?? [];
  const [selectedAdvanceId, setSelectedAdvanceId] = useState("");
  const selectedSkill = availableSkills.find((skill) => skill.id === selectedSkillId);

  const showPicker = Boolean(listPicker) && learnedSkills.length === 0 && (editingLists || (!loading && eligibility.length === 0));

  async function learnSelectedSkill() {
    if (!selectedSkill || !selectedAdvanceId) return;
    setLearning(true);
    try {
      await onLearn(selectedSkill.id, selectedAdvanceId);
      setSelectedSkillId("");
      setSelectedAdvanceId("");
    } finally {
      setLearning(false);
    }
  }

  async function forgetLearnedSkill(warriorSkillId: string) {
    setForgettingId(warriorSkillId);
    try {
      await onForget(warriorSkillId);
    } finally {
      setForgettingId(null);
    }
  }

  return (
    <section className="skills-panel" aria-label="Warrior skills">
      <div className="skills-panel-heading">
        <span className="skills-panel-label">SKILLS</span>
        <strong>Advances &amp; abilities</strong>
        {listPicker && (
          <button
            className="skills-lists-button"
            type="button"
            disabled={learnedSkills.length > 0}
            title={learnedSkills.length > 0 ? "Skill lists are locked once a skill has been learned." : "Change the skill lists this Hero can learn from."}
            onClick={() => setEditingLists(!showPicker)}
          >
            {showPicker ? "Close lists" : "Change skill lists"}
          </button>
        )}
      </div>
      {showPicker && listPicker}
      {eligibility.length > 0 && (
        <div className="skills-eligibility">
          {eligibility.map((choice) => (
            <span className="skills-eligibility-tag" key={eligibilityLabel(choice)}>{eligibilityLabel(choice)}</span>
          ))}
        </div>
      )}
      {loading ? <p className="skills-state">Loading skills...</p> : eligibility.length === 0 ? (
        <p className="skills-state">{listPicker ? "Choose two skill lists to begin learning skills." : member.role === "Henchman" ? "Henchmen cannot learn skills until promoted via Lad's Got Talent." : "This warrior has no verified skill-category access."}</p>
      ) : (
        <div className="skills-pick-form">
          <label className="skills-field">
            <span>NEW SKILL ADVANCE</span>
            <select
              value={selectedAdvanceId}
              onChange={(event) => setSelectedAdvanceId(event.target.value)}
              disabled={!pendingSkillAdvances.length}
            >
              <option value="">{pendingSkillAdvances.length ? "Choose recorded New Skill advance" : "No pending New Skill advance"}</option>
              {pendingSkillAdvances.map((advance) => (
                <option key={advance.id} value={advance.id}>{advance.experienceThreshold} XP advance</option>
              ))}
            </select>
          </label>
          <label className="skills-field">
            <span>LEARN A SKILL</span>
            <select value={selectedSkillId} onChange={(event) => setSelectedSkillId(event.target.value)} disabled={!availableSkills.length || !selectedAdvanceId}>
              <option value="">{!pendingSkillAdvances.length ? "Earn a New Skill advance first" : availableSkills.length ? "Choose skill" : "No skills available"}</option>
              {availableSkills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name} · {skill.category}{skill.specialListName ? ` (${skill.specialListName})` : ""}
                </option>
              ))}
            </select>
          </label>
          <button className="skills-learn-button" type="button" disabled={!selectedSkill || !selectedAdvanceId || learning} onClick={() => void learnSelectedSkill()}>
            {learning ? "Learning..." : "Learn"}
          </button>
          {selectedSkill && (
            <div className="skills-detail">
              <p>{selectedSkill.description}</p>
            </div>
          )}
        </div>
      )}
      {error && <p className="skills-error" role="alert">{error}</p>}
      <div className="skills-learned">
        <span className="skills-panel-label">LEARNED</span>
        {learnedSkills.length ? learnedSkills.map((skill) => (
          <div className="skills-learned-item" key={skill.warriorSkillId}>
            <div className="skills-learned-item-main">
              <span>{skill.name}<small>{skill.isStarting ? "Starting · " : ""}{skill.category}{skill.specialListName ? ` · ${skill.specialListName}` : ""}</small></span>
              <p className="skills-learned-description">{skill.description}</p>
              {skill.purchaseCost != null && <small>Purchased · {skill.purchaseCost} GC · forgetting refunds the latest purchase during roster creation.</small>}
            </div>
            <button className="skills-forget-button" type="button" disabled={forgettingId !== null || skill.isStarting} aria-label={skill.isStarting ? `${skill.name} is a starting ability` : `Forget ${skill.name}`} onClick={() => void forgetLearnedSkill(skill.warriorSkillId)}>
              {skill.isStarting ? "Starting" : forgettingId === skill.warriorSkillId ? "Forgetting..." : "Forget"}
            </button>
          </div>
        )) : <p className="skills-state">No skills learned yet.</p>}
      </div>
    </section>
  );
}
