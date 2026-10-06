import type { Member } from "./types";

export function fieldingSummary(members: Pick<Member, "role" | "groupSize">[]) {
  const totalFielded = members.reduce((total, member) => total + (member.role === "Henchman" ? member.groupSize : 1), 0);
  return { totalFielded, routThreshold: Math.ceil(totalFielded / 4) };
}
