import type { Route } from "./+types/app";
import { AuthGate } from "../features/auth/auth-gate";
import { Hero } from "../features/roster";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Your Mordheim Roster Ledger" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export default function RosterApp() {
  return <AuthGate>{(user, logout) => <Hero user={user} onLogout={logout} />}</AuthGate>;
}
