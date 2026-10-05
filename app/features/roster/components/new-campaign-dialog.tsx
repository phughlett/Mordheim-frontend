import { useState, type FormEvent } from "react";
import { statLabels, type AdvancePurchaseRules } from "../types";

const defaultPrices = {
  M: [15, 15], WS: [15, 15], BS: [15, 15], S: [25, 35], T: [30, 45],
  W: [20, 30], I: [10, 10], A: [25, 35], Ld: [15, 15],
};
const statNames = {
  M: "Movement", WS: "Weapon Skill", BS: "Ballistic Skill", S: "Strength", T: "Toughness",
  W: "Wounds", I: "Initiative", A: "Attacks", Ld: "Leadership",
};

function initialRules(): AdvancePurchaseRules {
  return {
    enabled: false, skillCost: 40,
    stats: {
      M: { firstCost: 15, additionalCost: 15, maxIncreases: null },
      WS: { firstCost: 15, additionalCost: 15, maxIncreases: null },
      BS: { firstCost: 15, additionalCost: 15, maxIncreases: null },
      S: { firstCost: 25, additionalCost: 35, maxIncreases: null },
      T: { firstCost: 30, additionalCost: 45, maxIncreases: null },
      W: { firstCost: 20, additionalCost: 30, maxIncreases: null },
      I: { firstCost: 10, additionalCost: 10, maxIncreases: null },
      A: { firstCost: 25, additionalCost: 35, maxIncreases: null },
      Ld: { firstCost: 15, additionalCost: 15, maxIncreases: null },
    },
  };
}

export function NewCampaignDialog({ error, onCancel, onSubmit }: {
  error: string;
  onCancel: () => void;
  onSubmit: (name: string, maxGc: number, rules: AdvancePurchaseRules) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [maxGc, setMaxGc] = useState("500");
  const [rules, setRules] = useState(initialRules);
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (await onSubmit(name.trim(), Number(maxGc), rules)) onCancel();
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="new-roster-dialog new-campaign-dialog" role="dialog" aria-modal="true" aria-labelledby="new-campaign-title">
        <form onSubmit={(event) => void submit(event)}>
          <h2 id="new-campaign-title">New campaign</h2>
          <label className="detail-field"><span>CAMPAIGN NAME</span><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="detail-field"><span>MAXIMUM GC</span><input required type="number" min={0} max={100000} step={1} value={maxGc} onChange={(event) => setMaxGc(event.target.value)} /></label>
          <label className="purchase-toggle"><input type="checkbox" checked={rules.enabled} onChange={(event) => setRules({ ...rules, enabled: event.target.checked })} />Allow purchased stats and skills during roster creation</label>
          {rules.enabled && <>
            <p className="heading-note">Heroes only. Each purchase raises XP to the next Hero advancement threshold. One skill purchase is allowed per purchased stat increase. Existing racial limits and the 90 XP track remain enforced. Blank maximum means no purchase-count cap; 0 disables that characteristic.</p>
            <div className="purchase-rules-grid">
              <strong>Characteristic</strong><strong>First GC</strong><strong>Further GC</strong><strong>Max increases</strong>
              {statLabels.map((stat) => (
                <div className="purchase-rule-row" key={stat}>
                  <span>{statNames[stat]}</span>
                  {(["firstCost", "additionalCost", "maxIncreases"] as const).map((field) => (
                    <input key={field} aria-label={`${statNames[stat]} ${field === "firstCost" ? "first price" : field === "additionalCost" ? "additional price" : "maximum purchases"}`}
                      required={field !== "maxIncreases"} type="number" min={0} max={field === "maxIncreases" ? 21 : 100000} step={1}
                      value={rules.stats[stat][field] ?? ""} placeholder={field === "maxIncreases" ? "No cap" : String(defaultPrices[stat][field === "firstCost" ? 0 : 1])}
                      onChange={(event) => setRules({
                        ...rules, stats: { ...rules.stats, [stat]: { ...rules.stats[stat], [field]: field === "maxIncreases" && event.target.value === "" ? null : Number(event.target.value) } },
                      })}
                    />
                  ))}
                </div>
              ))}
            </div>
            <label className="detail-field"><span>SKILL PRICE GC</span><input aria-label="Skill price GC" required type="number" min={0} max={100000} step={1} value={rules.skillCost} onChange={(event) => setRules({ ...rules, skillCost: Number(event.target.value) })} /></label>
          </>}
          <div className="new-roster-dialog-actions">
            <button className="outline-button" type="button" disabled={submitting} onClick={onCancel}>Cancel</button>
            <button className="primary-button" type="submit" disabled={submitting || !name.trim() || maxGc === ""}>{submitting ? "Creating..." : "Create campaign"}</button>
          </div>
          {error && <p className="equipment-error" role="alert">{error}</p>}
        </form>
      </section>
    </div>
  );
}
