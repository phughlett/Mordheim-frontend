interface RosterTopbarProps {
  loading: boolean;
  saved: boolean;
}

export function RosterTopbar({ loading, saved }: RosterTopbarProps) {
  return (
    <header className="topbar">
      <div className="breadcrumbs"><span>CAMPAIGN</span><b>/</b><span>ROSTER</span></div>
      <div className="topbar-actions">
        <span className="autosave">
          <i className={saved ? "" : "is-saving"} />
          {loading ? "Connecting to backend" : saved ? "All changes saved" : "Saving changes"}
        </span>
        <button className="avatar" type="button" aria-label="Account">P</button>
      </div>
    </header>
  );
}
