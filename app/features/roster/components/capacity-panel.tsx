import type { RosterCapacity } from "../types";

interface CapacityPanelProps {
  capacity: RosterCapacity;
  onToggleModifier: (modifierId: string, enabled: boolean) => void;
}

export function CapacityPanel({ capacity, onToggleModifier }: CapacityPanelProps) {
  return (
    <div className="overview-capacity" role="group" aria-label="Roster limits and capacity items">
      <div className="capacity-summary">
        <span className="capacity-label">LIMITS</span>
        <strong>{capacity.currentMembers}/{capacity.maxMembers} warriors <span>·</span> max {capacity.maxHeroes} Heroes</strong>
        <small>{capacity.limitsRule} {capacity.limitsSourceReference}</small>
        {capacity.memberTypeBonus > 0 && <small>Hired Sword size bonus: +{capacity.memberTypeBonus} warrior(s).</small>}
      </div>
      {capacity.availableModifiers.length > 0 && <fieldset className="capacity-modifiers">
        <legend>CAPACITY ITEM</legend>
        {capacity.availableModifiers.map((modifier) => (
          <label className="capacity-modifier" key={modifier.id}>
            <input
              type="checkbox"
              checked={capacity.selectedModifiers.some((selected) => selected.id === modifier.id)}
              onChange={(event) => onToggleModifier(modifier.id, event.target.checked)}
            />
            <span>{modifier.name}</span>
            <small>+{modifier.member_limit_bonus} member</small>
          </label>
        ))}
      </fieldset>}
    </div>
  );
}
