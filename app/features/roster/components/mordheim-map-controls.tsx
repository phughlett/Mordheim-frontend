import { useState } from "react";
import type { InventoryEntry, MapSelection, MordheimMapType } from "../types";

export interface MapInput {
  mode: "choose" | "manual" | "simulated";
  type: string;
  dice: string;
}

export const defaultMapInput: MapInput = { mode: "simulated", type: "fake", dice: "" };

export function mapSelection(input: MapInput, quantity: number): MapSelection {
  if (input.mode === "choose") return { mode: "choose", type: input.type };
  if (input.mode === "simulated") return { mode: "simulated" };
  const values = input.dice.split(",").map((part) => part.trim());
  const dice = values.map(Number);
  if (values.length !== quantity || values.some((value) => !value)
    || dice.some((die) => !Number.isInteger(die) || die < 1 || die > 6)) {
    throw new Error(`Enter exactly ${quantity} map D6 result${quantity === 1 ? "" : "s"} (1-6), separated by commas.`);
  }
  return { mode: "manual", dice };
}

export function MordheimMapControls({ types, value, enabled, onChange }: {
  types: MordheimMapType[];
  value: MapInput;
  enabled: boolean;
  onChange: (value: MapInput) => void;
}) {
  return <div className="trading-quote">
    <strong>Mordheim map type</strong>
    <label className="equipment-field"><span>DETERMINE TYPE</span><select aria-label="Map type mode" value={value.mode} disabled={!enabled} onChange={(event) => {
      const mode = event.target.value;
      if (mode === "choose" || mode === "manual" || mode === "simulated") onChange({ ...value, mode });
    }}>
      <option value="simulated">Roll D6 automatically</option>
      <option value="manual">Enter rolled D6</option>
      <option value="choose">Choose type manually</option>
    </select></label>
    {value.mode === "choose" && <label className="equipment-field"><span>MAP TYPE</span><select aria-label="Mordheim map type" value={value.type} disabled={!enabled} onChange={(event) => onChange({ ...value, type: event.target.value })}>
      {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
    </select></label>}
    {value.mode === "manual" && <label className="equipment-field"><span>MAP D6 (one per copy, comma separated)</span><input aria-label="Map type dice" value={value.dice} disabled={!enabled} onChange={(event) => onChange({ ...value, dice: event.target.value })} /></label>}
    <small>Map dice are separate from price and rarity rolls. Each copy gets its own result.</small>
    <ul>{types.map((type) => <li key={type.id}><strong>{type.rolls.join("-")} · {type.name}:</strong> {type.effect}</li>)}</ul>
    <small>Scenario and exploration effects are resolved at the tabletop, not automatically.</small>
  </div>;
}

export function MapResult({ entry }: { entry: InventoryEntry }) {
  return entry.mapResult ? <small>{entry.mapResult.roll === null ? "Type chosen manually" : `Map D6: ${entry.mapResult.roll} (${entry.mapResult.mode === "manual" ? "entered" : "simulated"})`}</small> : null;
}

export function UnresolvedMap({ entry, types, enabled, onResolve }: {
  entry: InventoryEntry;
  types: MordheimMapType[];
  enabled: boolean;
  onResolve: (input: MapInput) => Promise<void>;
}) {
  const [value, setValue] = useState(defaultMapInput);
  if (entry.shopItemId !== "mordheim-map" || entry.mapResult) return null;
  return <div>
    <small>This map's type has not been recorded.</small>
    <MordheimMapControls types={types} value={value} enabled={enabled} onChange={setValue} />
    <button className="outline-button" type="button" disabled={!enabled} onClick={() => void onResolve(value)}>Record type for one map</button>
  </div>;
}
