import type { Roster } from "../types";

interface RosterFieldsProps {
  roster: Roster;
  onUpdate: (changes: Partial<Roster>) => void;
}

export function RosterFields({ roster, onUpdate }: RosterFieldsProps) {
  return (
    <div className="roster-meta">
      <div className="overview-warband">
        <span>WARBAND</span>
        <strong>{roster.warband || "No warband selected"}</strong>
      </div>
      <label className="meta-field overview-treasury">
        <span>Gold Crowns</span>
        <input disabled={!roster.id || Boolean(roster.campaignId)} inputMode="numeric" value={roster.treasury} onChange={(event) => onUpdate({ treasury: event.target.value.replace(/[^0-9]/g, "") })} />
      </label>
      <label className="meta-field overview-wyrdstone">
        <span>Wyrdstone</span>
        <input disabled={!roster.id || Boolean(roster.campaignId)} inputMode="numeric" value={roster.wyrdstone} onChange={(event) => onUpdate({ wyrdstone: event.target.value.replace(/[^0-9]/g, "") })} />
      </label>
    </div>
  );
}
