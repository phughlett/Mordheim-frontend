import type { Roster } from "../types";
import { fieldingSummary } from "../fielding-summary";

interface RosterSummaryProps {
  roster: Roster;
  heroes: number;
  henchmen: number;
  hiredSwords: number;
}

export function RosterSummary({ roster, heroes, henchmen, hiredSwords }: RosterSummaryProps) {
  const { totalFielded: warriors, routThreshold } = fieldingSummary(roster.members);

  return (
    <div className="summary-strip" role="group" aria-label="Warband roster counts and rating">
      <div className="summary-item"><span>HEROES</span><strong>{heroes}</strong></div>
      <div className="summary-item"><span>HENCHMEN</span><strong>{henchmen} <small>models</small></strong></div>
      <div className="summary-item"><span>HIRED SWORDS</span><strong>{hiredSwords}</strong></div>
      <div className="summary-item"><span>TOTAL FIELDED</span><strong>{warriors} <small>warriors</small></strong></div>
      <div className="summary-item" title="A Rout test is required when a quarter (25%) or more of the warband is out of action."><span>ROUT TEST AT</span><strong>{warriors === 0 ? "—" : routThreshold} <small>out of action</small></strong></div>
      <div className="summary-item rating-summary-item"><span>RATING</span><strong>{roster.rating}</strong></div>
    </div>
  );
}
