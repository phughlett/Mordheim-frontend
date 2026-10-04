import type { Route } from "./+types/home";
import { Hero } from "../features/roster";
import { AuthGate } from "../features/auth/auth-gate";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mordheim Roster Ledger" },
    { name: "description", content: "Build and manage your Mordheim warband rosters." },
  ];
}

export default function Home() {
  return <AuthGate>{(user, logout) => <Hero user={user} onLogout={logout} />}</AuthGate>;
}
