import { getAdvanceThresholds, getMaximumExperience } from "../../experience-rules";
import type { MemberRole } from "../../types";

export function PrintExperienceTrack({ role, experience, canGainExperience }: {
  role: MemberRole;
  experience: string;
  canGainExperience: boolean;
}) {
  if (!canGainExperience) return <p className="print-empty">This type does not gain experience.</p>;
  const thresholds = getAdvanceThresholds(role);
  const current = Math.max(0, Number(experience) || 0);
  return (
    <section className="print-experience" aria-label="Experience tracking">
      <h3>{role === "Henchman" ? "Group experience (per model)" : "Experience"}</h3>
      <p>Mark one box per XP earned. Double-bordered boxes earn an advancement.</p>
      <div className={`print-experience-track ${role === "Hero" ? "is-hero" : "is-henchman"}`}>
        {Array.from({ length: getMaximumExperience(role) }, (_, index) => {
          const point = index + 1;
          const earned = point <= current;
          const advance = thresholds.includes(point);
          return <span key={point}
            className={`print-experience-point${advance ? " is-advance" : ""}${earned ? " is-earned" : ""}`}
            aria-label={`${point} XP${advance ? ", advancement" : ""}${earned ? ", earned" : ""}`}>
            {earned ? "X" : point}
          </span>;
        })}
      </div>
    </section>
  );
}
