import { getAdvanceThresholds, getMaximumExperience } from "../../experience-rules";
import type { MemberRole } from "../../types";

interface ExperienceTrackerProps {
  experience: string;
  role: MemberRole;
  groupSize: number;
  minimumExperience?: number;
  canGainExperience?: boolean;
  experienceRule?: string | null;
  onChange: (experience: string) => void;
}

export function ExperienceTracker({ experience, role, groupSize, minimumExperience = 0, canGainExperience = true, experienceRule, onChange }: ExperienceTrackerProps) {
  const advanceThresholds = getAdvanceThresholds(role);
  const maximumExperience = getMaximumExperience(role);
  const trackedExperience = maximumExperience;
  const currentExperience = Math.max(0, Number(experience) || 0);
  const nextAdvance = advanceThresholds.find((threshold) => threshold > currentExperience);
  const reachedAdvances = advanceThresholds.filter((threshold) => threshold <= currentExperience).length;
  const isHenchmanGroup = role === "Henchman";
  const usesHenchmanProgression = role !== "Hero";
  function adjustExperience(amount: number) {
    onChange(String(Math.min(maximumExperience, Math.max(minimumExperience, currentExperience + amount))));
  }

  if (!canGainExperience) {
    return (
      <section className="experience-tracker" aria-label="Experience tracking">
        <span className="experience-label">EXPERIENCE</span>
        <p>This type does not gain experience.</p>
        {experienceRule && <small>{experienceRule}</small>}
      </section>
    );
  }

  return (
    <section className="experience-tracker" aria-label={isHenchmanGroup ? "Henchman group experience tracking" : "Experience tracking"}>
      <div className="experience-tracker-heading">
        <div>
          <span className="experience-label">{isHenchmanGroup ? "GROUP EXPERIENCE" : "EXPERIENCE"}</span>
          <p>{nextAdvance === undefined
            ? "All listed advances reached"
            : `${nextAdvance - currentExperience} XP to next advance`}</p>
          {isHenchmanGroup && <p>{currentExperience * groupSize} total XP across {groupSize} {groupSize === 1 ? "model" : "models"}</p>}
        </div>
        <div className="experience-adjuster">
          <button type="button" aria-label="Remove 1 experience point" disabled={currentExperience <= minimumExperience} onClick={() => adjustExperience(-1)}>−</button>
          <input
            aria-label={isHenchmanGroup ? "Experience points per Henchman" : "Experience points"}
            max={maximumExperience}
            type="number"
            min={minimumExperience}
            step={1}
            value={experience}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "" || /^\d+$/.test(value)) {
                onChange(String(Math.min(maximumExperience, Math.max(minimumExperience, Number(value) || minimumExperience))));
              }
            }}
          />
          <button type="button" aria-label="Add 1 experience point" disabled={currentExperience >= maximumExperience} onClick={() => adjustExperience(1)}>+</button>
        </div>
      </div>
      <div className={`experience-track ${usesHenchmanProgression ? "is-henchman" : "is-hero"}`} role="img" aria-label={`${currentExperience} experience points${isHenchmanGroup ? ` per model in a group of ${groupSize}` : ""}; ${reachedAdvances} advances reached`}>
        {Array.from({ length: trackedExperience }, (_, index) => {
          const point = index + 1;
          const isAdvance = advanceThresholds.includes(point);
          const isEarned = point <= currentExperience;
          return <span
            key={point}
            className={`experience-point${isAdvance ? " is-advance" : ""}${isEarned ? " is-earned" : ""}`}
            aria-hidden="true"
          />;
        })}
      </div>
    </section>
  );
}
