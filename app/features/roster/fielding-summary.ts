import type { Member } from "./types";

export function fieldingSummary(members: Pick<Member, "role" | "groupSize" | "injuryAvailability">[]) {
  const totalFielded = members.filter((member) => member.injuryAvailability?.available !== false)
    .reduce((total, member) => total + (member.role === "Henchman" ? member.groupSize : 1), 0);
  return { totalFielded, routThreshold: Math.ceil(totalFielded / 4) };
}
