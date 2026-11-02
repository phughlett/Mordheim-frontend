import { useState } from "react";
import type { CampaignOption, Roster } from "../types";
import { CorrectionLauncher } from "../../corrections/correction-launcher";

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
  onNewCampaign: () => void;
  onJoinCampaign: (code: string) => Promise<boolean>;
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
  onNewCampaign,
  onJoinCampaign,
}: RosterSidebarProps) {
  const [open, setOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [shareCode, setShareCode] = useState("");
  const activeCampaign = campaigns.find((item) => item.id === activeCampaignId);

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
              <strong>{item.name}</strong><small>{item.id === "freebuild" ? "no limit" : `${item.maxGc} GC`}</small>
            </button>
          ))}
          <button className="campaign-menu-item campaign-menu-new" type="button" onClick={() => { setOpen(false); onNewCampaign(); }}>+ New campaign</button>
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
            <span className="nav-copy"><strong>{item.name || "Untitled Warband"}</strong><small>{item.leagueRetired ? "Retired · read only" : item.warband || "Choose a warband"}</small></span>
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
                <span className="nav-copy"><strong>{item.name || "Untitled Warband"}</strong><small>{item.player} · {item.leagueRetired ? "retired" : "view only"}</small></span>
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
      <CorrectionLauncher />
    </aside>
  );
}
