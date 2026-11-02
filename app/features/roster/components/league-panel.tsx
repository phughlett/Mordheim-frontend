import { useCallback, useEffect, useRef, useState } from "react";
import { apiBaseUrl, getToken } from "../../auth/auth";
import type { CampaignOption, OptionalRuleDefinition, WarbandOption } from "../types";
import { CampaignRulesSummary } from "./campaign-setup";

type Format = "1v1" | "2v2" | "teams" | "individual";
type Outcome = "win" | "loss" | "draw";
const fields = ["narrative", "terrain", "deployment", "rules", "victory", "experience", "rewards", "aftermath"] as const;
const labels = {
  narrative: "Background", terrain: "Terrain and objectives", deployment: "Deployment and turn order",
  rules: "Special rules and NPCs", victory: "Ending the game and victory conditions",
  experience: "Experience awards", rewards: "Treasure and rewards", aftermath: "After-action instructions",
};
interface Scenario extends Record<typeof fields[number], string> {
  id: string; name: string; format: Format; minPlayers: number; maxPlayers: number;
  source: string; shareCode?: string; documentUrl?: string;
}
interface Seat { playerId: string; rosterId: string; rosterName: string; team: "A" | "B" | null }
interface Result { playerId: string; outcome: Outcome; score: number | null }
interface Game { id: string; tableNumber: number; status: string; seats: Seat[]; results: Result[] | null; notes: string }
interface Round {
  id: string; number: number; status: "scheduled" | "active" | "completed";
  scenario: Scenario; startsAt: string; endsAt: string; timezone: string; location: string;
  tables: string[][]; absences: string[]; games: Game[];
  absenceNotes: Record<string, { notes?: string; recordedAt?: string; award?: { gold: number; requestedExperience: number; experienceAwards: { memberId: string; name: string; experience: number }[] } }>;
}
interface LeagueRoster {
  id: string; name: string; rating: number; user_id: string; league_retired: boolean;
  campaign_phase: string; campaign_step: number;
}
interface League {
  enabled: boolean; finished: boolean; isCommissioner: boolean; commissionerId: string; userId: string;
  scenarioLimit: number | null; houseRules: string; maxWarbandsPerPlayer: number | null;
  allowedWarbandIds: string[]; rounds: Round[];
  members: { id: string; username: string }[];
  standings: { id: string; username: string; wins: number; losses: number; draws: number; score: number }[];
  rosters: LeagueRoster[];
}
const blankScenario: Omit<Scenario, "id"> = {
  name: "", format: "teams", minPlayers: 2, maxPlayers: 4, narrative: "", terrain: "", deployment: "",
  rules: "", victory: "", experience: "", rewards: "", aftermath: "", source: "",
};
type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;

function ScenarioDetails({ scenario }: { scenario: Scenario }) {
  return <details>
    <summary>{scenario.name}: scenario rules and awards</summary>
    <p>{scenario.format === "individual" ? "Individual results" : scenario.format === "teams" ? "Teams assigned at the event" : scenario.format} · {scenario.minPlayers}–{scenario.maxPlayers} players per table</p>
    {fields.map((field) => scenario[field] && <section key={field}><h4>{labels[field]}</h4><p className="league-prose">{scenario[field]}</p></section>)}
    <p>{scenario.source}</p>
    {scenario.documentUrl && <a className="outline-button" href={scenario.documentUrl} download>Original document with maps and tables (.docx)</a>}
    <p>These are tabletop instructions. NPCs, currencies, XP, gold, mercenaries and rewards are not automatically simulated or awarded.</p>
  </details>;
}

