import type { MutationOption } from "../types";

export function mutationSelectionCost(options: MutationOption[], mutationIds: string[]) {
  return mutationIds.reduce((total, id, index) => total + (options.find((option) => option.id === id)?.unitCost ?? 0) * (index === 0 ? 1 : 2), 0);
}

export function MutationSelection({ options, mutationIds, disabled, onChange }: {
  options: MutationOption[];
  mutationIds: string[];
  disabled: boolean;
  onChange: (mutationIds: string[]) => void;
}) {
  return (
    <div className="mutation-selection">
      <p className="heading-note">The first mutation costs its listed price; every additional mutation costs double. Effects are recorded as special equipment, not applied to the base stat profile.</p>
      <label className="detail-field">
        <span>ADD MUTATION</span>
        <select value="" disabled={disabled} onChange={(event) => onChange([...mutationIds, event.target.value])}>
          <option value="">Choose mutation</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.unitCost * (mutationIds.length ? 2 : 1)} GC</option>)}
        </select>
      </label>
      {mutationIds.map((id, index) => {
        const option = options.find((item) => item.id === id);
        if (!option) return null;
        return (
          <div className="equipment-owned-item" key={`${index}-${id}`}>
            <div className="equipment-owned-item-main">
              <strong>{option.name} · {option.unitCost * (index === 0 ? 1 : 2)} GC</strong>
              <p className="equipment-stats-rule">{option.effectText}</p>
              <small>{option.sourceReference}</small>
            </div>
            <button type="button" className="outline-button" disabled={disabled} aria-label={`Remove mutation ${index + 1}: ${option.name}`}
              onClick={() => onChange(mutationIds.filter((_, position) => position !== index))}>Remove</button>
          </div>
        );
      })}
      <strong>Mutation total: {mutationSelectionCost(options, mutationIds)} GC</strong>
    </div>
  );
}
