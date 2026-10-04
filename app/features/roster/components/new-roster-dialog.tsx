import { useState, type FormEvent } from "react";
import type { CampaignOption, WarbandOption } from "../types";

interface NewRosterDialogProps {
  open: boolean;
  submitting: boolean;
  warbands: WarbandOption[];
  campaign: CampaignOption | null;
  onCancel: () => void;
  onSubmit: (warbandId: string) => void;
}

export function NewRosterDialog({ open, submitting, warbands, campaign, onCancel, onSubmit }: NewRosterDialogProps) {
  const [warbandId, setWarbandId] = useState("");
  if (!open || !campaign) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (warbandId) onSubmit(warbandId);
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
              {warbands.map((warband) => <option key={warband.id} value={warband.id}>{warband.name}</option>)}
            </select>
          </label>
          <p className="heading-note">Every warband in this campaign starts with {campaign.maxGc} GC.</p>
          <div className="new-roster-dialog-actions">
            <button className="outline-button" type="button" disabled={submitting} onClick={onCancel}>Cancel</button>
            <button className="primary-button" type="submit" disabled={submitting || !warbandId}>
              {submitting ? "Creating..." : "Create warband"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
