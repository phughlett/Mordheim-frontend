import type { Member, MemberRole } from "./types";

const heroAdvanceThresholds = [2, 4, 6, 8, 11, 14, 17, 20, 24, 28, 32, 36, 41, 46, 51, 57, 63, 69, 76, 83, 90];
const henchmanAdvanceThresholds = [2, 5, 9, 14];

export function getAdvanceThresholds(role: MemberRole) {
  return role === "Hero" ? heroAdvanceThresholds : henchmanAdvanceThresholds;
}

export function getMaximumExperience(role: MemberRole, freebuild = false) {
  if (freebuild && role === "Hired Sword") return 2147483647;
  return role === "Hero" ? 90 : 14;
}

export function getRosterExperienceTotal(members: Pick<Member, "role" | "groupSize" | "experience">[]) {
  return members.reduce((total, member) => {
    const experience = Number(member.experience) || 0;
    return total + experience * (member.role === "Henchman" ? member.groupSize : 1);
  }, 0);
}
