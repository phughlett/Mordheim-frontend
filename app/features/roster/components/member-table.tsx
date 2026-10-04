import { Fragment, useState } from "react";
import { statLabels, type StatLabel, type Member, type MemberRole, type WarriorTypeOption } from "../types";
import { getMaximumExperience } from "../experience-rules";

interface MemberTableProps {
  activeDetails?: React.ReactNode;
  members: Member[];
  activeMemberId: string | null;
  warriorTypes: WarriorTypeOption[];
  memberOrderCustomized: boolean;
  onReorderMembers: (memberIds: string[]) => void;
  onSelectMember: (memberId: string) => void;
  onSelectWarriorType: (memberId: string, typeId: string) => void;
  onUpdateMember: (memberId: string, changes: Partial<Member>) => void;
  onRemoveMember: (memberId: string) => void;
  allowedActions?: string[];
  isPromotedHenchman: (member: Member) => boolean;
  isWarriorTypeAtLimit: (type: WarriorTypeOption, exceptMemberId?: string) => boolean;
  warriorTypeOptionLabel: (type: WarriorTypeOption, exceptMemberId?: string) => string;
}

const memberClassOrder: MemberRole[] = ["Hero", "Henchman", "Hired Sword"];
const memberClassLabels: Record<MemberRole, string> = {
  Hero: "Heroes",
  Henchman: "Henchmen",
  "Hired Sword": "Hired Swords",
};

