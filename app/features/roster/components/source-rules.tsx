import type { SourceRule, WarbandGrade } from "../types";

export function gradeLabel(grade: WarbandGrade) {
  return grade === "core" ? "Core" : grade.toUpperCase();
}

export function SourceRules({ title = "Special rules", rules = [], sourceUrl, grade }: {
  title?: string;
  rules?: SourceRule[];
  sourceUrl?: string | null;
  grade?: WarbandGrade | null;
}) {
  if (!rules.length && !sourceUrl && !grade) return null;
  return (
    <details className="heading-note">
      <summary>{title}{grade ? ` · ${gradeLabel(grade)}` : ""}</summary>
      {rules.length > 0 && <p>Reference summaries only; resolve special-rule effects manually.</p>}
      {rules.map((rule) => <p key={rule.name}><strong>{rule.name}:</strong> {rule.summary}</p>)}
      {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">View full warband source</a>}
    </details>
  );
}
