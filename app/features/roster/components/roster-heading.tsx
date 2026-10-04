interface RosterHeadingProps {
  rosterId: string;
  name: string;
  loading: boolean;
  deleting: boolean;
  onNameChange: (name: string) => void;
  onDelete: () => void;
  onCreate: () => void;
}

export function RosterHeading({
  rosterId,
  name,
  loading,
  deleting,
  onNameChange,
  onDelete,
  onCreate,
}: RosterHeadingProps) {
  return (
    <section className="page-heading">
      <div>
        <div className="eyebrow"><span className="eyebrow-rule" /> CAMPAIGN ROSTER <span className="roster-number">NO. 01</span></div>
        <input
          className="roster-title"
          aria-label="Warband roster name"
          value={name}
          disabled={!rosterId}
          placeholder={loading ? "Loading rosters..." : "No warband selected"}
          onChange={(event) => onNameChange(event.target.value)}
        />
        <p className="heading-note">A record of those who venture into the ruins.</p>
      </div>
      <div className="page-heading-actions">
        <button className="delete-roster-button" disabled={!rosterId || loading || deleting} onClick={onDelete} type="button">Delete roster</button>
        <button className="outline-button" onClick={onCreate} type="button"><span>+</span> New roster</button>
      </div>
    </section>
  );
}
