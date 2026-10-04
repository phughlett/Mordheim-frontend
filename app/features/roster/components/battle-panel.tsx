import { useCallback, useEffect, useRef, useState } from "react";
import type { Roster } from "../types";

interface Participant {
  rosterId: string;
  name: string;
  warband: string;
  team: "A" | "B";
  ready: boolean;
  player: string | null;
}

interface Battle {
  id: string;
  format: "1v1" | "2v2";
  status: "forming" | "active" | "finished";
  teamSize: number;
  participants: Participant[];
  round: number | null;
  firstTeam: "A" | "B";
  activeTeam: "A" | "B" | null;
  phase: number | null;
  phaseLabel: string | null;
  nextLabel: string | null;
}

interface BattlePanelProps {
  campaignId: string;
  rosters: Roster[];
  request: <T>(path: string, method?: string, body?: unknown) => Promise<T>;
  onRostersChanged: () => Promise<void>;
  onError: (message: string) => void;
}

export function BattlePanel({ campaignId, rosters, request, onRostersChanged, onError }: BattlePanelProps) {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [busy, setBusy] = useState(false);
  const stageKey = rosters.map((item) => `${item.id}:${item.campaign?.phase}:${item.campaign?.step}`).join("|");

  const load = useCallback(async () => {
    try {
      setBattles(await request<Battle[]>(`/campaigns/${campaignId}/battles`));
    } catch (loadError) {
      onError(loadError instanceof Error ? loadError.message : "Could not load battles.");
    }
  }, [campaignId, request, onError]);

  useEffect(() => { void load(); }, [load, stageKey]);

  useEffect(() => {
    const timer = setInterval(() => { void load(); }, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const battleKey = battles.map((item) => `${item.id}:${item.status}:${item.round}:${item.activeTeam}:${item.phase}`).join("|");
  const seenKey = useRef<string | null>(null);
  useEffect(() => {
    if (seenKey.current !== null && seenKey.current !== battleKey) void onRostersChanged();
    seenKey.current = battleKey;
  }, [battleKey, onRostersChanged]);

  async function act(path: string, method: string, body?: unknown, refreshRosters = false) {
    setBusy(true);
    onError("");
    try {
      await request(path, method, body);
      if (refreshRosters) await onRostersChanged();
      await load();
    } catch (actionError) {
      onError(actionError instanceof Error ? actionError.message : "Battle action failed.");
    } finally {
      setBusy(false);
    }
  }

  const taken = new Set(battles.flatMap((battle) => battle.participants.map((entry) => entry.rosterId)));

  return (
    <section className="battle-panel" aria-label="Battles">
      <div className="battle-panel-head">
        <strong>Battles</strong>
        <div className="battle-panel-actions">
          <button className="outline-button" type="button" disabled={busy} onClick={() => act(`/campaigns/${campaignId}/battles`, "POST", { format: "1v1" })}>+ 1v1</button>
          <button className="outline-button" type="button" disabled={busy} onClick={() => act(`/campaigns/${campaignId}/battles`, "POST", { format: "2v2" })}>+ 2v2</button>
        </div>
      </div>
      {battles.length === 0 && <p className="battle-empty">Set up a battle, assign warbands to teams, then start it once every warband has finished the pre-battle sequence.</p>}
      {battles.map((battle) => {
        const available = rosters.filter((item) => !taken.has(item.id));
        return (
          <div key={battle.id} className={`battle-card battle-${battle.status}`}>
            <div className="battle-card-head">
              <strong>{battle.format} · {battle.status === "forming" ? "Choose teams" : `Round ${battle.round} · Team ${battle.activeTeam}'s turn · ${battle.phaseLabel}`}</strong>
              {battle.status === "forming" && <button className="outline-button" type="button" disabled={busy} onClick={() => act(`/battles/${battle.id}`, "DELETE")}>Remove</button>}
            </div>
            <div className="battle-teams">
              {(["A", "B"] as const).map((team) => {
                const members = battle.participants.filter((entry) => entry.team === team);
                return (
                  <div key={team} className={`battle-team${battle.status === "active" && battle.activeTeam === team ? " battle-team-active" : ""}`}>
                    <div className="eyebrow">
                      TEAM {team} · {members.length}/{battle.teamSize}
                      {battle.status === "active" && battle.activeTeam === team && <span className="turn-badge">▶ Active turn</span>}
                      {battle.status === "active" && battle.firstTeam === team && <span className="turn-badge turn-badge-muted">First</span>}
                    </div>
                    {members.map((entry) => (
                      <div key={entry.rosterId} className="battle-participant">
                        <span>{entry.name}{entry.player && <span className="battle-player">({entry.player})</span>}{battle.status === "forming" && !entry.ready ? " (finishing pre-battle)" : ""}</span>
                        {battle.status === "forming" && <button className="outline-button" type="button" disabled={busy} onClick={() => act(`/battles/${battle.id}/participants/${entry.rosterId}`, "DELETE")}>Remove</button>}
                      </div>
                    ))}
                    {battle.status === "forming" && members.length < battle.teamSize && (
                      <select aria-label={`Add warband to team ${team}`} value="" disabled={busy || available.length === 0} onChange={(event) => event.target.value && act(`/battles/${battle.id}/participants`, "PUT", { rosterId: event.target.value, team })}>
                        <option value="">Add warband…</option>
                        {available.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="battle-card-actions">
              {battle.status === "forming" && (
                <>
                  <button className="primary-button" type="button" disabled={busy} onClick={() => act(`/battles/${battle.id}/start`, "POST", { firstTeam: "A" }, true)}>Team A goes first</button>
                  <button className="primary-button" type="button" disabled={busy} onClick={() => act(`/battles/${battle.id}/start`, "POST", { firstTeam: "B" }, true)}>Team B goes first</button>
                </>
              )}
              {battle.status === "active" && (
                <>
                  <button className="outline-button" type="button" disabled={busy} onClick={() => act(`/battles/${battle.id}/advance`, "POST", { endBattle: true }, true)}>End battle</button>
                  <button className="primary-button" type="button" disabled={busy} onClick={() => act(`/battles/${battle.id}/advance`, "POST", {}, true)}>{battle.nextLabel}</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
