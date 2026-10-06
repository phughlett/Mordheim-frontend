import { useState } from "react";
import type { AdvancePurchaseOptions, PurchaseAdvanceInput, StatLabel } from "../types";

export function AdvancePurchasePanel({ data, treasury, onPurchase }: {
  data: AdvancePurchaseOptions;
  treasury: string;
  onPurchase: (input: PurchaseAdvanceInput) => Promise<boolean>;
}) {
  const [stat, setStat] = useState<StatLabel | "">("");
  const [skillId, setSkillId] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  async function purchase(input: PurchaseAdvanceInput) {
    setPurchasing(true);
    try {
      if (await onPurchase(input)) {
        setStat("");
        setSkillId("");
      }
    } finally {
      setPurchasing(false);
    }
  }
  if (!data.enabled) return null;
  const selected = data.stats.find((choice) => choice.stat === stat);
  return (
    <section className="advance-purchases" aria-label="Purchased advancements">
      <strong>Buy advancements · roster creation only</strong>
      <p className="advancement-rules">Every stat or skill purchase advances XP to the next Hero threshold and records the paid cost. Refund by undoing the latest purchased award; later advances must be undone first.</p>
      {!data.canPurchase ? <p className="skills-state">{data.pendingAdvances ? "Resolve pending advances before buying." : "The Hero experience track is full."}</p> : (
        <>
          <p className="advancement-rules">Next purchase advances experience to {data.nextExperience} XP.</p>
          <div className="advancement-actions">
            <label className="skills-field"><span>PURCHASE CHARACTERISTIC</span><select value={stat} disabled={purchasing} onChange={(event) => setStat(event.target.value as StatLabel | "")}>
              <option value="">Choose characteristic</option>
              {data.stats.map((choice) => <option key={choice.stat} value={choice.stat} disabled={!choice.available}>
                {choice.stat} +1 · {choice.cost} GC · {choice.purchasedCount}{choice.maxIncreases === null ? "" : `/${choice.maxIncreases}`} purchased{choice.racialMaximum === null ? "" : ` · racial max ${choice.racialMaximum}`}
              </option>)}
            </select></label>
            <button type="button" className="skills-learn-button" disabled={purchasing || !selected?.available || selected.cost > Number(treasury)} onClick={() => stat && void purchase({ stat })}>Buy stat{selected ? ` · ${selected.cost} GC` : ""}</button>
          </div>
          {data.skillsEnabled ? <>
          <p className="advancement-rules">Purchased skills remaining: {data.skillAllowance} (one per purchased stat increase). Choose from this Hero's normal skill lists.</p>
          <div className="advancement-actions">
            <label className="skills-field"><span>PURCHASE SKILL</span><select value={skillId} disabled={purchasing || data.availableSkills.length === 0} onChange={(event) => setSkillId(event.target.value)}>
              <option value="">Choose eligible skill</option>
              {data.availableSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name} · {skill.category}</option>)}
            </select></label>
            <button type="button" className="skills-learn-button" disabled={purchasing || data.skillCost > Number(treasury) || !data.availableSkills.some((skill) => skill.id === skillId)} onClick={() => void purchase({ skillId })}>Buy skill · {data.skillCost} GC</button>
          </div>
          {data.availableSkills.find((skill) => skill.id === skillId)?.description && <p className="advancement-rules">{data.availableSkills.find((skill) => skill.id === skillId)?.description}</p>}
          </> : <p className="advancement-rules">Skill purchases are disabled for this campaign. Characteristic purchases remain available.</p>}
          {((selected?.cost ?? 0) > Number(treasury) || (data.skillsEnabled && skillId && data.skillCost > Number(treasury))) && <p className="skills-error">Not enough GC for the selected purchase.</p>}
        </>
      )}
    </section>
  );
}
