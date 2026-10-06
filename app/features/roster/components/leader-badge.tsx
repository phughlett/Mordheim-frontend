export function LeaderBadge() {
  return (
    <span className="leader-badge" title="Current warband leader">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14">
        <path d="M3 6l5 4 4-7 4 7 5-4-3 12H6L3 6zm3 15h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      Leader
    </span>
  );
}
