import { useEffect, useId, useRef } from "react";

interface RosterTopbarProps {
  loading: boolean;
  saved: boolean;
  username: string;
  onLogout: () => void;
}

export function RosterTopbar({ loading, saved, username, onLogout }: RosterTopbarProps) {
  const accountId = useId();
  const account = useRef<HTMLDivElement>(null);
  const avatar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && account.current?.matches(":popover-open")) {
        account.current.hidePopover();
        avatar.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);
  return (
    <header className="topbar">
      <div className="breadcrumbs"><span>CAMPAIGN</span><b>/</b><span>ROSTER</span></div>
      <div className="topbar-actions">
        <span className="autosave">
          <i className={saved ? "" : "is-saving"} />
          {loading ? "Connecting to backend" : saved ? "All changes saved" : "Saving changes"}
        </span>
        <button ref={avatar} className="avatar" type="button" aria-label={`Account for ${username}`} popoverTarget={accountId}>
          {Array.from(username)[0]?.toUpperCase() || "?"}
        </button>
        <div ref={account} id={accountId} className="account-popover" popover="auto" aria-label="Account options">
          <strong>{username}</strong>
          <button className="outline-button" type="button" onClick={onLogout}>Log out</button>
        </div>
      </div>
    </header>
  );
}
