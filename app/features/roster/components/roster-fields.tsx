import { useId } from "react";
import type { Roster } from "../types";

interface WarbandCurrencyProps {
  roster: Roster;
  onUpdate: (changes: Partial<Roster>) => void;
  readOnly?: boolean;
}

export function RosterFields({ roster, onUpdate, readOnly = false }: WarbandCurrencyProps) {
  return (
    <div className="overview-warband">
      <label className="detail-field">
        <span>WARBAND NAME</span>
        <input
          className="warband-name-input"
          aria-label="Warband roster name"
          value={roster.name}
          disabled={!roster.id || readOnly}
          placeholder="No warband selected"
          onChange={(event) => onUpdate({ name: event.target.value })}
        />
      </label>
      <span>WARBAND</span>
      <strong>{roster.warband || "No warband selected"}</strong>
      {!roster.campaignId && <label className="detail-field">
        <span>BATTLES FOUGHT</span>
        <input aria-label="Battles fought" type="number" min={0} max={2147483647} step={1}
          value={roster.battlesFought ?? 0} disabled={!roster.id || readOnly}
          onChange={(event) => {
            const count = event.target.valueAsNumber;
            if (Number.isSafeInteger(count) && count >= 0 && count <= 2147483647) onUpdate({ battlesFought: count });
          }} />
      </label>}
    </div>
  );
}

export function WarbandCurrency({ roster, onUpdate, readOnly = false }: WarbandCurrencyProps) {
  const hintId = useId();
  const editable = Boolean(roster.id) && !roster.campaignId && !readOnly;

  return (
    <>
    <div className="stash-currency" role="group" aria-label="Warband currency">
      <label className="meta-field overview-treasury">
        <span>Gold Crowns</span>
        <input disabled={!editable} aria-describedby={editable ? hintId : undefined} inputMode="numeric" value={roster.treasury} onChange={(event) => onUpdate({ treasury: event.target.value.replace(/[^0-9]/g, "") })} />
      </label>
      <label className="meta-field overview-wyrdstone">
        <span>Wyrdstone</span>
        <input disabled={!editable} aria-describedby={editable ? hintId : undefined} inputMode="numeric" value={roster.wyrdstone} onChange={(event) => onUpdate({ wyrdstone: event.target.value.replace(/[^0-9]/g, "") })} />
      </label>
    </div>
    {editable && <p className="currency-edit-hint" id={hintId}>Freebuild: click or tap either balance to edit. Changes save automatically.</p>}
    </>
  );
}
