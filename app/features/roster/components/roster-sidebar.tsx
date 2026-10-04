import { useState, type FormEvent } from "react";
import type { CampaignOption, Roster } from "../types";

interface RosterSidebarProps {
  rosters: Roster[];
  otherRosters: Roster[];
  onRedeemShare: (code: string) => Promise<boolean>;
  activeRosterId: string;
  saved: boolean;
  onSelectRoster: (rosterId: string) => void;
  onCreateRoster: () => void;
  canCreateRoster: boolean;
  campaigns: CampaignOption[];
  activeCampaignId: string;
  onSelectCampaign: (campaignId: string) => void;
  onCreateCampaign: (name: string, maxGc: number) => Promise<boolean>;
  onJoinCampaign: (code: string) => Promise<boolean>;
  username: string;
  onLogout: () => void;
}

function rosterModelCount(roster: Roster) {
  return roster.members.reduce((total, member) => total + (member.role === "Henchman" ? member.groupSize : 1), 0);
}

export function RosterSidebar({
  rosters,
  otherRosters,
  onRedeemShare,
  activeRosterId,
  saved,
  onSelectRoster,
  onCreateRoster,
  canCreateRoster,
  campaigns,
  activeCampaignId,
  onSelectCampaign,
  onCreateCampaign,
  onJoinCampaign,
  username,
  onLogout,
}: RosterSidebarProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [maxGc, setMaxGc] = useState("500");
  const [joinCode, setJoinCode] = useState("");
  const [shareCode, setShareCode] = useState("");
  const activeCampaign = campaigns.find((item) => item.id === activeCampaignId);
  const amount = Number(maxGc);
  const formValid = name.trim() !== "" && maxGc !== "" && Number.isSafeInteger(amount) && amount >= 0;

  async function submitCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formValid) return;
    if (await onCreateCampaign(name.trim(), amount)) {
      setName("");
      setMaxGc("500");
      setCreating(false);
      setOpen(false);
    }
  }

  return (
    <aside className="sidebar">
      <a className="brand" href="#roster" aria-label="Mordheim roster home">
        <span className="brand-mark">M</span>
        <span><strong>MORDHEIM</strong><small>ROSTER LEDGER</small></span>
      </a>
      <div className="sidebar-label">CAMPAIGN</div>
      <button className="campaign-button" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="campaign-dot" /> {activeCampaign?.name ?? "No campaign"} <span className="chevron">{open ? "^" : "v"}</span>
      </button>
      {open && (
        <div className="campaign-menu">
          {campaigns.map((item) => (
            <button
              className={`campaign-menu-item ${item.id === activeCampaignId ? "is-active" : ""}`}
              key={item.id}
              type="button"
              onClick={() => { onSelectCampaign(item.id); setOpen(false); }}
            >
              <strong>{item.name}</strong><small>{item.maxGc} GC</small>
            </button>
          ))}
          {creating ? (
            <form className="campaign-form" onSubmit={submitCampaign}>
              <input autoFocus aria-label="Campaign name" placeholder="Campaign name" value={name} onChange={(event) => setName(event.target.value)} />
              <label>Max GC <input aria-label="Maximum GC" type="number" min={0} step={1} value={maxGc} onChange={(event) => setMaxGc(event.target.value)} /></label>
              <div>
                <button type="submit" disabled={!formValid}>Create</button>
                <button type="button" onClick={() => setCreating(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="campaign-menu-item campaign-menu-new" type="button" onClick={() => setCreating(true)}>+ New campaign</button>
          )}
          <form className="campaign-form" onSubmit={async (event) => { event.preventDefault(); if (joinCode.trim() && await onJoinCampaign(joinCode.trim())) { setJoinCode(""); setOpen(false); } }}>
            <input aria-label="Invite code" placeholder="Invite code" value={joinCode} onChange={(event) => setJoinCode(event.target.value)} />
            <div><button type="submit" disabled={!joinCode.trim()}>Join campaign</button></div>
          </form>
        </div>
      )}
      {activeCampaign?.inviteCode && <div className="invite-code">Invite code: <code>{activeCampaign.inviteCode}</code></div>}
      <div className="sidebar-label roster-label">YOUR WARBANDS <span>{rosters.length}</span></div>
      <nav className="roster-nav" aria-label="Your warbands">
        {rosters.map((item) => (
          <button
            className={`roster-nav-item ${item.id === activeRosterId ? "is-active" : ""}`}
            key={item.id}
            onClick={() => onSelectRoster(item.id)}
            type="button"
          >
            <span className="nav-emblem">{(item.warband || item.name).slice(0, 1).toUpperCase()}</span>
            <span className="nav-copy"><strong>{item.name || "Untitled Warband"}</strong><small>{item.warband || "Choose a warband"}</small></span>
            <span className="nav-count">{rosterModelCount(item)}</span>
          </button>
        ))}
      </nav>
      {otherRosters.length > 0 && (
        <>
          <div className="sidebar-label roster-label">OTHER PLAYERS <span>{otherRosters.length}</span></div>
          <nav className="roster-nav" aria-label="Other players' warbands">
            {otherRosters.map((item) => (
              <button className={`roster-nav-item ${item.id === activeRosterId ? "is-active" : ""}`} key={item.id} onClick={() => onSelectRoster(item.id)} type="button">
                <span className="nav-emblem">{(item.warband || item.name).slice(0, 1).toUpperCase()}</span>
                <span className="nav-copy"><strong>{item.name || "Untitled Warband"}</strong><small>{item.player} · view only</small></span>
                <span className="nav-count">{rosterModelCount(item)}</span>
              </button>
            ))}
          </nav>
        </>
      )}
      <form className="share-join" onSubmit={async (event) => { event.preventDefault(); if (shareCode.trim() && await onRedeemShare(shareCode.trim())) setShareCode(""); }}>
        <input aria-label="Share code" placeholder="Shared warband code" value={shareCode} onChange={(event) => setShareCode(event.target.value)} />
        <button type="submit" disabled={!shareCode.trim()}>Add</button>
      </form>
      <button className="new-roster-link" disabled={!canCreateRoster} onClick={onCreateRoster} type="button"><span>+</span> New warband</button>
      <div className="sidebar-footer sidebar-user"><span>{username}</span><button type="button" onClick={onLogout}>Log out</button></div>
      <div className="sidebar-footer"><span className="status-dot" /> Postgres <span className="save-status">{saved ? "Saved" : "Saving"}</span></div>
    </aside>
  );
}