function groupMembersByClass(members: Member[], warriorTypes: WarriorTypeOption[], memberOrderCustomized: boolean) {
  const groups = new Map<MemberRole, Member[]>();
  for (const member of members) {
    groups.set(member.role, [...(groups.get(member.role) ?? []), member]);
  }

  return memberClassOrder.flatMap((role) => {
    const groupedMembers = groups.get(role);
    if (!groupedMembers) return [];
    if (!memberOrderCustomized) {
      const sheetOrder = new Map(warriorTypes
        .filter((type) => type.category === role)
        .map((type) => [type.id, type.sheetOrder ?? Number.MAX_SAFE_INTEGER]));
      groupedMembers.sort((first, second) => {
        const firstOrder = first.warriorTypeId ? sheetOrder.get(first.warriorTypeId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
        const secondOrder = second.warriorTypeId ? sheetOrder.get(second.warriorTypeId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
        return firstOrder - secondOrder || first.position - second.position;
      });
    }
    return [{
      role,
      label: memberClassLabels[role],
      members: groupedMembers,
      modelCount: groupedMembers.reduce((total, member) => total + (member.role === "Henchman" ? member.groupSize : 1), 0),
    }];
  });
}

function getMinimumExperience(member: Member, warriorTypes: WarriorTypeOption[]) {
  const startingExperience = warriorTypes.find((type) => type.id === member.warriorTypeId)?.startingExperience ?? 0;
  return Math.max(startingExperience, member.minimumExperience ?? 0);
}

function experienceRestriction(member: Member, warriorTypes: WarriorTypeOption[]) {
  if (!member.warriorTypeId) return null;
  const type = warriorTypes.find((option) => option.id === member.warriorTypeId);
  return type?.canGainExperience === false
    ? type.experienceRule ?? `This ${member.role} type does not gain experience.`
    : null;
}

function statTone(member: Member, label: StatLabel) {
  const current = Number(member.stats[label]);
  const initial = Number(member.initialStats?.[label]);
  const maximum = member.maximumStats?.[label];
  if (!Number.isFinite(current) || member.stats[label] === "") return "";
  if (maximum !== undefined && current >= maximum) return "stat-max";
  if (Number.isFinite(initial) && member.initialStats?.[label] !== "") {
    if (current > initial) return "stat-up";
    if (current < initial) return "stat-down";
  }
  return "";
}

export function MemberTable({
  members,
  activeMemberId,
  warriorTypes,
  memberOrderCustomized,
  onReorderMembers,
  onSelectMember,
  onSelectWarriorType,
  onUpdateMember,
  onRemoveMember,
  allowedActions,
  isPromotedHenchman,
  isWarriorTypeAtLimit,
  warriorTypeOptionLabel,
  activeDetails,
}: MemberTableProps) {
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [dropTargetMemberId, setDropTargetMemberId] = useState<string | null>(null);
  const memberGroups = groupMembersByClass(members, warriorTypes, memberOrderCustomized);

  function dropMember(event: React.DragEvent<HTMLTableRowElement>, targetMember: Member) {
    event.preventDefault();
    const draggedMember = members.find((member) => member.id === draggedMemberId);
    const group = memberGroups.find((memberGroup) => memberGroup.role === targetMember.role);
    if (!draggedMember || draggedMember.role !== targetMember.role || !group) return;

    const reorderedGroup = [...group.members];
    const sourceIndex = reorderedGroup.findIndex((member) => member.id === draggedMember.id);
    const targetIndex = reorderedGroup.findIndex((member) => member.id === targetMember.id);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    reorderedGroup.splice(sourceIndex, 1);
    reorderedGroup.splice(targetIndex, 0, draggedMember);
    const orderedMembers = memberGroups.flatMap((memberGroup) =>
      memberGroup.role === targetMember.role ? reorderedGroup : memberGroup.members,
    );
    onReorderMembers(orderedMembers.map((member) => member.id));
    setDraggedMemberId(null);
    setDropTargetMemberId(null);
  }

  return (
    <div className="table-scroll">
      <table className="member-table">
        <thead>
          <tr>
            <th className="warrior-heading">WARRIOR / GROUP</th>
            <th>TYPE</th>
            <th>XP / MODEL</th>
            <th>MODELS</th>
            {statLabels.map((label) => <th key={label}>{label}</th>)}
            <th aria-label="Actions" />
          </tr>
        </thead>
        {memberGroups.map((group) => (
          <tbody key={group.role}>
            <tr className="member-class-group-row">
              <th className="member-class-group" colSpan={statLabels.length + 5} scope="rowgroup">
                <span>{group.label}</span>
                <small>{group.members.length} {group.role === "Henchman" ? "groups" : group.members.length === 1 ? "warrior" : "warriors"} · {group.modelCount} {group.modelCount === 1 ? "model" : "models"}</small>
              </th>
            </tr>
            {group.members.map((member) => (
            <Fragment key={member.id}>
            <tr
              className={`${member.id === activeMemberId ? "selected-row" : ""}${member.id === dropTargetMemberId ? " drag-target" : ""}`}
              onClick={() => onSelectMember(member.id)}
              onDragOver={(event) => {
                const draggedMember = members.find((candidate) => candidate.id === draggedMemberId);
                if (draggedMember?.role === member.role) {
                  event.preventDefault();
                  setDropTargetMemberId(member.id);
                }
              }}
              onDrop={(event) => dropMember(event, member)}
            >
              <td>
                <button
                  className={`warrior-name${draggedMemberId === member.id ? " is-dragging" : ""}`}
                  type="button"
                  draggable={group.members.length > 1}
                  onClick={() => onSelectMember(member.id)}
                  onDragStart={(event) => {
                    setDraggedMemberId(member.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", member.id);
                  }}
                  onDragEnd={() => { setDraggedMemberId(null); setDropTargetMemberId(null); }}
                  title={group.members.length > 1 ? "Drag to reorder within this class" : undefined}
                >
                  <span className={`role-mark ${member.role === "Hero" ? "hero-mark" : "hench-mark"}`}>
                    {member.role === "Hero" ? "H" : member.role === "Henchman" ? "H+" : "HS"}
                  </span>
                  <span>
                    <strong>{member.name || "Unnamed warrior"}</strong>
                    <small>{member.role}{member.role === "Henchman" ? ` group · ${member.groupSize}` : ""}</small>
                  </span>
                </button>
              </td>
              <td>
                {isPromotedHenchman(member) || member.role === "Hero" || (member.role === "Henchman" && member.warriorTypeId) ? (
                  <span className="promoted-type">{member.type || "Hero type unassigned"}<small>{isPromotedHenchman(member) ? "Promoted" : member.role === "Henchman" ? "Group type fixed" : "Hire type fixed"}</small></span>
                ) : (
                  <select
                    className="table-input type-input"
                    aria-label={`${member.name} type`}
                    value={member.warriorTypeId ?? ""}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onSelectWarriorType(member.id, event.target.value)}
                  >
                    <option value="">Select type</option>
                    {warriorTypes.filter((type) => type.category === member.role).map((type) => (
                      <option
                        key={type.id}
                        value={type.id}
                        disabled={type.id !== member.warriorTypeId && isWarriorTypeAtLimit(type, member.id)}
                      >
                        {warriorTypeOptionLabel(type, member.id)}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td>
                <input
                  className="table-input number-input"
                  aria-label={`${member.name} experience${experienceRestriction(member, warriorTypes) ? " (cannot gain)" : ""}`}
                  type="number"
                  inputMode="numeric"
                  min={getMinimumExperience(member, warriorTypes)}
                  max={getMaximumExperience(member.role)}
                  step={1}
                  value={member.experience}
                  disabled={experienceRestriction(member, warriorTypes) !== null || (allowedActions !== undefined && !allowedActions.includes("experience"))}
                  title={experienceRestriction(member, warriorTypes) ?? (allowedActions !== undefined && !allowedActions.includes("experience") ? "Experience is allocated during post-battle step 2." : undefined)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    const value = event.target.value;
                    const minimum = getMinimumExperience(member, warriorTypes);
                    const maximum = getMaximumExperience(member.role);
                    if (value === "" || /^\d+$/.test(value)) {
                      onUpdateMember(member.id, { experience: String(Math.min(maximum, Math.max(minimum, Number(value) || minimum))) });
                    }
                  }}
                />
              </td>
              <td>
                {member.role === "Henchman" ? (
                  <input
                    className="table-input group-size-input"
                    aria-label={`${member.name} group size`}
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    value={member.groupSize}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isInteger(value) && value >= 1 && value <= 5) {
                        onUpdateMember(member.id, { groupSize: value });
                      }
                    }}
                  />
                ) : "1"}
              </td>
              {statLabels.map((label) => (
                <td key={label}>
                  <span className={`stat-value ${statTone(member, label)}`} aria-label={`${member.name} ${label}`}>{member.stats[label]}</span>
                </td>
              ))}
              <td>
                <button
                  className="remove-button remove-text-button"
                  aria-label={`Remove ${member.name}`}
                  title={allowedActions !== undefined && !allowedActions.includes("remove") ? "Warriors can only be removed while building the roster or in post-battle steps 1 and 8." : "Remove warrior"}
                  disabled={allowedActions !== undefined && !allowedActions.includes("remove")}
                  onClick={(event) => { event.stopPropagation(); onRemoveMember(member.id); }}
                  type="button"
                >Remove</button>
              </td>
            </tr>
            {member.id === activeMemberId && activeDetails && (
              <tr className="member-details-row">
                <td colSpan={statLabels.length + 5}>{activeDetails}</td>
              </tr>
            )}
            </Fragment>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
