import { useState } from "react";
import type { WarriorTypeOption } from "../types";
import { MutationSelection, mutationSelectionCost } from "./mutation-selection";

export function MutationHireDialog({ type, treasury, freebuild, error, onCancel, onHire }: {
  type: WarriorTypeOption;
  treasury: string;
  freebuild: boolean;
  error: string;
  onCancel: () => void;
  onHire: (mutationIds: string[]) => Promise<boolean>;
}) {
  const [mutationIds, setMutationIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const total = (type.hireCost ?? 0) + mutationSelectionCost(type.mutationOptions, mutationIds);
  const missingRequired = type.mutationRequired && mutationIds.length === 0;
  async function hire() {
    setSubmitting(true);
    try {
      await onHire(mutationIds);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="new-roster-dialog mutation-hire-dialog" role="dialog" aria-modal="true" aria-labelledby="mutation-hire-title">
        <h2 id="mutation-hire-title">Recruit {type.name}</h2>
        <p className="heading-note">{type.mutationRequired ? "Mutants require at least one mutation." : "Possessed may choose optional mutations."} {freebuild ? "Freebuild allows later editing." : "Campaign mutations are permanent after recruitment and cannot be sold."}</p>
        <MutationSelection options={type.mutationOptions} mutationIds={mutationIds} disabled={submitting} onChange={setMutationIds} />
        <p>Hire fee {type.hireCost} GC + mutations = <strong>{total} GC</strong> · available {treasury} GC</p>
        {total > Number(treasury) && <p className="equipment-error" role="alert">Not enough GC for this recruitment.</p>}
        {error && <p className="equipment-error" role="alert">{error}</p>}
        <div className="new-roster-dialog-actions">
          <button type="button" className="outline-button" disabled={submitting} onClick={onCancel}>Cancel</button>
          <button type="button" className="primary-button" disabled={submitting || total > Number(treasury) || (!freebuild && missingRequired)} onClick={() => void hire()}>
            {submitting ? "Hiring..." : `Hire ${type.name} · ${total} GC`}
          </button>
        </div>
      </section>
    </div>
  );
}
