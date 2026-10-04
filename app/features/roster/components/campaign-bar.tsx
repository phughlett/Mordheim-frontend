import { useState } from "react";
import type { Roster } from "../types";

interface CampaignBarProps {
  roster: Roster;
  onChange: (roster: Roster) => void;
  onError: (message: string) => void;
  request: (path: string, method: string, body: unknown) => Promise<Roster>;
}

export function CampaignBar({ roster, onChange, onError, request }: CampaignBarProps) {
  const [busy, setBusy] = useState(false);
  const [scenario, setScenario] = useState("");
  const campaign = roster.campaign;
  if (!roster.id || !campaign) return null;

  async function send(action: "advance" | "reopen", body?: object) {
    setBusy(true);
    onError("");
    try {
      onChange(await request(`/rosters/${roster.id}/campaign/${action}`, "POST", body ?? {}));
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : "Could not change the campaign step.");
    } finally {
      setBusy(false);
    }
  }

  const steps = campaign.phase === "pre_battle" ? campaign.preBattleSteps : campaign.phase === "post_battle" ? campaign.postBattleSteps : campaign.phase === "battle" ? campaign.battlePhases : [];
  const chosenScenario = scenario || campaign.scenario || "";

  return (
    <section className={`campaign-bar campaign-${campaign.phase}`} aria-label="Campaign sequence">
      <div className="campaign-summary">
        <div className="eyebrow">{roster.campaignName ? `${roster.campaignName.toUpperCase()} · ` : ""}{campaign.phaseLabel.toUpperCase()} · BATTLES FOUGHT {campaign.battlesFought}</div>
        <strong>{campaign.phase === "battle" ? `Round ${campaign.battleTurn} · Phase ${campaign.step} of ${steps.length}: ` : steps.length > 0 ? `Step ${campaign.step} of ${steps.length}: ` : ""}{campaign.stepLabel}</strong>
        <p>{campaign.stepDescription}</p>
        {campaign.scenario && campaign.phase !== "setup" && <p className="campaign-scenario">Scenario: {campaign.scenario}</p>}
      </div>
      {steps.length > 0 && (
        <ol className="campaign-steps">
          {steps.map((label, index) => (
            <li key={label} className={index + 1 === campaign.step ? "current" : index + 1 < campaign.step ? "done" : ""}>{label}</li>
          ))}
        </ol>
      )}
      <div className="campaign-actions">
        {campaign.phase === "pre_battle" && campaign.step === 1 && (
          <select aria-label="Scenario" value={chosenScenario} onChange={(event) => setScenario(event.target.value)} disabled={busy}>
            <option value="">Choose scenario</option>
            {campaign.scenarios.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        )}
        {campaign.canReopen && <button className="outline-button" type="button" disabled={busy} onClick={() => send("reopen")}>Reopen roster</button>}
        {campaign.phase === "battle" && <span className="campaign-hint">Advance the battle from the Battle panel.</span>}
        {campaign.phase === "pre_battle" && campaign.step === steps.length && <span className="campaign-hint">Ready — start the battle from the Battle panel.</span>}
        {campaign.phase !== "battle" && !(campaign.phase === "pre_battle" && campaign.step === steps.length) && <button
          className="primary-button"
          type="button"
          disabled={busy || (campaign.phase === "pre_battle" && campaign.step === 1 && !chosenScenario)}
          onClick={() => send("advance", campaign.phase === "pre_battle" && campaign.step === 1 ? { scenario: chosenScenario } : undefined)}
        >{campaign.nextLabel}</button>}
      </div>
    </section>
  );
}
