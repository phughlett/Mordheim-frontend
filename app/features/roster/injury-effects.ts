import type { InjuryEffect } from "./types";

export function injuryEffectLabel(effect: InjuryEffect): string {
  if (effect.gameplayName) return effect.gameplayName;
  if (effect.type === "psychology" && effect.rule) return effect.rule.replaceAll("-", " ");
  if (effect.type === "stat-modifier") return `${effect.stat} ${(effect.value ?? 0) > 0 ? "+" : ""}${effect.value}`;
  if (effect.type === "eye-loss") return `${effect.eye ?? "One"} eye lost`;
  if (effect.type === "miss-games") return `Miss ${effect.count} game${effect.count === 1 ? "" : "s"}`;
  if (effect.type === "pre-battle-check") return "Old battle wound";
  if (effect.type === "equipment-restriction") return "Single one-handed weapon only";
  if (effect.type === "movement-restriction") return "Cannot run; may charge";
  if (effect.type === "hatred") return "Hatred";
  if (effect.type === "captured") return "Captured";
  if (effect.type === "pit-fight-pending") return "Pit fight pending";
  if (effect.type === "experience") return `+${effect.value} XP`;
  if (effect.type === "gold-crowns") return `+${effect.value} GC`;
  if (effect.type === "lose-equipment") return "Equipment lost";
  if (effect.type === "remove-warrior" || effect.type === "remove-model") return "Removed from warband";
  return effect.name ?? effect.type.replaceAll("-", " ");
}

export function injuryEffectDescription(effect: InjuryEffect, applied = true): string {
  if (effect.gameplayRules) {
    const target = effect.type === "hatred" ? effect.targetDescription || effect.target?.replaceAll("-", " ") : null;
    return `${target ? `Target: ${target}. ` : ""}${effect.gameplayRules}`;
  }
  if (effect.type === "stat-modifier") {
    const change = effect.previousValue !== undefined && effect.currentValue !== undefined
      ? ` (${effect.previousValue} to ${effect.currentValue})` : "";
    return `${injuryEffectLabel(effect)}${change}. ${applied
      ? "Already included in the roster stat; do not apply again."
      : "Will be applied to the roster stat when this injury is confirmed."}`;
  }
  if (effect.type === "miss-games") {
    return `${injuryEffectLabel(effect)}${effect.untilBattle !== undefined ? `, through battle ${effect.untilBattle}` : ""}.${effect.cannotPerformActivities ? " Cannot perform other activities while recovering." : ""}`;
  }
  if (effect.type === "experience") {
    if (!applied) return `Will award +${effect.value} XP and protect the resulting XP total when confirmed.`;
    return `+${effect.value} XP awarded.${effect.currentValue !== undefined ? ` Experience cannot be reduced below ${effect.currentValue}.` : " This awarded XP is protected from manual reduction."}`;
  }
  return effect.ruleText ?? injuryEffectLabel(effect);
}