function TableControls({ game, round, league, playerName, request, act }: {
  game: Game; round: Round; league: CampaignLeague; playerName: (id: string) => string;
  request: Request; act: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [teams, setTeams] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, { outcome: Outcome | ""; score: string }>>({});
  const [notes, setNotes] = useState("");
  const canManage = league.isCommissioner || game.seats.some((s) => s.playerId === league.userId);
  const base = `/campaigns/${league.campaignId}/tables/${game.id}`;
  return <div className="league-game">
    <h4>Table {game.tableNumber} · {game.status}</h4>
    <ul>{game.seats.map((seat) => {
      const result = game.results?.find((r) => r.playerId === seat.playerId);
      return <li key={seat.playerId}><strong>{playerName(seat.playerId)}</strong> · {seat.rosterName}{seat.team && ` · Team ${seat.team}`}
        {result && ` · ${result.outcome}${result.score !== null ? ` · score ${result.score}` : ""}`}
      </li>;
    })}</ul>
    {game.notes && <p className="league-prose">{game.notes}</p>}
    {canManage && game.status === "preparing" && <div>
      {round.scenario.format !== "individual" && <form className="league-form" onSubmit={(event) => {
        event.preventDefault();
        void act(() => request(`${base}/teams`, "POST", { teams: game.seats.map((s) => ({ playerId: s.playerId, team: teams[s.playerId] ?? s.team ?? "" })) }));
      }}>
        <p className="league-wide">Roll or agree teams at the table, then record them here. Flexible team scenarios permit uneven teams; mercenaries and rating-gap rules remain manual.</p>
        {game.seats.map((s) => <label key={s.playerId}>{playerName(s.playerId)}
          <select required value={teams[s.playerId] ?? s.team ?? ""} onChange={(e) => setTeams({ ...teams, [s.playerId]: e.target.value })}>
            <option value="">Choose team</option><option>A</option><option>B</option>
          </select>
        </label>)}
        <button className="outline-button">Save teams</button>
      </form>}
      <button className="primary-button" type="button" onClick={() => void act(() => request(`${base}/start`, "POST"))}>Start table after pre-battle preparation</button>
    </div>}
    {canManage && game.status === "active" && <form className="league-form" onSubmit={(event) => {
      event.preventDefault();
      if (!window.confirm("Finalize these results and start post-battle steps? No rewards are automatically applied.")) return;
      void act(() => request(`${base}/results`, "POST", {
        results: game.seats.map((s) => ({ playerId: s.playerId, outcome: results[s.playerId]?.outcome ?? "", score: results[s.playerId]?.score ? Number(results[s.playerId].score) : null })), notes,
      }));
    }}>
      <p className="league-wide">Play the scenario at the tabletop, including NPC turns. Record {round.scenario.format === "individual" ? "each player's" : "matching team"} results when finished. Scores are optional scenario victory points, not automatic league points.</p>
      {game.seats.map((s) => <fieldset key={s.playerId}><legend>{playerName(s.playerId)}{s.team && ` · Team ${s.team}`}</legend>
        <label>Result<select required value={results[s.playerId]?.outcome ?? ""} onChange={(e) => {
          const value = e.target.value;
          if (value === "win" || value === "loss" || value === "draw" || value === "") setResults({ ...results, [s.playerId]: { score: results[s.playerId]?.score ?? "", outcome: value } });
        }}><option value="">Choose result</option><option value="win">Win</option><option value="loss">Loss</option><option value="draw">Draw / tie</option></select></label>
        <label>Scenario score<input type="number" min={-1000000} max={1000000} step={1} value={results[s.playerId]?.score ?? ""} onChange={(e) => setResults({ ...results, [s.playerId]: { outcome: results[s.playerId]?.outcome ?? "", score: e.target.value } })} /></label>
      </fieldset>)}
      <label className="league-wide">Objective, reward and after-action notes<textarea rows={3} maxLength={10000} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <button className="primary-button">Finalize results & start post-battle steps</button>
    </form>}
  </div>;
}

function CatchUpAward({ playerId, round, campaignId, request, act }: {
  playerId: string; round: Round; campaignId: string; request: Request;
  act: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [gold, setGold] = useState(30);
  const [experience, setExperience] = useState(1);
  const award = round.absenceNotes[playerId]?.award;
  if (award) return <div><p>Catch-up applied: {award.gold} GC; up to {award.requestedExperience} XP per eligible warrior/group.</p><ul>{award.experienceAwards.map((a) => <li key={a.memberId}>{a.name}: +{a.experience} XP</li>)}</ul></div>;
  if (round.status !== "completed") return null;
  return <form className="league-form" onSubmit={(event) => {
    event.preventDefault();
    if (window.confirm(`Grant ${gold} GC and up to ${experience} XP to each eligible member/group? This one-time award does not count as a battle.`)) void act(() =>
      request(`/campaigns/${campaignId}/rounds/${round.id}/catch-up`, "POST", { playerId, gold, experience }));
  }}>
    <p className="league-wide">Optional commissioner-approved catch-up award. Review the scenario policy first. XP excludes non-experiencing types and is capped at the normal Hero/Hired Sword (90) or Henchman group (14) maximum. Apply before this warband prepares its next game or retires.</p>
    <label>Catch-up gold<input type="number" required min={0} max={1000000} value={gold} onChange={(e) => setGold(Number(e.target.value))} /></label>
    <label>Participation XP per eligible warrior/group<input type="number" required min={0} max={10} value={experience} onChange={(e) => setExperience(Number(e.target.value))} /></label>
    <button className="primary-button">Grant catch-up award once</button>
  </form>;
}

interface CampaignLeague extends League { campaignId: string }

export function LeaguePanel({ campaign, warbands, request, onCampaignChanged, onRostersChanged, onOpenSetup }: {
  campaign: CampaignOption; warbands: WarbandOption[]; request: Request;
  onCampaignChanged: (campaign: CampaignOption) => void; onRostersChanged: () => Promise<void>; onOpenSetup: () => void;
}) {
  const [league, setLeague] = useState<CampaignLeague | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ruleCatalog, setRuleCatalog] = useState<OptionalRuleDefinition[]>([]);
  const [scenarioId, setScenarioId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [location, setLocation] = useState("");
  const [strategy, setStrategy] = useState("rotation");
  const [tableSize, setTableSize] = useState(4);
  const [tables, setTables] = useState<string[][]>([]);
  const [absences, setAbsences] = useState<string[]>([]);
  const [absenceNotes, setAbsenceNotes] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState(blankScenario);
  const [shareCode, setShareCode] = useState("");
  const [showNewScenario, setShowNewScenario] = useState(false);
  const [editingRound, setEditingRound] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const refreshRosters = useRef(onRostersChanged);
  refreshRosters.current = onRostersChanged;
  const lastRosterState = useRef<string | null>(null);
  const selected = scenarios.find((s) => s.id === scenarioId);
  const adjustingAttendance = league?.rounds.some((r) => r.id === editingRound && r.status === "active") ?? false;
  const load = useCallback(async () => {
    const [data, catalog] = await Promise.all([request<League>(`/campaigns/${campaign.id}/league`), request<Scenario[]>("/scenarios")]);
    setLeague({ ...data, campaignId: campaign.id }); setScenarios(catalog);
    const state = JSON.stringify(data.rosters.map((r) => [r.id, r.campaign_phase, r.campaign_step, r.league_retired]));
    if (lastRosterState.current !== null && lastRosterState.current !== state) await refreshRosters.current();
    lastRosterState.current = state;
  }, [campaign.id, request]);
  useEffect(() => {
    let active = true;
    const refresh = () => { void load().catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Could not load campaign management."); }); };
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [load]);
  useEffect(() => {
    let active = true;
    request<{ optionalRules: OptionalRuleDefinition[] }>("/league/rule-options")
      .then((result) => { if (active) setRuleCatalog(result.optionalRules); })
      .catch(() => { if (active) setRuleCatalog([]); });
    return () => { active = false; };
  }, [request]);
  async function act(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try {
      await action(); await load(); await onRostersChanged();
      onCampaignChanged(await request<CampaignOption>(`/campaigns/${campaign.id}`));
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Campaign action failed."); return false; }
    finally { setBusy(false); }
  }
  const playerName = (id: string) => league?.members.find((p) => p.id === id)?.username ?? "Former player";
  const enrolled = league?.rosters.filter((r) => !r.league_retired) ?? [];
  const activePlayers = league?.members.filter((p) => enrolled.some((r) => r.user_id === p.id)) ?? [];
  function editSchedule(round: Round) {
    const localDate = (value: string) => { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
    setEditingRound(round.id); setScenarioId(round.scenario.id); setStartsAt(localDate(round.startsAt)); setEndsAt(localDate(round.endsAt)); setTimezone(round.timezone); setLocation(round.location); setTables(round.tables); setAbsences(round.absences); setScheduleOpen(true);
  }
  async function downloadCalendar() {
    await act(async () => {
      const token = getToken();
      const response = await fetch(`${apiBaseUrl}/campaigns/${campaign.id}/calendar.ics`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error("Could not download the campaign calendar.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = "mordheim-campaign.ics"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  if (!league) return <section className="league-panel"><h2>Campaign management</h2>{error ? <p role="alert">{error}</p> : <p>Loading campaign...</p>}</section>;
  return <section className="league-panel" aria-label="Campaign league management">
    <header className="league-heading"><div><p className="eyebrow">{league.isCommissioner ? "COMMISSIONER DESK" : "CAMPAIGN LEAGUE"}</p><h2>{campaign.name}</h2>
      <p>{league.finished ? "Campaign complete" : league.scenarioLimit === null ? "Indefinite campaign" : `${league.scenarioLimit} scenarios`} · {activePlayers.length} enrolled players</p>
      {campaign.inviteCode && <p>Player invite code: <code>{campaign.inviteCode}</code></p>}
    </div><div className="league-actions">
      {league.isCommissioner && <button className="primary-button" type="button" onClick={onOpenSetup}>Campaign setup</button>}
      <button className="outline-button" type="button" disabled={busy} onClick={() => void downloadCalendar()}>Download calendar (.ics)</button>
    </div></header>
    {error && <p className="api-error" role="alert">{error}</p>}
    <details><summary>Campaign rules{league.isCommissioner ? "" : " set by the commissioner"}</summary>
      <CampaignRulesSummary campaign={campaign} warbands={warbands} catalog={ruleCatalog} />
      {league.houseRules && <details><summary>House rules text</summary><p className="league-prose">{league.houseRules}</p></details>}
    </details>
    <h3>Player standings</h3>
    <p>Wins, losses and ties stay with the player when a warband is replaced. Scenario scores are shown separately; they may use different scales.</p>
    <div className="league-table-scroll"><table className="league-standings"><thead><tr><th>Player</th><th>W</th><th>L</th><th>T</th><th>Scenario scores</th><th>Current warband</th></tr></thead><tbody>
      {league.standings.map((p) => <tr key={p.id}><td>{p.username}</td><td>{p.wins}</td><td>{p.losses}</td><td>{p.draws}</td><td>{p.score}</td><td>{enrolled.find((r) => r.user_id === p.id)?.name ?? "Not enrolled"}</td></tr>)}
    </tbody></table></div>
    {league.isCommissioner && <details><summary>Commissioner settings and membership</summary>
      <p>League play uses one active warband per player. Replacement warbands use current starting rules; old rosters and results are retained. Rule changes affect future purchases and enrollment, not existing gold or purchases.</p>
      <p className="heading-note">Use "Campaign setup" above to change starting gold, length, allowed warbands, Hero bonuses, Trading Post items, optional rules and house-rule text.</p>
      <h4>Players and replacement warbands</h4>
      {league.members.map((member) => <div className="league-actions" key={member.id}>
        <span>{member.username}{member.id === league.commissionerId && " (Commissioner)"}</span>
        {enrolled.filter((r) => r.user_id === member.id).map((r) => <button key={r.id} type="button" className="outline-button" disabled={busy} onClick={() => {
          if (window.confirm(`Retire ${r.name}? Its history stays read-only. This player can then create a replacement warband.`)) void act(() => request(`/campaigns/${campaign.id}/warbands/${r.id}/retire`, "POST"));
        }}>Retire {r.name} for replacement</button>)}
        {member.id !== league.commissionerId && <button type="button" className="outline-button" disabled={busy} onClick={() => {
          if (window.confirm(`Remove ${member.username}? Players with recorded campaign history cannot be removed.`)) void act(() => request(`/campaigns/${campaign.id}/players/${member.id}`, "DELETE"));
        }}>Remove player</button>}
      </div>)}
    </details>}
    <h3>Scenario calendar</h3>
    {!league.rounds.length && <p>Invite players and create their warbands, then schedule scenarios and tables. Existing unscheduled campaigns retain the original Battle panel.</p>}
    <ol className="league-rounds">{league.rounds.map((round) => <li key={round.id} className={`league-round league-${round.status}`}>
      <header><h4>{round.number}. {round.scenario.name}</h4><strong>{round.status}</strong></header>
      <p><time dateTime={round.startsAt}>{new Date(round.startsAt).toLocaleString(undefined, { timeZone: round.timezone })}</time> – <time dateTime={round.endsAt}>{new Date(round.endsAt).toLocaleString(undefined, { timeZone: round.timezone })}</time> ({round.timezone}){round.location && ` · ${round.location}`}</p>
      <ScenarioDetails scenario={round.scenario} />
      {round.status === "scheduled" && <ul>{round.tables.map((players, i) => <li key={i}>Table {i + 1}: {players.map(playerName).join(", ")} · teams determined at the event</li>)}</ul>}
      <fieldset className="league-controls" disabled={busy}>{round.games.map((game) => <TableControls key={game.id} game={game} round={round} league={league} playerName={playerName} request={request} act={act} />)}</fieldset>
      {round.absences.map((id) => <div key={id}><p><strong>Absent / bye: {playerName(id)}</strong>. No win or loss is recorded. Catch-up awards require commissioner confirmation.</p>
        {round.absenceNotes[id]?.notes && <p className="league-prose">{round.absenceNotes[id].notes}</p>}
        <fieldset className="league-controls" disabled={busy}>{league.isCommissioner
          ? <CatchUpAward playerId={id} round={round} campaignId={campaign.id} request={request} act={act} />
          : round.absenceNotes[id]?.award && <p>Catch-up applied: {round.absenceNotes[id].award.gold} GC and up to {round.absenceNotes[id].award.requestedExperience} participation XP.</p>}</fieldset>
        {league.isCommissioner && <form className="league-form" onSubmit={(e) => {
          e.preventDefault(); void act(() => request(`/campaigns/${campaign.id}/rounds/${round.id}/absence-notes`, "POST", { playerId: id, notes: absenceNotes[`${round.id}:${id}`] ?? "" }));
        }}><label className="league-wide">Record catch-up XP, gold or other awards already applied<textarea required maxLength={10000} value={absenceNotes[`${round.id}:${id}`] ?? ""} onChange={(e) => setAbsenceNotes({ ...absenceNotes, [`${round.id}:${id}`]: e.target.value })} /></label><button className="outline-button" disabled={busy}>Save award note (does not grant awards)</button></form>}
      </div>)}
      {league.isCommissioner && <div className="league-actions">
        {round.status === "scheduled" && <>
          <button type="button" className="outline-button" disabled={busy} onClick={() => editSchedule(round)}>Edit table assignments / window</button>
          <button type="button" className="primary-button" disabled={busy} onClick={() => void act(() => request(`/campaigns/${campaign.id}/rounds/${round.id}/start`, "POST"))}>Open scenario</button>
          <button type="button" className="outline-button" disabled={busy} onClick={() => {
            if (window.confirm("Remove this scenario? Only the last scheduled scenario can be removed.")) void act(() => request(`/campaigns/${campaign.id}/rounds/${round.id}`, "DELETE"));
          }}>Remove scenario</button>
        </>}
        {round.status === "active" && <button type="button" className="primary-button" disabled={busy || round.games.some((g) => !g.results)} onClick={() => void act(() => request(`/campaigns/${campaign.id}/rounds/${round.id}/complete`, "POST"))}>Complete scenario after all results</button>}
        {round.status === "active" && round.games.every((g) => g.status === "preparing") && <button type="button" className="outline-button" disabled={busy} onClick={() => editSchedule(round)}>Adjust attendance before tables start</button>}
      </div>}
    </li>)}</ol>
    {league.isCommissioner && <details open={scheduleOpen} onToggle={(e) => setScheduleOpen(e.currentTarget.open)}>
      <summary>{adjustingAttendance ? "Adjust event attendance" : editingRound ? "Edit scheduled scenario" : "Schedule a scenario"}</summary>
      {adjustingAttendance && <p>Saving attendance rebuilds preparing tables and clears their teams. Absent players return to pre-battle step 1. Once any table starts, attendance is locked.</p>}
      <p>Assign players to tables ahead of time; roll teams at the event. Dates are entered in your browser timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}); the event timezone controls display. Scenario windows may span a week.</p>
      <form className="league-form" onSubmit={(event) => {
        event.preventDefault(); void act(async () => {
          await request(`/campaigns/${campaign.id}/rounds${editingRound ? `/${editingRound}${adjustingAttendance ? "/attendance" : ""}` : ""}`, editingRound && !adjustingAttendance ? "PATCH" : "POST", {
            scenarioId, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), timezone, location, tables, absences,
          }); setTables([]); setAbsences([]); setEditingRound(null);
        });
      }}>
        <label>Scenario<select required disabled={adjustingAttendance} value={scenarioId} onChange={(e) => {
          setScenarioId(e.target.value); setTables([]); setAbsences([]);
          setTableSize(scenarios.find((s) => s.id === e.target.value)?.maxPlayers ?? 4);
        }}><option value="">Choose scenario</option>{scenarios.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.format})</option>)}</select></label>
        <label>Pairing preference<select value={strategy} onChange={(e) => setStrategy(e.target.value)}><option value="rotation">Vary table opponents</option><option value="rating">Similar warband ratings</option></select></label>
        <label>Window begins<input type="datetime-local" required disabled={adjustingAttendance} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></label>
        <label>Window ends<input type="datetime-local" required disabled={adjustingAttendance} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></label>
        <label>Event timezone<input required disabled={adjustingAttendance} value={timezone} onChange={(e) => setTimezone(e.target.value)} /></label>
        <label>Location<input maxLength={240} disabled={adjustingAttendance} value={location} onChange={(e) => setLocation(e.target.value)} /></label>
        <label>Preferred players per table<input required type="number" min={selected?.minPlayers ?? 2} max={selected?.maxPlayers ?? 8} value={tableSize} onChange={(e) => setTableSize(Number(e.target.value))} /></label>
        <div className="league-actions">
          <button type="button" className="outline-button" disabled={busy || !selected} onClick={() => void act(async () => {
            const suggestion = await request<{ tables: string[][]; absences: string[] }>(`/campaigns/${campaign.id}/pairings/suggest`, "POST", { tableSize, strategy, minPlayers: selected?.minPlayers ?? 2 }); setTables(suggestion.tables); setAbsences(suggestion.absences);
          })}>Suggest tables</button>
          <button type="button" className="outline-button" disabled={!selected} onClick={() => setTables([...tables, []])}>Add table</button>
        </div>
        {tables.map((table, index) => <fieldset className="league-wide" key={index}><legend>Table {index + 1}</legend>
          {activePlayers.map((p) => <label className="league-checkbox" key={p.id}><input type="checkbox" checked={table.includes(p.id)} onChange={(e) => setTables((current) => current.map((t, i) => i === index ? e.target.checked ? [...t, p.id] : t.filter((id) => id !== p.id) : t))} />{p.username} (rating {enrolled.find((r) => r.user_id === p.id)?.rating})</label>)}
          <button type="button" className="outline-button" onClick={() => setTables(tables.filter((_, i) => i !== index))}>Remove table</button>
        </fieldset>)}
        <fieldset className="league-wide"><legend>Absent / bye (manual catch-up awards)</legend>{activePlayers.map((p) => <label className="league-checkbox" key={p.id}><input type="checkbox" checked={absences.includes(p.id)} onChange={(e) => setAbsences(e.target.checked ? [...absences, p.id] : absences.filter((id) => id !== p.id))} />{p.username}</label>)}</fieldset>
        <button className="primary-button" disabled={busy || !tables.length || (league.finished && !editingRound)}>{editingRound ? "Save scenario schedule" : "Schedule scenario"}</button>
        {editingRound && <button className="outline-button" type="button" onClick={() => { setEditingRound(null); setTables([]); setAbsences([]); }}>Cancel editing</button>}
      </form>
    </details>}
    <details><summary>Scenario library and 2026 examples</summary>
      <p>The 10 supplied 2026 scenarios are included below. Use an example as a template, retain its detailed instructions, or write your own. The original documents contain diagrams and tables.</p>
      {scenarios.map((s) => <div key={s.id}><ScenarioDetails scenario={s} />
        {s.shareCode && <p>Share code: <code>{s.shareCode}</code></p>}
        {league.isCommissioner && <button className="outline-button" type="button" onClick={() => { setDraft({ ...s, name: `${s.name} (copy)`.slice(0, 120) }); setShowNewScenario(true); }}>Use as scenario template</button>}
      </div>)}
    </details>
    {league.isCommissioner && <details open={showNewScenario} onToggle={(e) => setShowNewScenario(e.currentTarget.open)}>
      <summary>Create or import a scenario</summary>
      <p>Shared scenarios import as independent copies. Scheduled rounds preserve their original scenario rules.</p>
      <form className="league-form" onSubmit={(e) => { e.preventDefault(); void act(async () => { await request("/scenarios/import", "POST", { code: shareCode }); setShareCode(""); }); }}>
        <label>Scenario share code<input required value={shareCode} onChange={(e) => setShareCode(e.target.value)} /></label><button disabled={busy} className="outline-button">Import scenario</button>
      </form>
      <form className="league-form" onSubmit={(e) => {
        e.preventDefault(); void act(async () => { await request("/scenarios", "POST", draft); setDraft(blankScenario); });
      }}>
        <label>Name<input required maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        <label>Format<select value={draft.format} onChange={(e) => {
          const format = e.target.value;
          if (format === "teams" || format === "individual" || format === "1v1" || format === "2v2") setDraft({ ...draft, format });
        }}><option value="teams">Flexible teams (teams set at event)</option><option value="individual">Individual results / shared battlefield</option><option>1v1</option><option>2v2</option></select></label>
        <label>Minimum players<input type="number" required min={2} max={8} value={draft.minPlayers} onChange={(e) => setDraft({ ...draft, minPlayers: Number(e.target.value) })} /></label>
        <label>Maximum players<input type="number" required min={draft.minPlayers} max={8} value={draft.maxPlayers} onChange={(e) => setDraft({ ...draft, maxPlayers: Number(e.target.value) })} /></label>
        {fields.map((field) => <label className="league-wide" key={field}>{labels[field]}<textarea required={["rules", "victory", "experience", "rewards"].includes(field)} maxLength={40000} rows={4} value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} /></label>)}
        <label className="league-wide">Source / attribution<input maxLength={500} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></label>
        <button className="primary-button" disabled={busy}>Save custom scenario & generate share code</button>
      </form>
    </details>}
    {league.isCommissioner && enrolled.some((r) => r.campaign_phase === "post_battle") && <details open><summary>Assist players with post-battle steps</summary>
      <p>Review and apply injuries, experience and rewards before confirming each step. This control advances the workflow; it does not apply awards automatically.</p>
      {enrolled.filter((r) => r.campaign_phase === "post_battle").map((r) => <div className="league-actions" key={r.id}><span>{r.name} · post-battle step {r.campaign_step} of 10</span>
        <button className="outline-button" type="button" disabled={busy} onClick={() => {
          if (window.confirm(`Confirm ${r.name}'s current post-battle step is complete? No awards are automatically applied.`)) void act(() => request(`/campaigns/${campaign.id}/warbands/${r.id}/post-battle/advance`, "POST"));
        }}>Confirm step complete</button>
      </div>)}
    </details>}
  </section>;
}
