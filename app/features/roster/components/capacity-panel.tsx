import type { RosterCapacity } from "../types";

interface CapacityPanelProps {
  capacity: RosterCapacity;
}

export function CapacityPanel({ capacity }: CapacityPanelProps) {
  return (
    <div className="overview-capacity" role="group" aria-label="Roster limits">
      <div className="capacity-summary">
        <span className="capacity-label">LIMITS</span>
        <strong>{capacity.currentMembers}/{capacity.maxMembers} warriors <span>·</span> max {capacity.maxHeroes} Heroes</strong>
        <small>{capacity.limitsRule} {capacity.limitsSourceReference}</small>
        {capacity.memberTypeBonus > 0 && <small>Hired Sword size bonus: +{capacity.memberTypeBonus} warrior(s).</small>}
        <small>{capacity.leader ? `Leader: ${capacity.leader.name}` : "No Hero available to lead this warband."}</small>
        {capacity.currentMembers > capacity.maxMembers && <small role="alert">Over capacity: reduce the warband to {capacity.maxMembers} warriors before recruiting more.</small>}
      </div>
    </div>
  );
}
