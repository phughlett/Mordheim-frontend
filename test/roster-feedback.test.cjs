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
const { CombatSpoils, AssignedEquipment, StashItem, WarbandTradingPanel, isCampaignInjuryStep, isHeroStatusWindow, parseTradingDice, shopItemPurchaseRarity, shopItemRarityForType, tradingDataRefreshKey, tradingHeroes } = require("../app/features/roster/components/warband-trading-panel.tsx");
const { EquipmentInventoryPanel, InventoryStashReturn } = require("../app/features/roster/components/equipment-inventory-panel.tsx");
const { SpellPanel } = require("../app/features/roster/components/spell-panel.tsx");
const { CapacityPanel } = require("../app/features/roster/components/capacity-panel.tsx");
const { SkillsPanel } = require("../app/features/roster/components/skills-panel.tsx");
const { RosterFields, WarbandCurrency } = require("../app/features/roster/components/roster-fields.tsx");
const { RosterHeading } = require("../app/features/roster/components/roster-heading.tsx");
const { MemberTable } = require("../app/features/roster/components/member-table.tsx");
const { RosterSummary } = require("../app/features/roster/components/roster-summary.tsx");
if (previousAuth) require.cache[authPath] = previousAuth;
else delete require.cache[authPath];
require.extensions[".ts"] = previous.ts;
require.extensions[".tsx"] = previous.tsx;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));

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
      roster: { name: "Test roster", warband: "Mercenaries", treasury: "500", rating: 5, wyrdstone: 0 },
      printedAt: "2026-10-05",
      sheets: [{ member, equipment: null, skills: null, spells: null, advancements: { canGainExperience: true } }],
      stash: [{ id: "stash-1", name: "Tome of Magic", category: "misc", quantity: 1, unitCostPaid: 250, description: "A wizard's tome." }],
    },
  });
  assert.equal((html.match(/class="print-member"/g) || []).length, 1);
  assert.equal((html.match(/class="print-experience-point/g) || []).length, 90);
  assert.match(html, /Warband stash/);
  assert.match(html, /Tome of Magic ×1/);
  assert.match(html, /A wizard&#x27;s tome\./);
  assert.match(html, /<dt>Total Fielded<\/dt><dd>1 warriors<\/dd>/);
  assert.match(html, /<dt>Rout Test At<\/dt><dd>1 out of action \(25%\)<\/dd>/);
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
  assert.match(html, /Loading stash and shop/);
  assert.match(html, /Gold Crowns/);
  assert.match(html, /Wyrdstone/);
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
  assert.match(shopGear, /No refund/);
  assert.match(shopGear, /Return to stash/);
  assert.doesNotMatch(shopGear, /Sell ×/);
  assert.match(shopGear, /A one-of-a-kind tome with full text\./);
  const legacyGear = render(EquipmentInventoryPanel, {
    ...props,
    data: { ...props.data, inventory: [{ ...inventoryItem, shopItemId: null, description: "" }] },
  });
  assert.match(legacyGear, /Sell ×1 · 25 GC/);
});

test("manual Tome recording is available only outside campaigns", () => {
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
    onRecordTome: async () => true, onConsumeTome: async () => true,
  };
  const freebuild = render(SpellPanel, { data, pendingAdvanceId: null, loading: false, error: "", ...callbacks });
  const campaign = render(SpellPanel, { data, pendingAdvanceId: null, loading: false, error: "", allowTomeRecording: false, ...callbacks });
  assert.match(freebuild, /Record acquired Tome/);
  assert.doesNotMatch(campaign, /Record acquired Tome/);
  assert.match(campaign, /Manual Tome recording is disabled/);
});
