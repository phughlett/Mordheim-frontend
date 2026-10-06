import { useState, type FormEvent } from "react";
import type { CampaignOption, WarbandOption } from "../types";
import { gradeLabel, SourceRules } from "./source-rules";

interface NewRosterDialogProps {
  open: boolean;
  submitting: boolean;
  warbands: WarbandOption[];
  campaign: CampaignOption | null;
  onCancel: () => void;
  onSubmit: (warbandId: string, gc?: number) => void;
}

export function NewRosterDialog({ open, submitting, warbands, campaign, onCancel, onSubmit }: NewRosterDialogProps) {
  const [warbandId, setWarbandId] = useState("");
  const [gc, setGc] = useState("500");
  if (!open || !campaign) return null;
  const selected = warbands.find((warband) => warband.id === warbandId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!warbandId) return;
    if (campaign?.id === "freebuild") onSubmit(warbandId, Number(gc));
    else onSubmit(warbandId);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="new-roster-dialog" role="dialog" aria-modal="true" aria-labelledby="new-roster-title">
        <form onSubmit={handleSubmit}>
          <div className="eyebrow">{campaign.name.toUpperCase()}</div>
          <h2 id="new-roster-title">New warband</h2>
          <label className="detail-field">
            <span>WARBAND</span>
            <select autoFocus required value={warbandId} onChange={(event) => setWarbandId(event.target.value)}>
              <option value="">Select a warband</option>
              {warbands.map((warband) => <option key={warband.id} value={warband.id}>
                {warband.displayName ?? warband.name}{warband.grade ? ` · ${gradeLabel(warband.grade)}` : ""}
              </option>)}
            </select>
          </label>
          {selected && <SourceRules title="Warband rules" rules={selected.specialRules} grade={selected.grade} sourceUrl={selected.sourceUrl} />}
          {campaign.id === "freebuild" ? (
            <label className="detail-field">
              <span>STARTING GC</span>
              <input required type="number" min={0} step={1} value={gc} onChange={(event) => setGc(event.target.value)} />
            </label>
          ) : <p className="heading-note">Every warband in this campaign starts with {campaign.maxGc} GC.</p>}
          <div className="new-roster-dialog-actions">
            <button className="outline-button" type="button" disabled={submitting} onClick={onCancel}>Cancel</button>
            <button className="primary-button" type="submit" disabled={submitting || !warbandId || (campaign.id === "freebuild" && !(Number.isSafeInteger(Number(gc)) && gc !== "" && Number(gc) >= 0))}>
              {submitting ? "Creating..." : "Create warband"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
