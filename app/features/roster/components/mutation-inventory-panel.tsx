import { useState } from "react";
import type { MutationInventory } from "../types";
import { MutationSelection, mutationSelectionCost } from "./mutation-selection";

export function MutationInventoryPanel({ data, treasury, onSave }: {
  data: MutationInventory;
  treasury: string;
  onSave: (mutationIds: string[]) => Promise<boolean>;
}) {
  const [mutationIds, setMutationIds] = useState(data.entries.map((entry) => entry.mutationId));
  const [saving, setSaving] = useState(false);
  const adjustment = mutationSelectionCost(data.availableOptions, mutationIds) - data.totalCost;
  const changed = mutationIds.join(",") !== data.entries.map((entry) => entry.mutationId).join(",");
  async function save() {
    setSaving(true);
    try {
      await onSave(mutationIds);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="mutation-inventory" aria-label="Mutation special equipment">
      <div className="equipment-inventory-heading"><span className="equipment-inventory-label">SPECIAL EQUIPMENT</span><strong>Mutations</strong></div>
      {data.required && data.entries.length === 0 && <p className="equipment-error" role="alert">This Mutant is missing a required mutation.{!data.canEdit && " Campaign mutations must be selected at recruitment; remove and re-hire to correct this warrior."}</p>}
      {data.canEdit ? (
        <>
          <MutationSelection options={data.availableOptions} mutationIds={mutationIds} disabled={saving} onChange={setMutationIds} />
          <p className="heading-note">Freebuild changes reprice the selected mutations and charge or refund the difference.</p>
          <button type="button" className="equipment-buy-button" disabled={saving || !changed || adjustment > Number(treasury)} onClick={() => void save()}>
            {saving ? "Saving..." : `Save mutations · ${adjustment < 0 ? `refund ${-adjustment}` : `cost ${adjustment}`} GC`}
          </button>
          {adjustment > Number(treasury) && <p className="equipment-error" role="alert">Not enough GC for these mutations.</p>}
        </>
      ) : (
        <>
          <p className="heading-note">Permanent recruitment mutations · cannot be bought, sold, or transferred during a campaign.</p>
          {data.entries.map((entry) => <div className="equipment-owned-item" key={entry.id}><div className="equipment-owned-item-main"><strong>{entry.name} · {entry.unitCostPaid} GC</strong><p className="equipment-stats-rule">{entry.effectText}</p><small>{entry.sourceReference}</small></div></div>)}
          {!data.entries.length && <p className="equipment-state">No mutations recorded.</p>}
        </>
      )}
    </section>
  );
}
