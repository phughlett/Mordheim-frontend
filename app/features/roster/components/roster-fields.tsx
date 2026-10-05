import { useId } from "react";
import type { Roster } from "../types";

interface RosterFieldsProps {
  roster: Roster;
  onUpdate: (changes: Partial<Roster>) => void;
  readOnly?: boolean;
}

export function RosterFields({ roster, onUpdate, readOnly = false }: RosterFieldsProps) {
  const hintId = useId();
  const editable = Boolean(roster.id) && !roster.campaignId && !readOnly;

  return (
    <div className="roster-meta">
      <div className="overview-warband">
        <span>WARBAND</span>
        <strong>{roster.warband || "No warband selected"}</strong>
      </div>
      <label className="meta-field overview-treasury">
        <span>Gold Crowns</span>
        <input disabled={!editable} aria-describedby={editable ? hintId : undefined} inputMode="numeric" value={roster.treasury} onChange={(event) => onUpdate({ treasury: event.target.value.replace(/[^0-9]/g, "") })} />
      </label>
      <label className="meta-field overview-wyrdstone">
        <span>Wyrdstone</span>
        <input disabled={!editable} aria-describedby={editable ? hintId : undefined} inputMode="numeric" value={roster.wyrdstone} onChange={(event) => onUpdate({ wyrdstone: event.target.value.replace(/[^0-9]/g, "") })} />
      </label>
      {editable && <p className="currency-edit-hint" id={hintId}>Freebuild: click or tap either balance to edit. Changes save automatically.</p>}
    </div>
  );
}
