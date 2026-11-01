import { useState } from "react";
import type { WarriorSpellsData } from "../types";

export function ConsumedTomeCorrections({ memberId, uses = [], request, onChanged }: {
  memberId: string; uses?: WarriorSpellsData["consumedTomes"];
  request: <T>(path: string, method?: string, body?: unknown) => Promise<T>; onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!uses.some((use) => use.canCancel)) return null;
  return <section className="advancement-panel" aria-label="Consumed Tome corrections">
    <strong>Consumed Tome of Magic</strong>
    <p>Cancel before the next battle to remove the magic gained from this Tome and release its spell advances.</p>
    {uses.filter((use) => use.canCancel).map((use) => <button key={use.id} className="outline-button" type="button" disabled={busy}
      onClick={async () => {
        if (!window.confirm("Cancel this Tome use and remove the spells gained from it?")) return;
        setBusy(true); setError("");
        try { await request(`/members/${memberId}/spells/tomes/${use.id}`, "DELETE"); await onChanged(); }
        catch (error) { setError(error instanceof Error ? error.message : "Could not cancel this Tome use."); }
        finally { setBusy(false); }
      }}>{use.refundAmount !== null ? `Cancel Tome purchase · refund ${use.refundAmount} GC` : "Undo Tome use · restore item"}</button>)}
    {error && <p role="alert" className="skills-error">{error}</p>}
  </section>;
}
