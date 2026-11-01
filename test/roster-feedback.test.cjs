const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// Compile the local TSX components using the project's existing TypeScript compiler.
const previous = { ts: require.extensions[".ts"], tsx: require.extensions[".tsx"] };
const compile = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
require.extensions[".ts"] = compile;
require.extensions[".tsx"] = compile;
const authPath = require.resolve("../app/features/auth/auth.ts");
const previousAuth = require.cache[authPath];
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: { apiBaseUrl: "http://localhost:4000/api", getToken: () => null },
};
const { PrintExperienceTrack } = require("../app/features/roster/components/experience/print-experience-track.tsx");
const { equipmentStacks, RosterPrintSheet } = require("../app/features/roster/components/roster-print-export.tsx");
const { isCustomShopItemValid, NewCampaignDialog } = require("../app/features/roster/components/new-campaign-dialog.tsx");
const { AdvancePurchasePanel } = require("../app/features/roster/components/advance-purchase-panel.tsx");
const { CombatSpoils, AssignedEquipment, StashItem, WarbandTradingPanel, RitualPurchase, WeaponUpgrade, filterShopItems, shopItemPriceForType, isCampaignInjuryStep, isHeroStatusWindow, parseTradingDice, shopItemPurchaseRarity, shopItemRarityForType, tradingDataRefreshKey, tradingHeroes } = require("../app/features/roster/components/warband-trading-panel.tsx");
const { EquipmentInventoryPanel, InventoryStashReturn } = require("../app/features/roster/components/equipment-inventory-panel.tsx");
const { MordheimMapControls, MapResult, UnresolvedMap, mapSelection } = require("../app/features/roster/components/mordheim-map-controls.tsx");
const { SpellPanel } = require("../app/features/roster/components/spell-panel.tsx");
const { CapacityPanel } = require("../app/features/roster/components/capacity-panel.tsx");
const { SkillsPanel } = require("../app/features/roster/components/skills-panel.tsx");
const { RosterFields, WarbandCurrency } = require("../app/features/roster/components/roster-fields.tsx");
const { RosterHeading } = require("../app/features/roster/components/roster-heading.tsx");
const { MemberTable } = require("../app/features/roster/components/member-table.tsx");
const { InjuryPanel, InjuryChoice, InjuryResultView, HatredTargetField, hatredTargets } = require("../app/features/roster/components/injury-panel.tsx");
const { Graveyard } = require("../app/features/roster/components/graveyard.tsx");
const { fieldingSummary } = require("../app/features/roster/fielding-summary.ts");
const { RosterSummary } = require("../app/features/roster/components/roster-summary.tsx");
const { RosterTopbar } = require("../app/features/roster/components/roster-topbar.tsx");
const { SourceRules, gradeLabel } = require("../app/features/roster/components/source-rules.tsx");
const { NewRosterDialog } = require("../app/features/roster/components/new-roster-dialog.tsx");
if (previousAuth) require.cache[authPath] = previousAuth;
else delete require.cache[authPath];
require.extensions[".ts"] = previous.ts;
require.extensions[".tsx"] = previous.tsx;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
test("topbar account uses the signed-in username and a dismissible logout popover", () => {
  const html = render(RosterTopbar, { loading: false, saved: true, username: "alice", onLogout: () => {} });
  assert.match(html, /aria-label="Account for alice"/);
  assert.match(html, />A<\/button>/);
  assert.match(html, /popover="auto"/);
  assert.match(html, /<strong>alice<\/strong>/);
  assert.match(html, />Log out<\/button>/);
  assert.match(html, /All changes saved/);
  const target = html.match(/popoverTarget="([^"]+)"/i)?.[1];
  assert.ok(target);
  assert.ok(html.includes(`id="${target}"`));
});
test("stash and Graveyard have distinct roster-scoped sibling keys", () => {
  const source = ts.createSourceFile("hero.tsx", fs.readFileSync(require.resolve("../app/features/roster/hero.tsx"), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const keys = new Map();
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && ["WarbandTradingPanel", "Graveyard"].includes(node.tagName.getText(source))) {
      const key = node.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.text === "key");
      assert.ok(key?.initializer && ts.isJsxExpression(key.initializer));
      const expression = key.initializer.expression;
      assert.ok(expression && ts.isTemplateExpression(expression));
      assert.equal(expression.templateSpans.length, 1);
      assert.equal(expression.templateSpans[0].expression.getText(source), "roster.id");
      keys.set(node.tagName.getText(source), expression.head.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(keys.size, 2);
  assert.notEqual(keys.get("WarbandTradingPanel"), keys.get("Graveyard"));
});
const injuryTestTable = {
  name: "Heroes' injuries", source: { pages: [80] }, results: [
    { id: "leg-wound", name: "LEG WOUND", rolls: [22], ruleText: "The warrior’s leg is broken. He suffers a -1 Movement characteristic penalty from now on." },
    { id: "multiple-injuries", name: "MULTIPLE INJURIES", rolls: [16, 21], ruleText: "Roll D6 times on this table.", secondaryRoll: { type: "D6" } },
    { id: "sold-to-the-pits", name: "SOLD TO THE PITS", rolls: [65], ruleText: "If the warrior loses, roll to see whether he is dead or injured (ie, a D66 roll of 11-35)." },
  ],
};
test("Bitter Enmity offers free text and roll-specific campaign opponents, including simulated previews", () => {
  const opponents = [{ name: "Enemy band", warband: "Skaven", leader: { id: "leader", name: "Enemy captain" },
    heroes: [{ id: "hero", name: "Enemy hero" }] }];
  const props = { value: "", onChange: () => {} };
  assert.match(render(HatredTargetField, props), /aria-label="Bitter Enmity target details"/);
  assert.match(render(HatredTargetField, props), /maxLength="300"/i);
  const attacker = render(HatredTargetField, { ...props, opponents, roll: 2 });
  assert.match(attacker, /Enemy hero \(Enemy band\)/);
  assert.match(attacker, /Enemy captain \(leader of Enemy band\)/);
  const leader = render(HatredTargetField, { ...props, opponents, roll: 4 });
  assert.match(leader, /Enemy captain \(leader of Enemy band\)/);
  assert.doesNotMatch(leader, /Enemy hero/);
  assert.match(render(HatredTargetField, { ...props, opponents, roll: 5 }), /value="Enemy band"/);
  assert.match(render(HatredTargetField, { ...props, opponents, roll: 6 }), /All Skaven warbands/);
  assert.match(render(HatredTargetField, { ...props, opponents: [] }), /No recorded opponent/);
  assert.match(render(HatredTargetField, { ...props, opponents, roll: 5, value: "Historical enemy" }), /value="Historical enemy"/);
  const result = { id: "bitter-enmity", name: "BITTER ENMITY", roll: 56, secondaryRoll: 5, effects: [], children: [], hatredTarget: "Enemy band" };
  assert.match(render(InjuryResultView, { result, applied: false, onChange: () => {}, hatredOpponents: opponents }),
    /aria-label="Bitter Enmity target"/);
  assert.doesNotMatch(render(InjuryResultView, { result }), /<input|<select/);
  assert.deepEqual(hatredTargets({ ...result, id: "multiple-injuries", children: [result, { ...result, hatredTarget: "Another target" }] }),
    ["Enemy band", "Another target"]);
});

test("injury choices offer manual secondary results, per-injury selection and pit fight outcomes", () => {
  const table = injuryTestTable;
  const props = { table, heroTable: table, onChange: () => {} };
  const multiple = render(InjuryChoice, { ...props, value: { resultId: "multiple-injuries", secondaryRoll: 2 } });
  assert.match(multiple, /Injury 1/);
  assert.match(multiple, /Injury 2/);
  assert.match(multiple, /D6 SECONDARY RESULT/);
  assert.match(multiple, /Each resulting injury with an effect will be saved as its own tracker entry/);
  const pit = render(InjuryChoice, { ...props, value: { resultId: "sold-to-the-pits", pitOutcome: "lost" } });
  assert.match(pit, /Won · \+2 XP and \+50 GC/);
  assert.match(pit, /Lost · roll injuries again/);
  assert.match(pit, /Pit defeat injury/);
  assert.match(pit, /11-35/);
});

test("injury panel gates Add injury, supports a cancellable preview and read-only inspection", () => {
  const originalUseState = React.useState;
  const table = injuryTestTable;
  const result = { id: "leg-wound", name: "LEG WOUND", ruleText: table.results.find((result) => result.id === "leg-wound").ruleText,
    children: [], roll: 22 };
  const props = { member: { id: "hero", role: "Hero", groupSize: 1 }, request: async () => {}, onChanged: async () => {}, refreshKey: "1" };
  const data = { table, heroTable: table, canAdd: true, canCheckOldWound: true, availability: { available: true, needsOldWoundRoll: false }, history: [] };
  function withState(values, extra = {}) {
    let index = 0;
    React.useState = (initial) => originalUseState(index < values.length ? values[index++] : initial);
    return render(InjuryPanel, { ...props, ...extra });
  }
  try {
    assert.match(withState([data]), />Add injury</);
    assert.doesNotMatch(withState([data]), /role="dialog"/);
    assert.doesNotMatch(withState([{ ...data, canAdd: false }]), />Add injury</);
    assert.match(withState([data], { readOnly: true }), /<button[^>]*disabled[^>]*>Add injury/);
    const preview = withState([data, true, {}, 0, undefined, { id: "preview", result, modelIndex: 0, battleNumber: 1 }]);
    assert.match(preview, /Apply injury/);
    assert.match(preview, /<dialog[^>]*class="new-roster-dialog injury-dialog"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby=/);
    assert.match(preview, /aria-label="Close injury dialog"/);
    assert.match(preview, /Cancel · save nothing/);
    assert.match(preview, /He suffers a -1 Movement characteristic penalty from now on/);
    const group = withState([data, true], { member: { id: "group", role: "Henchman", groupSize: 3 } });
    assert.match(group, /aria-label="Injured model"/);
    assert.match(group, /Model 3/);
    const history = withState([{ ...data, history: [
      { id: "first", battle_number: 1, mode: "manual", result },
      { id: "second", battle_number: 2, mode: "simulated", pending: true, result },
    ] }]);
    assert.match(history, /class="injury-cards" aria-label="Recorded injuries"/);
    assert.equal((history.match(/<article class="skills-detail injury-card">/g) ?? []).length, 2);
    assert.match(history, /Battle 2 · simulated · Pending/);
    assert.match(history, /Resolve LEG WOUND/);
    const resolution = withState([data, true, { resultId: "sold-to-the-pits" }, 0, "pending"]);
    assert.match(resolution, /Resolve injury · Unnamed warrior/);
    const failed = withState([data, true, {}, 0, undefined, null, "Preview failed"]);
    assert.match(failed, /<dialog[\s\S]*role="alert" class="skills-error">Preview failed/);
  } finally { React.useState = originalUseState; }
});

test("injury result cards retain nested outcomes, metadata and exact paragraph breaks", () => {
  const result = { id: "multiple-injuries", name: "MULTIPLE INJURIES", ruleText: "First paragraph.\nSecond paragraph.", roll: 16,
    children: [{ id: "leg-wound", name: "LEG WOUND", ruleText: "Movement penalty.", roll: 22, children: [] }] };
  const html = render(InjuryResultView, { result, metadata: "Battle 3 · manual" });
  assert.equal((html.match(/<article class="skills-detail injury-card">/g) ?? []).length, 2);
  assert.match(html, /Battle 3 · manual/);
  assert.match(html, /class="injury-rule-text">First paragraph\.\nSecond paragraph\./);
  assert.match(html, /class="injury-cards"><article/);
});

test("injury history retains exact rules and unavailable warriors are excluded from fielding totals", () => {
  const text = "The warrior causes fear from now on.";
  assert.match(render(InjuryResultView, { result: { id: "horrible-scars", name: "HORRIBLE SCARS", ruleText: text, roll: 64, children: [] } }), /The warrior causes fear from now on\./);
  assert.deepEqual(fieldingSummary([
    { role: "Hero", groupSize: 1, injuryAvailability: { available: false } },
    { role: "Hero", groupSize: 1 },
    { role: "Henchman", groupSize: 3 },
  ]), { totalFielded: 4, routThreshold: 1 });
});

test("selected Madness effects show gameplay references in injury cards, rows and the printable roster", () => {
  for (const [rule, gameplayName, gameplayRules] of [
    ["frenzy", "Frenzy", "Double the Attacks characteristic; the second hand weapon bonus is not doubled. Knocked down or stunned ends Frenzy for this battle."],
    ["stupidity", "Stupidity", "Test Leadership on 2D6 at the start of each turn. Failure prevents spells and combat attacks; out of combat roll D6 for movement or inactivity."],
  ]) {
    const effect = { type: "psychology", rule, gameplayName, gameplayRules,
      sourceReference: "1Rules.pdf - Leadership & psychology, p. 23", name: `MADNESS - ${gameplayName}` };
    const result = { id: "madness", name: "MADNESS", secondaryName: gameplayName, secondaryText: `Selected ${gameplayName}.`,
      ruleText: "Roll to determine the type of Madness.", roll: 24, effects: [effect], children: [] };
    const card = render(InjuryResultView, { result });
    assert.match(card, new RegExp(`Selected effect · ${gameplayName}`));
    assert.ok(card.includes(gameplayRules));
    assert.match(card, /Leadership &amp; psychology, p\. 23/);
    const member = { id: "hero", name: "Injured hero", role: "Hero", type: "Youngblood", stats: { A: "1" },
      experience: "0", groupSize: 1, position: 0, injuryConditions: [effect] };
    const row = render(MemberTable, {
      members: [member], activeMemberId: null, warriorTypes: [], memberOrderCustomized: false,
      onReorderMembers: () => {}, onSelectMember: () => {}, onSelectWarriorType: () => {},
      onUpdateMember: () => {}, onRemoveMember: () => {}, isPromotedHenchman: () => false,
      isWarriorTypeAtLimit: () => false, warriorTypeOptionLabel: () => "",
    });
    assert.ok(row.includes(`<small>${gameplayName}</small>`));
    const printed = render(RosterPrintSheet, { data: {
      roster: { name: "Test roster", warband: "Mercenaries", treasury: "0", rating: 5, wyrdstone: "0", battlesFought: 1 },
      printedAt: "2026-11-01", stash: [],
      sheets: [{ member, equipment: null, skills: null, spells: null, advancements: { canGainExperience: false } }],
    } });
    assert.ok(printed.includes(gameplayRules));
    assert.ok(printed.includes(`${gameplayName} (caused by MADNESS - ${gameplayName})`));
    assert.doesNotMatch(printed, /Roll to determine/);
  }
});

test("injury stat references show the applied delta and warn against applying it twice", () => {
  const effect = { type: "stat-modifier", stat: "T", value: -1, previousValue: 3, currentValue: 2 };
  const html = render(InjuryResultView, { result: {
    id: "chest-wound", name: "CHEST WOUND", ruleText: "Toughness penalty.", roll: 26, effects: [effect], children: [],
  } });
  assert.match(html, /T -1 \(3 to 2\)/);
  assert.match(html, /Already included in the roster stat; do not apply again/);
  const preview = render(InjuryResultView, { applied: false, result: {
    id: "chest-wound", name: "CHEST WOUND", ruleText: "Toughness penalty.", roll: 26, effects: [effect], children: [],
  } });
  assert.match(preview, /Will be applied to the roster stat/);
  assert.doesNotMatch(preview, /Already included/);
});

test("pit XP references distinguish preview awards from protected recorded totals", () => {
  const result = { id: "sold-to-the-pits", name: "SOLD TO THE PITS", pitOutcome: "won", ruleText: "Pit victory.",
    roll: 65, children: [], effects: [{ type: "experience", value: 2, previousValue: 7, currentValue: 9 }] };
  assert.match(render(InjuryResultView, { result }), /\+2 XP awarded\. Experience cannot be reduced below 9/);
  assert.match(render(InjuryResultView, { result, applied: false }), /Will award \+2 XP and protect the resulting XP total when confirmed/);
});

test("Graveyard shows archived full Hero details read-only and prints without adding to fielding totals", () => {
  const entry = { id: "grave", name: "Fallen Hero", reason: "death", battle_number: 3, snapshot_complete: true,
    cause: { id: "dead", name: "DEAD", ruleText: "Removed after fatal injuries.", roll: 11, effects: [], children: [] },
    snapshot: {
      member: { name: "Fallen Hero", typeName: "Youngblood", experience: 8, stats: { M: "3", T: "2" }, notes: "Hero memorial",
        equipment: "Historical gear note", skills: "Historical skill note" },
      equipment: [{ id: "sword", name: "Sword", quantity: 2, unit_cost_paid: 10 }],
      skills: [{ id: "skill", name: "Mighty Blow", category: "Strength", description: "+1 Strength in combat.", source_reference: "Core" }],
      spells: [{ id: "spell", name: "Archived spell", discipline: "Lesser Magic", casting_difficulty: 6, effect_summary: "Spell effect." }],
      injuries: [],
    },
  };
  const html = render(Graveyard, { entries: [entry] });
  for (const text of ["Graveyard · 1", "Fallen Hero", "Youngblood · Died · Battle 3", "Sword ×2", "Mighty Blow", "Archived spell",
    "Difficulty 6", "Hero memorial", "Historical gear note", "Historical skill note", "Removed after fatal injuries."]) assert.ok(html.includes(text), text);
  assert.match(html, /aria-label="Fallen Hero archived stats"/);
  assert.doesNotMatch(html, /<input|<button|<select/);
  const undo = { ...entry, reason: "dismissed", canRestore: true };
  const restoreProps = { entries: [undo], onRestore: async () => {} };
  assert.match(render(Graveyard, restoreProps), /Undo removal/);
  assert.doesNotMatch(render(Graveyard, restoreProps), /disabled/);
  assert.doesNotMatch(render(Graveyard, { ...restoreProps, readOnly: true }), /<button/);
  assert.doesNotMatch(render(Graveyard, { ...restoreProps, printable: true }), /<button/);
  assert.doesNotMatch(render(Graveyard, { ...restoreProps, entries: [entry] }), /<button/);
  const blocked = render(Graveyard, { ...restoreProps, entries: [{ ...undo, canRestore: false, restoreBlock: "The battle counter has changed." }] });
  assert.match(blocked, /disabled/);
  assert.match(blocked, /The battle counter has changed/);
  const printed = render(RosterPrintSheet, { data: {
    roster: { name: "Memorial roster", treasury: "0", rating: "0", wyrdstone: "0", graveyard: [entry] },
    sheets: [], stash: [], printedAt: "2026-11-01",
  } });
  assert.match(printed, /class="print-graveyard"/);
  assert.match(printed, /class="graveyard-entry" open=""/);
  assert.match(printed, /<dt>Total Fielded<\/dt><dd>0 warriors<\/dd>/);
  assert.match(printed, /Archived spell/);
  const legacy = render(Graveyard, { entries: [{ ...entry, snapshot_complete: false }] });
  assert.match(legacy, /Legacy record: this Hero was removed before full snapshots were available/);
  assert.doesNotMatch(legacy, /archived stats/);
  assert.match(render(Graveyard, { entries: [] }), /No Heroes have been removed/);
  for (const [reason, label] of [["retirement", "Retired"], ["captivity", "Removed in captivity"], ["dismissed", "Dismissed"]]) {
    assert.ok(render(Graveyard, { entries: [{ ...entry, reason }] }).includes(label));
  }
});

test("Mordheim maps offer manual choice, entered dice and simulated dice with the complete rules table", () => {
  const mapTypes = [
    { id: "fake", name: "Fake", rolls: [1], effect: "Opponent chooses the next scenario." },
    { id: "vague", name: "Vague", rolls: [2, 3], effect: "Reroll one exploration die." },
    { id: "catacomb", name: "Catacomb map", rolls: [4], effect: "Choose the next scenario." },
    { id: "accurate", name: "Accurate", rolls: [5], effect: "Reroll up to three exploration dice." },
    { id: "master", name: "Master map", rolls: [6], effect: "Reroll one exploration die if the bearer was not out of action." },
  ];
  const props = { types: mapTypes, enabled: true, onChange: () => {}, value: { mode: "choose", type: "master", dice: "" } };
  const html = render(MordheimMapControls, props);
  for (const type of mapTypes) assert.ok(html.includes(type.name));
  assert.match(html, /Roll D6 automatically/);
  assert.match(html, /Enter rolled D6/);
  assert.match(html, /Choose type manually/);
  assert.match(html, /separate from price and rarity rolls/);
  assert.match(html, /not automatically/);
  assert.match(render(MordheimMapControls, { ...props, value: { ...props.value, mode: "manual" } }), /aria-label="Map type dice"/);
  assert.match(render(MordheimMapControls, { ...props, enabled: false }), /aria-label="Map type mode"[^>]*disabled/);
  assert.deepEqual(mapSelection(props.value, 2), { mode: "choose", type: "master" });
  assert.deepEqual(mapSelection({ ...props.value, mode: "manual", dice: "2, 6" }, 2), { mode: "manual", dice: [2, 6] });
  assert.deepEqual(mapSelection({ ...props.value, mode: "simulated" }, 2), { mode: "simulated" });
  for (const dice of ["", "0", "7", "1.5", "1,", "six"]) assert.throws(() => mapSelection({ ...props.value, mode: "manual", dice }, 1));
  assert.match(render(MapResult, { entry: { mapResult: { roll: 6, mode: "manual" } } }), /Map D6: 6 \(entered\)/);
  assert.match(render(MapResult, { entry: { mapResult: { roll: null, mode: "choose" } } }), /Type chosen manually/);
  assert.equal(render(UnresolvedMap, { entry: { shopItemId: "mordheim-map", mapResult: { type: "master" } }, types: mapTypes }), "");
  assert.match(render(UnresolvedMap, { entry: { shopItemId: "mordheim-map" }, types: mapTypes, enabled: true }), /Record type for one map/);
});

test("printed carried maps retain distinct types rather than merging under the shop ID", () => {
  const inventory = ["vague", "master", "master"].map((type, index) => ({
    id: String(index), shopItemId: "mordheim-map", name: `Mordheim Map (${type})`, quantity: 1, modelIndex: 0,
    mapResult: { type }, stats: null,
  }));
  const stacks = equipmentStacks({ equipment: { inventory } });
  assert.equal(stacks.length, 2);
  assert.deepEqual(stacks.map((stack) => [stack.name, stack.quantity]), [["Mordheim Map (vague)", 1], ["Mordheim Map (master)", 2]]);
});

test("warband source summaries distinguish references from automation and display grades", () => {
  assert.equal(gradeLabel("core"), "Core");
  assert.equal(gradeLabel("1b"), "1B");
  const html = render(SourceRules, {
    title: "Warband rules", grade: "1b", sourceUrl: "https://mordheimer.net/docs/warbands",
    rules: [{ name: "Example rule", summary: "Resolve a conditional effect manually." }],
  });
  assert.match(html, /Warband rules · 1B/);
  assert.match(html, /Reference summaries only/);
  assert.match(html, /<strong>Example rule:<\/strong>/);
  assert.match(html, /target="_blank" rel="noreferrer"/);
  assert.equal(render(SourceRules, {}), "");
});

test("warband creation shows grades and distinct Amazon variants without changing canonical names", () => {
  const html = render(NewRosterDialog, {
    open: true, submitting: false, campaign: { id: "freebuild", name: "Freebuild" },
    warbands: [
      { id: "mordheim", name: "Amazons", displayName: "Amazons (Mordheim)", grade: "1b" },
      { id: "lustria", name: "Amazons (Lustria)", grade: "1b" },
      { id: "mercenaries", name: "Mercenaries", grade: "core" },
      { id: "monks", name: "Battle Monks of Cathay", grade: "1c" },
    ],
    onCancel: () => {}, onSubmit: () => {},
  });
  for (const name of ["Amazons (Mordheim) · 1B", "Amazons (Lustria) · 1B", "Mercenaries · Core", "Battle Monks of Cathay · 1C"]) {
    assert.ok(html.includes(name), name);
  }
});

test("group equipment inspection shows group size and totals without per-model counts", () => {
  const html = render(EquipmentInventoryPanel, {
    member: { id: "thunderers", role: "Henchman", groupSize: 4,
      equipmentStatus: { valid: false, allowIndividualGroupGear: false, items: [
        { key: "crossbow", name: "Crossbow", quantities: [1, 1, 1, 0], total: 3, missing: 1 },
      ] } },
    treasury: "0", loading: false, error: "", data: null,
  });
  assert.match(html, /Incorrectly equipped - cannot enter battle/);
  assert.match(html, /Crossbow x 3/);
  assert.match(html, /Group size: 4/);
  assert.doesNotMatch(html, /Model \d+:/);
  assert.match(html, /Missing 1/);
  assert.match(html, /Complete group equipment/);
});

test("complete group equipment displays compact item totals", () => {
  const html = render(EquipmentInventoryPanel, {
    member: { id: "thunderers", role: "Henchman", groupSize: 4,
      equipmentStatus: { valid: true, allowIndividualGroupGear: false, items: [
        { key: "crossbow", name: "Crossbow", quantities: [1, 1, 1, 1], total: 4, missing: 0 },
      ] } },
    treasury: "0", loading: false, error: "", data: null,
  });
  assert.match(html, /Group equipment checked/);
  assert.match(html, /Group size: 4/);
  assert.match(html, /Crossbow x 4/);
  assert.doesNotMatch(html, /Model \d+:|Missing \d+/);
});

test("recruitment and Trading Post copies share one owned and printed equipment stack", () => {
  const inventory = [0, 1, 2, 3].map((index) => ({
    id: `crossbow-${index}`, equipmentOptionId: index === 3 ? "crossbow" : "recruitment-crossbow",
    shopItemId: index === 3 ? "crossbow" : null, stackKey: "shop:crossbow",
    name: "Crossbow", category: "weapon", quantity: 1, modelIndex: index,
    unitCostPaid: index === 3 ? 25 : 20, unitSaleValue: 12,
    saleRestriction: null, stats: null,
  }));
  const props = {
    member: { id: "group", role: "Henchman", groupSize: 4 }, treasury: "0", loading: false, error: "",
    data: { inventory, availableOptions: [], recruitmentRefund: false, canSell: true, mutations: { eligible: false } },
    stashReturns: inventory.map((item) => ({ ...item, returnQuantity: 1, returnModelIndex: -1 })),
    onReturnToStash: async () => {}, canReturnToStash: true,
  };
  const html = render(EquipmentInventoryPanel, props);
  assert.equal((html.match(/Crossbow ×4/g) ?? []).length, 1);
  assert.doesNotMatch(html, /Crossbow ×[13]/);
  assert.match(html, /Sell ×4 · 48 GC/);
  assert.equal((html.match(/>Return to stash/g) ?? []).length, 1);
  const stacks = equipmentStacks({ equipment: { inventory } });
  assert.equal(stacks.length, 1);
  assert.equal(stacks[0].quantity, 4);
  const recruitment = render(EquipmentInventoryPanel, { ...props,
    data: { ...props.data, recruitmentRefund: true,
      inventory: inventory.map((item) => ({ ...item, shopItemId: null })) },
  });
  assert.match(recruitment, /Refund ×4 · 85 GC/);
});

test("completion requires only the missing stash copy, not four additional copies", () => {
  const originalUseState = React.useState;
  const props = {
    entry: { id: "stock", name: "Crossbow", category: "weapon", quantity: 1, unitCostPaid: 25,
      eligibleRecipients: [{ memberId: "group", allowIndividualGroupGear: false, missingCopies: 1 }] },
    roster: { members: [{ id: "group", name: "Thunderers", role: "Henchman", groupSize: 4 }] },
    enabled: true, onSend: async () => {},
  };
  try {
    function selected(extra = {}) {
      let index = 0;
      React.useState = (initial) => originalUseState(index++ === 0 ? "group" : initial);
      return render(StashItem, { ...props, ...extra });
    }
    const html = selected();
    assert.match(html, /<button[^>]*>Complete group equipment · 1 copy<\/button>/);
    assert.doesNotMatch(html, /<button[^>]*disabled[^>]*>Complete group equipment/);
    assert.match(html, /<button[^>]*disabled[^>]*>Send to member/);
    assert.match(selected({ enabled: false }), /<button[^>]*disabled[^>]*>Complete group equipment/);
  } finally {
    React.useState = originalUseState;
  }
});

test("included zero-price starting mounts remain inventory-only, not repeatable shop purchases", () => {
    const html = render(EquipmentInventoryPanel, {
      member: { id: "knight", role: "Hero", groupSize: 1 }, treasury: "415", loading: false, error: "",
      data: {
        mutations: { eligible: false, required: false, options: [] },
        availableOptions: [
          { id: "horse", name: "Riding Horse", category: "misc", unitCost: 0, firstFree: true, listName: "Mounts" },
          { id: "sword", name: "Sword", category: "weapon", unitCost: 10, firstFree: false, listName: "Weapons" },
        ],
        inventory: [{ id: "carried-horse", equipmentOptionId: "horse", name: "Riding Horse", category: "misc",
          quantity: 1, unitCostPaid: 0, modelIndex: 0, stats: null }],
      },
      onPurchase: async () => {}, onSell: async () => {}, onSetMutations: async () => true,
    });
    assert.doesNotMatch(html, /<option value="horse"/);
    assert.match(html, /<option value="sword"/);
    assert.match(html, /Riding Horse ×1/);
});

test("Freebuild battle count is editable, read-only shares cannot edit, and campaigns use their sequence", () => {
  const roster = { id: "roster", name: "Battle ledger", warband: "Mercenaries", battlesFought: 0 };
  const html = render(RosterFields, { roster, onUpdate: () => {} });
  assert.match(html, /aria-label="Battles fought"/);
  assert.match(html, /min="0" max="2147483647" step="1" value="0"/);
  const readOnly = render(RosterFields, { roster, onUpdate: () => {}, readOnly: true });
  assert.match(readOnly, /aria-label="Battles fought"[^>]*disabled/);
  assert.doesNotMatch(render(RosterFields, { roster: { ...roster, campaignId: "campaign" }, onUpdate: () => {} }), /aria-label="Battles fought"/);
  assert.notEqual(tradingDataRefreshKey(roster), tradingDataRefreshKey({ ...roster, battlesFought: 1 }));
});

test("stash selling is independent of transfer permissions and displays half-base proceeds", () => {
  const props = { entry: { id: "stack", name: "Axe", category: "weapon", quantity: 3, unitCostPaid: 5, unitSaleValue: 2, eligibleRecipients: [] },
    roster: { members: [] }, enabled: false, canSell: true, onSend: async () => {}, onSell: async () => {} };
  const html = render(StashItem, props);
  assert.match(html, /aria-label="Sell quantity for Axe"/);
  assert.match(html, /<button[^>]*>Sell ×1 · 2 GC<\/button>/);
  assert.doesNotMatch(html, /<button[^>]*disabled[^>]*>Sell ×1 · 2 GC/);
  assert.match(render(StashItem, { ...props, canSell: false }), /<button[^>]*disabled[^>]*>Sell ×1 · 2 GC/);
  assert.doesNotMatch(render(StashItem, { ...props, entry: { ...props.entry, unitSaleValue: null, saleRestriction: "Bound items cannot be sold." } }), /Sell ×/);
});

test("post-battle member sales show listed resale prices instead of paid-cost refunds", () => {
  const props = { member: { id: "hero", role: "Hero", groupSize: 1 }, treasury: "0", loading: false, error: "",
    purchaseLocked: true, onPurchase: async () => {}, onSell: async () => {}, onSetMutations: async () => true,
    data: { availableOptions: [], recruitmentRefund: false, canSell: true, mutations: { eligible: false },
      inventory: [{ id: "rifle", equipmentOptionId: "hunting-rifle", shopItemId: "hunting-rifle", name: "Hunting Rifle", category: "weapon",
        modelIndex: 0, quantity: 2, unitCostPaid: 206, unitSaleValue: 100, stats: null }] } };
  const html = render(EquipmentInventoryPanel, props);
  assert.match(html, /Resale: 200 GC/);
  assert.match(html, /Sell ×2 · 200 GC/);
  assert.doesNotMatch(html, /412 GC/);
  assert.doesNotMatch(render(EquipmentInventoryPanel, { ...props, data: { ...props.data, canSell: false } }), /Sell ×/);
});

test("graded shop filters cover all six categories and compose with grades without mutating data", () => {
  const shop = ["close-combat", "missile", "blackpowder", "armour", "miscellaneous", "animals"]
    .flatMap((shopCategory) => ["core", "1a", "1b"].map((grade) => ({ id: `${shopCategory}-${grade}`, shopCategory, grade })));
  const before = JSON.stringify(shop);
  assert.equal(filterShopItems(shop).length, 18);
  for (const category of ["close-combat", "missile", "blackpowder", "armour", "miscellaneous", "animals"]) {
    const matching = filterShopItems(shop, category);
    assert.ok(matching.length, category);
    assert.ok(matching.every((item) => item.shopCategory === category));
    for (const grade of ["core", "1a", "1b"]) {
      assert.deepEqual(filterShopItems(shop, category, grade), shop.filter((item) => item.shopCategory === category && item.grade === grade));
    }
  }
  assert.deepEqual(filterShopItems(shop, "unknown"), []);
  assert.equal(JSON.stringify(shop), before);
});

test("buyer-specific prices remove unnecessary dice without changing standard or campaign prices", () => {
  const item = { id: "lotus", baseCost: 10, priceDice: 1, priceMultiplier: 1, priceOverrides: [
    { typeNames: ["Skink Priest"], baseCost: 10, priceDice: 0, priceMultiplier: 1 },
  ] };
  const before = JSON.stringify(item);
  assert.equal(shopItemPriceForType(item, "Skink Priest").priceDice, 0);
  assert.equal(shopItemPriceForType(item, "Youngblood").priceDice, 1);
  assert.equal(shopItemPriceForType({ ...item, baseCost: 42, priceDice: 0, priceOverrides: [] }, "Skink Priest").baseCost, 42);
  assert.equal(JSON.stringify(item), before);
  assert.deepEqual(parseTradingDice("1,1,1,1,1,1,1,1,1,1", 10), Array(10).fill(1));
});

test("summoning presents a paid ritual, only spellcasters, and no normal purchase or spoils control", () => {
  const props = { item: { priceDice: 1 }, heroes: [
    { id: "wizard", name: "Wizard", spellcaster: true },
    { id: "priest", name: "Prayer user", spellcaster: false },
    { id: "injured", name: "Injured wizard", spellcaster: true, outOfAction: true },
    { id: "searched", name: "Spent search", spellcaster: true, searched: true },
  ], enabled: true, onAttempt: async () => {} };
  const html = render(RitualPurchase, props);
  assert.match(html, /even if it fails/);
  assert.match(html, /Pay and attempt summoning/);
  assert.match(html, /Wizard/);
  assert.doesNotMatch(html, /value="priest"/);
  assert.match(html, /value="injured" disabled=""/);
  assert.match(html, /value="searched" disabled=""/);
  assert.doesNotMatch(html, /Buy into stash|Add as combat spoils/);
});

test("permanent upgrades list only carried unmodified weapons and disable stash returns", () => {
  const entries = [
    { id: "weapon", memberId: "group", category: "weapon", name: "Sword", modelIndex: 0, upgradeQuantity: 3 },
    { id: "other-model", memberId: "group", category: "weapon", name: "Sword", modelIndex: 1, upgradeQuantity: 3 },
    { id: "armour", memberId: "group", category: "armour", name: "Helmet" },
    { id: "poisoned", memberId: "group", category: "weapon", name: "Poisoned Sword", nontransferable: true },
  ];
  const html = render(WeaponUpgrade, { item: { baseCost: 25 }, entries, members: [{ id: "group", name: "Henchmen" }], enabled: true, treasury: "500", onUpgrade: async () => {} });
  assert.match(html, /Henchmen · Sword · 3 models/);
  assert.doesNotMatch(html, /value="other-model"|Helmet|value="poisoned"/);
  assert.match(html, /cannot be traded, sold or returned/);
  const bound = render(InventoryStashReturn, { entry: { ...entries[3], quantity: 1, returnQuantity: 1 }, enabled: true, onReturn: async () => {} });
  assert.match(bound, /cannot be traded or returned/);
  assert.doesNotMatch(bound, /<button/);
});

test("combat spoils are Freebuild-only and do not require a price quote", () => {
  const props = { campaign: false, item: { id: "herbs", priceDice: 2, disabled: false }, enabled: true, onAdd: async () => {} };
  const html = render(CombatSpoils, props);
  assert.match(html, /Add as combat spoils/);
  assert.match(html, /no Gold Crowns charged/);
  assert.match(html, /Combat spoils quantity/);
  assert.doesNotMatch(html, /disabled=""/);
  assert.equal(render(CombatSpoils, { ...props, campaign: true }), "");
  for (const overrides of [{ enabled: false }, { item: { ...props.item, disabled: true } }]) {
    const locked = render(CombatSpoils, { ...props, ...overrides });
    assert.equal((locked.match(/disabled=""/g) || []).length, 2);
  }
});

test("assigned equipment totals items and lists each carrier once without model numbers", () => {
  const entries = [
    { id: "hero", name: "Dagger", category: "weapon", quantity: 2, memberId: "captain", modelIndex: 0, shopItemId: "dagger" },
    ...Array.from({ length: 5 }, (_, modelIndex) => ({
      id: `group-${modelIndex}`, name: "Dagger", category: "weapon", quantity: 1,
      memberId: "swordsmen", modelIndex, equipmentOptionId: "starter-dagger",
    })),
    { id: "shield", name: "Shield", category: "shield", quantity: 1, memberId: "captain", modelIndex: 0 },
    { id: "custom", name: "Dagger", category: "misc", quantity: 1, memberId: "captain", modelIndex: 0 },
  ];
  const original = JSON.stringify(entries);
  const html = render(AssignedEquipment, {
    entries, members: [{ id: "captain", name: "Captain Klaus" }, { id: "swordsmen", name: "Ruins Guard" }],
  });
  assert.match(html, /Dagger x 7 - Weapon/);
  assert.match(html, /Captain Klaus, Ruins Guard/);
  assert.equal((html.match(/Ruins Guard/g) || []).length, 1);
  assert.equal((html.match(/<li>/g) || []).length, 3);
  assert.match(html, /Shield x 1 - Shield/);
  assert.match(html, /Dagger x 1 - Miscellaneous/);
  assert.doesNotMatch(html, /model|Model/);
  assert.equal(JSON.stringify(entries), original);
  assert.match(render(AssignedEquipment, { entries: [], members: [] }), /No assigned inventory entries/);
});

test("capacity keeps computed limits and leader without capacity item callouts", () => {
  const cookbook = { id: "cookbook", name: "Halfling Cookbook", member_limit_bonus: 1 };
  const capacity = {
    currentMembers: 16, maxMembers: 16, maxHeroes: 6, memberTypeBonus: 0,
    leader: { id: "captain", name: "Captain" }, availableModifiers: [cookbook], selectedModifiers: [cookbook],
  };
  const active = render(CapacityPanel, { capacity });
  assert.match(active, /Leader: Captain/);
  assert.match(active, /16\/16 warriors/);
  assert.doesNotMatch(active, /checkbox|<input|CAPACITY ITEM|Halfling Cookbook/);
  const inactive = render(CapacityPanel, { capacity: { ...capacity, maxMembers: 15, selectedModifiers: [] } });
  assert.match(inactive, /16\/15 warriors/);
  assert.match(inactive, /Over capacity/);
});

test("currency moves out of overview and preserves Freebuild, campaign and read-only behavior", () => {
  const roster = { id: "roster", name: "Ruins Raiders", warband: "Mercenaries", treasury: "123", wyrdstone: "7", campaignId: null };
  const overview = render(RosterFields, { roster, onUpdate: () => {} });
  assert.match(overview, /Mercenaries/);
  assert.match(overview, /aria-label="Warband roster name"/);
  assert.match(overview, /class="warband-name-input"/);
  assert.match(overview, /value="Ruins Raiders"/);
  assert.doesNotMatch(overview, /Gold Crowns|Wyrdstone|disabled/);
  const heading = render(RosterHeading, { rosterId: roster.id, loading: false, deleting: false, onDelete: () => {}, onCreate: () => {} });
  assert.doesNotMatch(heading, /<input|Warband roster name/);
  const readOnlyName = render(RosterFields, { roster, onUpdate: () => {}, readOnly: true });
  assert.match(readOnlyName, /disabled=""/);
  const campaignName = render(RosterFields, { roster: { ...roster, campaignId: "campaign" }, onUpdate: () => {} });
  assert.doesNotMatch(campaignName, /disabled/);
  const editable = render(WarbandCurrency, { roster, onUpdate: () => {} });
  assert.match(editable, /Gold Crowns/);
  assert.match(editable, /Wyrdstone/);
  assert.match(editable, /value="123"/);
  assert.match(editable, /value="7"/);
  assert.match(editable, /Changes save automatically/);
  assert.doesNotMatch(editable, /disabled/);
  for (const props of [{ roster: { ...roster, campaignId: "campaign" } }, { roster, readOnly: true }]) {
    const locked = render(WarbandCurrency, { ...props, onUpdate: () => {} });
    assert.equal((locked.match(/disabled=""/g) || []).length, 2);
    assert.doesNotMatch(locked, /Changes save automatically/);
  }
});

test("Warrior and group rows toggle details once while editing controls stay independent", () => {
  const members = [
    { id: "hero", name: "Captain", role: "Hero", stats: {}, experience: "20", groupSize: 1, position: 0 },
    { id: "group", name: "Swordsmen", role: "Henchman", stats: {}, experience: "0", groupSize: 3, position: 1 },
  ];
  let activeMemberId = null;
  const selections = [];
  const props = {
    members, warriorTypes: [], memberOrderCustomized: false,
    activeDetails: React.createElement("div", null, "Member details"),
    onReorderMembers: () => {}, onSelectMember: (id) => { activeMemberId = id; selections.push(id); },
    onSelectWarriorType: () => {}, onUpdateMember: () => {}, onRemoveMember: () => {},
    isPromotedHenchman: () => false, isWarriorTypeAtLimit: () => false, warriorTypeOptionLabel: () => "",
  };
  const originalUseState = React.useState;
  function elements(node) {
    return React.Children.toArray(node).flatMap((child) =>
      React.isValidElement(child) ? [child, ...elements(child.props.children)] : []);
  }
  function click(memberId, target) {
    React.useState = (initial) => [initial, () => {}];
    let tree;
    try { tree = MemberTable({ ...props, activeMemberId }); }
    finally { React.useState = originalUseState; }
    const rows = elements(tree).filter((node) => node.type === "tr" && node.props.onClick);
    const row = rows[members.findIndex((member) => member.id === memberId)];
    const control = target === "row" ? row : elements(row).find((node) =>
      target === "name" ? node.props.className === "warrior-name"
        : target === "remove" ? node.props.className === "remove-button remove-text-button"
          : node.type === target);
    assert.ok(control, `Missing ${target} control`);
    if (target === "name") assert.equal(control.props["aria-expanded"], memberId === activeMemberId);
    let stopped = false;
    control.props.onClick({ stopPropagation: () => { stopped = true; } });
    if (control !== row && !stopped) row.props.onClick();
  }
  for (const member of members) {
    for (const target of ["row", "name"]) {
      const start = selections.length;
      click(member.id, target);
      assert.equal(activeMemberId, member.id);
      assert.match(render(MemberTable, { ...props, activeMemberId }), /member-details-row/);
      for (const control of member.role === "Hero" ? ["input", "remove"] : ["input", "select", "remove"]) {
        click(member.id, control);
        assert.equal(activeMemberId, member.id);
      }
      click(member.id, target);
      assert.equal(activeMemberId, null);
      assert.doesNotMatch(render(MemberTable, { ...props, activeMemberId }), /member-details-row/);
      assert.deepEqual(selections.slice(start), [member.id, null]);
    }
  }
  click("hero", "name");
  click("group", "name");
  assert.equal(activeMemberId, "group");
  assert.deepEqual(selections.slice(-2), ["hero", "group"]);
});

test("Hero rows visibly identify only the current leader and follow succession", () => {
  const members = [
    { id: "captain", name: "Captain", role: "Hero", type: "Captain", stats: {}, experience: "20", groupSize: 1, position: 0 },
    { id: "champion", name: "Champion", role: "Hero", type: "Champion", stats: {}, experience: "8", groupSize: 1, position: 1 },
    { id: "henchman", name: "Swordsmen", role: "Henchman", type: "Swordsman", stats: {}, experience: "0", groupSize: 1, position: 2 },
  ];
  const props = {
    members, activeMemberId: null, warriorTypes: [], memberOrderCustomized: false,
    onReorderMembers: () => {}, onSelectMember: () => {}, onSelectWarriorType: () => {},
    onUpdateMember: () => {}, onRemoveMember: () => {}, isPromotedHenchman: () => false,
    isWarriorTypeAtLimit: () => false, warriorTypeOptionLabel: () => "",
  };
  for (const leaderId of ["captain", "champion"]) {
    const html = render(MemberTable, { ...props, leaderId });
    assert.equal((html.match(/class="leader-badge"/g) || []).length, 1);
    const leader = members.find((member) => member.id === leaderId);
    assert.match(html, new RegExp(`<strong>${leader.name}</strong><span class="leader-badge"`));
    assert.match(html, /Current warband leader/);
    assert.match(html, /aria-hidden="true"/);
  }
  for (const leaderId of [null, "henchman"]) {
    assert.doesNotMatch(render(MemberTable, { ...props, leaderId }), /leader-badge/);
  }
});

test("Leader is shown as a granted ability, cannot be forgotten, and does not lock skill lists", () => {
  const skill = { id: "leader", warriorSkillId: "leader", name: "Leader", category: "Special",
    description: "Members within 6 inches may use the leader's Leadership.", isLeaderAbility: true };
  const html = render(SkillsPanel, {
    member: { role: "Hero" }, loading: false, error: "", listPicker: React.createElement("span", null, "Choose lists"),
    data: { learnedSkills: [skill], eligibility: [], availableSkills: [], pendingSkillAdvances: [] },
  });
  assert.match(html, /Current leader/);
  assert.match(html, /Choose lists/);
  assert.match(html, /disabled="" aria-label="Leader is granted while leading"/);
  assert.doesNotMatch(html, /Forget Leader/);
});

test("print tracks have every XP box, marked earned XP, and exact advancement thresholds", () => {
  for (const [role, count, thresholds] of [
    ["Hero", 90, [2, 4, 6, 8, 11, 14, 17, 20, 24, 28, 32, 36, 41, 46, 51, 57, 63, 69, 76, 83, 90]],
    ["Henchman", 14, [2, 5, 9, 14]],
    ["Hired Sword", 14, [2, 5, 9, 14]],
  ]) {
    const html = render(PrintExperienceTrack, { role, experience: "3", canGainExperience: true });
    assert.equal((html.match(/class="print-experience-point/g) || []).length, count);
    assert.equal((html.match(/ is-earned/g) || []).length, 3);
    assert.deepEqual([...html.matchAll(/aria-label="(\d+) XP, advancement/g)].map((match) => Number(match[1])), thresholds);
    assert.equal((html.match(/>X<\/span>/g) || []).length, 3);
    assert.match(html, new RegExp(`aria-label="${count} XP, advancement"`));
  }
});

test("zero XP leaves all boxes writable; non-advancing warriors do not get a track", () => {
  const empty = render(PrintExperienceTrack, { role: "Hero", experience: "0", canGainExperience: true });
  assert.equal((empty.match(/class="print-experience-point/g) || []).length, 90);
  assert.doesNotMatch(empty, /is-earned/);
  const fixed = render(PrintExperienceTrack, { role: "Henchman", experience: "0", canGainExperience: false });
  assert.match(fixed, /does not gain experience/);
  assert.doesNotMatch(fixed, /print-experience-point/);
});

test("a printed roster with only one warrior still includes the full experience track", () => {
  const member = { id: "hero", name: "First warrior", type: "Youngblood", role: "Hero", experience: "0", groupSize: 1, stats: {} };
  const html = render(RosterPrintSheet, {
    data: {
      roster: { name: "Test roster", warband: "Mercenaries", treasury: "500", rating: 5, wyrdstone: 0, battlesFought: 3 },
      printedAt: "2026-10-05",
      sheets: [{ member, equipment: null, skills: null, spells: null, advancements: { canGainExperience: true } }],
      stash: [{ id: "stash-1", name: "Tome of Magic", category: "misc", quantity: 1, unitCostPaid: 250, description: "A wizard's tome." }],
    },
  });
  assert.equal((html.match(/class="print-member"/g) || []).length, 1);
  assert.equal((html.match(/class="print-experience-point/g) || []).length, 90);
  assert.match(html, /Warband stash/);
  assert.match(html, /<dt>Battles<\/dt><dd>3<\/dd>/);
  assert.match(html, /Tome of Magic ×1/);
  assert.match(html, /A wizard&#x27;s tome\./);
  assert.match(html, /<dt>Total Fielded<\/dt><dd>1 warriors<\/dd>/);
  assert.match(html, /<dt>Rout Test At<\/dt><dd>1 out of action \(25%\)<\/dd>/);
});

test("PDF includes warband and member reference summaries, grade and full source link", () => {
  const sourceUrl = "https://mordheimer.net/docs/warbands/grade-1b-warbands/forest-goblins";
  const html = render(RosterPrintSheet, { data: {
    roster: {
      name: "Forest", warband: "Forest Goblins", treasury: "500", wyrdstone: 0, rating: 5,
      capacity: { currentMembers: 1, maxMembers: 20, grade: "1b", sourceUrl,
        specialRules: [{ name: "Reference only", summary: "A manual warband rule." }] },
    },
    sheets: [{
      member: { id: "leader", name: "Leader", type: "Chieftain", role: "Hero", experience: "0", groupSize: 1,
        stats: {}, specialRules: [{ name: "Warrior rule", summary: "A manual warrior rule." }] },
      equipment: null, skills: null, spells: null, advancements: { canGainExperience: true },
    }],
    stash: [], printedAt: "2026-10-06",
  } });
  assert.match(html, /<dt>Grade<\/dt><dd>1B<\/dd>/);
  assert.match(html, /Reference summaries; resolve effects manually/);
  assert.match(html, /A manual warband rule/);
  assert.match(html, /A manual warrior rule/);
  assert.ok(html.includes(`href="${sourceUrl}"`));
});

test("PDF fielding counts include every Henchman model and Hired Sword, independently of capacity", () => {
  for (const [members, total, threshold] of [
    [[], 0, "—"],
    [[{ role: "Hero", groupSize: 1 }, { role: "Henchman", groupSize: 5 }, { role: "Hired Sword", groupSize: 1 }], 7, "2"],
    [[{ role: "Henchman", groupSize: 4 }], 4, "1"],
    [[{ role: "Henchman", groupSize: 5 }], 5, "2"],
  ]) {
    const html = render(RosterPrintSheet, { data: {
      roster: { name: "Fielding Test", treasury: "0", wyrdstone: "0", rating: 0, capacity: { currentMembers: 99, maxMembers: 100 } },
      sheets: members.map((member, index) => ({ member: { ...member, id: String(index), name: "Warrior", stats: {}, experience: "0" }, equipment: null, skills: null, spells: null, advancements: { canGainExperience: false } })),
      stash: [], printedAt: "2026-10-05",
    } });
    assert.match(html, new RegExp(`<dt>Total Fielded</dt><dd>${total} warriors</dd>`));
    assert.match(html, new RegExp(`<dt>Rout Test At</dt><dd>${threshold} out of action \\(25%\\)</dd>`));
    const summary = render(RosterSummary, {
      roster: { members, rating: 0 },
      heroes: members.filter((member) => member.role === "Hero").length,
      henchmen: members.filter((member) => member.role === "Henchman").reduce((total, member) => total + member.groupSize, 0),
      hiredSwords: members.filter((member) => member.role === "Hired Sword").length,
    });
    assert.match(summary, new RegExp(`TOTAL FIELDED</span><strong>${total} `));
    assert.match(summary, new RegExp(`ROUT TEST AT</span><strong>${threshold} `));
  }
});

test("printed equipment keeps shop and legacy items with the same name separate", () => {
  const member = { id: "hero", name: "Test Hero", type: "Warrior", role: "Hero", experience: "0", groupSize: 1, stats: {} };
  const equipmentItem = {
    name: "Sword", category: "weapon", listName: "Common", modelIndex: 0, quantity: 1,
    unitCostPaid: 10, sourceReference: "Core", stats: null, description: "",
  };
  const inventory = [
    { ...equipmentItem, id: "legacy", equipmentOptionId: "sword-option", shopItemId: null },
    { ...equipmentItem, id: "shop", equipmentOptionId: "campaign/custom-sword", shopItemId: "campaign/custom-sword", description: "Custom shop sword." },
  ];
  const stacks = equipmentStacks({ equipment: { inventory } });
  assert.equal(stacks.length, 2);
  assert.notEqual(stacks[0].key, stacks[1].key);
  const html = render(RosterPrintSheet, {
    data: {
      roster: { name: "Test roster", warband: "Mercenaries", treasury: "100", rating: 1, wyrdstone: 0 },
      printedAt: "2026-10-05",
      sheets: [{
        member,
        equipment: {
          inventory,
          mutations: { entries: [] },
        },
        skills: null,
        spells: null,
        advancements: { canGainExperience: true },
      }],
      stash: [],
    },
  });
  assert.equal((html.match(/<li>Sword<\/li>/g) || []).length, 2);
});

test("skill controls are hidden when disabled while characteristic purchases remain visible", () => {
  const data = { enabled: true, skillsEnabled: false, canPurchase: true, nextExperience: 2, stats: [], skillCost: 40, skillAllowance: 0, availableSkills: [] };
  const html = render(AdvancePurchasePanel, { data, treasury: "500", onPurchase: async () => true });
  assert.match(html, /PURCHASE CHARACTERISTIC/);
  assert.match(html, /Skill purchases are disabled/);
  assert.doesNotMatch(html, /PURCHASE SKILL/);
  assert.match(render(AdvancePurchasePanel, { data: { ...data, skillsEnabled: true }, treasury: "500", onPurchase: async () => true }), /PURCHASE SKILL/);
});

test("campaign purchase settings remain opt-in by default", () => {
  const html = render(NewCampaignDialog, { error: "", onCancel: () => {}, onSubmit: async () => true });
  assert.match(html, /Allow purchased advancements/);
  assert.match(html, /Trading rules/);
  assert.match(html, /<input type="checkbox"\/>Allow purchased advancements/);
  assert.match(html, /type="checkbox" checked=""\/>Not a rare item \(default\)/);
});

test("custom item defaults to valid common rarity without catalog restriction data", () => {
  assert.equal(isCustomShopItemValid({
    name: "Herbs", description: "Useful herbs.", baseCost: "20", rarity: "", rarityIsCommon: true,
  }), true);
  assert.equal(isCustomShopItemValid({
    name: "Herbs", description: "Useful herbs.", baseCost: "20", rarity: "", rarityIsCommon: false,
  }), false);
  assert.equal(isCustomShopItemValid({
    name: "Herbs", description: "Useful herbs.", baseCost: "", rarity: "", rarityIsCommon: true,
  }), false);
  const html = render(NewCampaignDialog, { error: "", onCancel: () => {}, onSubmit: async () => true });
  assert.match(html, /Not a rare item \(default\)/);
});

test("warband trading panel exposes its stash surface and marks read-only access", () => {
  const roster = { id: "roster-1", members: [], campaignId: null };
  const html = render(WarbandTradingPanel, {
    roster,
    request: async () => ({ shop: [], stash: [], memberInventory: [], heroes: [], searches: [], canPurchase: true, canSearch: true, canTransfer: true, treasury: "100" }),
    onChanged: async () => {},
    onUpdateRoster: () => {},
    readOnly: true,
  });
  assert.match(html, /Warband stash/);
  assert.match(html, /Read-only view/);
  assert.match(html, /Loading stash and Trading Post/);
  assert.match(html, /Trading Post listings/);
  assert.match(html, /Gold Crowns/);
  assert.match(html, /Wyrdstone/);
});

test("Trading Post naming is consistent before and after the first Freebuild battle", () => {
  const originalUseState = React.useState;
  const data = { shop: [], stash: [], memberInventory: [], heroes: [], searches: [],
    canPurchase: true, canSearch: false, canTransfer: true, treasury: "100" };
  try {
    for (const battlesFought of [0, 1]) {
      let stateIndex = 0;
      React.useState = (initial) => originalUseState(stateIndex++ === 0 ? data : initial);
      const html = render(WarbandTradingPanel, {
        roster: { id: "roster-1", members: [], campaignId: null, battlesFought, treasury: "100" },
        request: async () => data, onChanged: async () => {}, onUpdateRoster: () => {}, readOnly: false,
      });
      assert.match(html, /<h3>Trading Post<\/h3>/);
      assert.doesNotMatch(html, /Mordheim shop|Item Shop/);
      if (battlesFought === 0) {
        assert.match(html, /The Trading Post opens after your first battle/);
        assert.doesNotMatch(html, /aria-label="Trading Post category"/);
      } else {
        assert.match(html, /aria-label="Trading Post category"/);
        assert.match(html, /After the first battle, buy here into the stash/);
      }
    }
  } finally {
    React.useState = originalUseState;
  }
});

test("trading data refresh key tracks campaign permission-changing transitions", () => {
  const base = {
    id: "roster-1",
    campaignId: "campaign-1",
    campaign: { phase: "post_battle", step: 6, allowedActions: ["purchase"] },
  };
  const key = tradingDataRefreshKey(base);
  assert.notEqual(tradingDataRefreshKey({ ...base, campaign: { ...base.campaign, step: 9 } }), key);
  assert.notEqual(tradingDataRefreshKey({ ...base, campaign: { ...base.campaign, phase: "pre_battle", step: 1 } }), key);
  assert.notEqual(tradingDataRefreshKey({ ...base, campaign: { ...base.campaign, allowedActions: ["purchase", "transfer"] } }), key);
});

test("post-battle injury controls use injury phase metadata and fall back to roster Heroes", () => {
  assert.equal(isCampaignInjuryStep({ phase: "post_battle", step: 1, stepLabel: "Injuries" }), true);
  assert.equal(isCampaignInjuryStep({ phase: "post_battle", step: "1", stepLabel: "Injuries" }), true);
  assert.equal(isCampaignInjuryStep({ phase: "post_battle", step: 2, stepLabel: "Experience" }), false);
  assert.equal(isCampaignInjuryStep({ phase: "post_battle", step: 2, stepLabel: "Injuries" }), false);
  assert.equal(isCampaignInjuryStep({ phase: "pre_battle", step: 1, stepLabel: "Injuries" }), false);
  assert.equal(isHeroStatusWindow({ phase: "battle", step: 2, stepLabel: "Turn" }), true);
  assert.equal(isHeroStatusWindow({ phase: "post_battle", step: 1, stepLabel: "Injuries" }), true);
  assert.equal(isHeroStatusWindow({ phase: "post_battle", step: 2, stepLabel: "Injuries" }), false);
  const data = { heroes: [] };
  const roster = { members: [{ id: "hero-1", name: "Captain", role: "Hero" }, { id: "henchman-1", name: "Swordsman", role: "Henchman" }] };
  assert.deepEqual(tradingHeroes(data, roster), [{ id: "hero-1", name: "Captain", outOfAction: false, searched: false }]);
});

test("manual trading dice require the exact count and valid d6 values", () => {
  assert.deepEqual(parseTradingDice("2, 5", 2), [2, 5]);
  assert.equal(parseTradingDice("2", 2), null);
  assert.equal(parseTradingDice("2, 7", 2), null);
  assert.deepEqual(parseTradingDice("", 0), []);
});

test("rarity overrides take precedence for the selected warrior type, including common overrides", () => {
  const item = { id: "mount", rarity: 12, rarityOverrides: { "Human Hero": null, "Dwarf Hero": 10 } };
  assert.equal(shopItemRarityForType(item, "Human Hero"), null);
  assert.equal(shopItemRarityForType(item, "Dwarf Hero"), 10);
  assert.equal(shopItemRarityForType(item, "Other Hero"), 12);
});

test("one active Hero with a common override makes campaign purchase common", () => {
  const item = { id: "holy-unholy-relic", rarity: 6, rarityOverrides: { "Sister Superior": null, "Warrior Priest": null } };
  const heroes = [
    { id: "sister", name: "Sister", outOfAction: false, searched: true },
    { id: "priest", name: "Priest", outOfAction: true, searched: false },
  ];
  const members = [
    { id: "sister", type: "Sister Superior" },
    { id: "priest", type: "Warrior Priest" },
  ];
  assert.equal(shopItemPurchaseRarity(item, heroes, members), null);
  assert.equal(shopItemPurchaseRarity(item, [{ ...heroes[0], outOfAction: true }, heroes[1]], members), 6);
});

test("stash item recipient dropdown contains only service-approved warriors", () => {
  const entry = { id: "stash", name: "Sword", category: "weapon", quantity: 2, unitCostPaid: 10,
    eligibleRecipients: [{ memberId: "eligible", allowIndividualGroupGear: false }] };
  const roster = { members: [{ id: "eligible", name: "Eligible Hero", role: "Hero" },
    { id: "banned", name: "Ineligible warrior", role: "Hero" }] };
  const html = render(StashItem, { entry, roster, enabled: true, onSend: async () => {} });
  assert.match(html, /Recipient for Sword/);
  assert.match(html, /Eligible Hero/);
  assert.doesNotMatch(html, /Ineligible warrior/);
  assert.doesNotMatch(html, /DIRECTION|Choose inventory item/);
  const unavailable = render(StashItem, { entry: { ...entry, eligibleRecipients: [] }, roster, enabled: true });
  assert.match(unavailable, /No warriors in this warband can use this item/);
});

test("character return controls preserve shared-group and individual model semantics", () => {
  const entry = { id: "gear", name: "Sword", modelIndex: 1, returnQuantity: 2, returnModelIndex: -1 };
  const shared = render(InventoryStashReturn, { entry, enabled: true, onReturn: async () => {} });
  assert.match(shared, /RETURN PER MODEL/);
  assert.match(shared, /Return to stash · all models/);
  assert.match(shared, /max="2"/);
  const individual = render(InventoryStashReturn, { entry: { ...entry, returnModelIndex: 1 }, enabled: false });
  assert.match(individual, /Return quantity for Sword model 2/);
  assert.doesNotMatch(individual, /all models|PER MODEL/);
  assert.match(individual, /disabled=""/);
  const hiredSword = render(InventoryStashReturn, { entry: { ...entry, modelIndex: -1 }, enabled: true });
  assert.match(hiredSword, /Return quantity for Sword"/);
  assert.doesNotMatch(hiredSword, /all models|PER MODEL|model 0/);
});

test("shop-originated member gear cannot be sold for a refund", () => {
  const member = { id: "hero", name: "Test Hero", role: "Hero", groupSize: 1 };
  const inventoryItem = {
    id: "gear-1", equipmentOptionId: "tome", name: "Tome of Magic", category: "misc", listName: "Common",
    modelIndex: 0, quantity: 1, unitCostPaid: 25, sourceReference: "Core", stats: null,
    shopItemId: "campaign/custom-tome", description: "A one-of-a-kind tome with full text.",
  };
  const props = {
    member, treasury: "100", loading: false, error: "", purchaseLocked: true,
    data: { role: "Hero", groupSize: 1, availableOptions: [], inventory: [inventoryItem], mutations: { eligible: false, entries: [] } },
    onPurchase: async () => {}, onSell: async () => {}, onSetMutations: async () => true,
    stashReturns: [{ ...inventoryItem, returnQuantity: 1, returnModelIndex: 0 }],
    canReturnToStash: true, onReturnToStash: async () => {},
  };
  const shopGear = render(EquipmentInventoryPanel, props);
  assert.match(shopGear, /Buy through the Trading Post into Warband stash/);
  assert.match(shopGear, /No refund/);
  assert.match(shopGear, /Return to stash/);
  assert.doesNotMatch(shopGear, /Sell ×/);
  assert.match(shopGear, /A one-of-a-kind tome with full text\./);
  const legacyGear = render(EquipmentInventoryPanel, {
    ...props,
    data: { ...props.data, inventory: [{ ...inventoryItem, shopItemId: null, description: "" }] },
  });
  assert.match(legacyGear, /Refund ×1 · 25 GC/);
});

test("Tome learning requires a carried Tome and Arcane Lore, with no manual recording shortcut", () => {
  const data = {
    role: "Hero", warriorTypeName: null, hasSpellcastingProfile: false, canShowSpellSection: true,
    hasArcaneLore: false, hasAcademicSkillAccess: true, canLearnLesserMagic: false, lesserMagicUnlocked: false,
    isWizard: false, castingRollBonus: 0, tomeAllowed: true, tomeInventory: [], selectedSpellDisciplineId: null,
    disciplineChoices: [], availableDisciplines: [], startingSpellCount: null, startingSpellCountLearned: 0,
    startingSpellsRemaining: 0, canLearnSpellFromAdvance: false, knownSpells: [],
  };
  const callbacks = {
    onLearn: async () => true, onRoll: async () => null, onForget: async () => {},
    onReduceDifficulty: async () => true, onSetDiscipline: async () => true,
    onConsumeTome: async () => true,
  };
  const freebuild = render(SpellPanel, { data, pendingAdvanceId: null, loading: false, error: "", ...callbacks });
  assert.doesNotMatch(freebuild, /Record acquired Tome|GC PAID|Learn Lesser Magic · consume/);
  assert.match(freebuild, /through the Trading Post and transfer it from Warband stash/);
  assert.match(freebuild, /Learn Arcane Lore from the Academic skill list/);
  const missingTome = render(SpellPanel, { data: { ...data, hasArcaneLore: true },
    pendingAdvanceId: null, loading: false, error: "", ...callbacks });
  assert.match(missingTome, /Transfer a Tome of Magic from Warband stash to this Hero/);
  assert.doesNotMatch(missingTome, /Learn Lesser Magic · consume/);
  const ready = render(SpellPanel, { data: { ...data, hasArcaneLore: true, canLearnLesserMagic: true,
    tomeInventory: [{ id: "tome", quantity: 2, unitCostPaid: 225, acquiredAt: "2026-10-09" }] },
  pendingAdvanceId: null, loading: false, error: "", ...callbacks });
  assert.match(ready, /TOME OF MAGIC INVENTORY · 2 owned/);
  assert.match(ready, /Learn Lesser Magic · consume 1 Tome of Magic/);
  assert.doesNotMatch(ready, /Record acquired Tome|GC PAID/);
  const learned = render(SpellPanel, { data: { ...data, hasArcaneLore: true, lesserMagicUnlocked: true },
    pendingAdvanceId: null, loading: false, error: "", ...callbacks });
  assert.match(learned, /Lesser Magic is unlocked/);
  assert.doesNotMatch(learned, /Learn Lesser Magic · consume/);
});
