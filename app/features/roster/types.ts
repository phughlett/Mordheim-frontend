export const statLabels = ["M", "WS", "BS", "S", "T", "W", "I", "A", "Ld"] as const;

export type StatLabel = (typeof statLabels)[number];
export type MemberRole = "Hero" | "Henchman" | "Hired Sword";
export type WarbandGrade = "core" | "1a" | "1b" | "1c";
export interface SourceRule {
  name: string;
  summary: string;
}

export interface WarbandOption {
  id: string;
  name: string;
  displayName?: string;
  grade?: WarbandGrade | null;
  sourceUrl?: string | null;
  specialRules?: SourceRule[];
  sourceReference: string;
  maxHeroes: number;
  maxMembers: number;
  limitsSourceReference: string;
  limitsRule: string;
}

export interface CapacityModifier {
  id: string;
  name: string;
  member_limit_bonus: number;
  excluded_warbands: string[];
  source_reference: string;
  rule_text: string;
}

export interface RosterCapacity {
  grade?: WarbandGrade | null;
  sourceUrl?: string | null;
  specialRules?: SourceRule[];
  currentMembers: number;
  currentHeroes: number;
  maxHeroes: number;
  baseMaxMembers: number;
  maxMembers: number;
  memberTypeBonus: number;
  itemBonus: number;
  leader: { id: string; name: string } | null;
  limitsSourceReference: string;
  limitsRule: string;
  selectedModifiers: CapacityModifier[];
  availableModifiers: CapacityModifier[];
}

export interface WarriorTypeOption {
  specialRules?: SourceRule[];
  id: string;
  name: string;
  category: MemberRole;
  stats: Partial<Record<StatLabel, string>>;
  large: boolean;
  startingExperience: number | null;
  startingEquipment: string | null;
  equipmentChoices: HiredSwordEquipmentChoice[];
  canGainExperience: boolean;
  experienceRule: string | null;
  availability: "allowed" | "conditional";
  promotionEligibility: "eligible" | "ineligible" | "unverified" | "not_applicable";
  promotionRule: string | null;
  memberLimitBonus: number;
  sheetOrder: number | null;
  hireCost: number | null;
  hireCostSource: string | null;
  maxCount: number | null;
  maxCountReferenceTypes: string[];
  maxCountMultiplier: number;
  maxCountRule: string | null;
  sourceReference: string | null;
  ruleText: string | null;
  conditionText: string | null;
  mutationRequired: boolean;
  mutationOptions: MutationOption[];
}

export interface MutationOption {
  id: string;
  name: string;
  unitCost: number;
  effectText: string;
  sourceReference: string;
}

export interface MutationInventory {
  eligible: boolean;
  required: boolean;
  canEdit: boolean;
  availableOptions: MutationOption[];
  entries: (MutationOption & { mutationId: string; unitCostPaid: number })[];
  totalCost: number;
}

export interface HiredSwordEquipmentChoice {
  id: string;
  label: string;
  equipment: string;
}

export interface Member {
  specialRules?: SourceRule[];
  id: string;
  name: string;
  groupSize: number;
  type: string;
  warriorTypeId: string | null;
  memberLimitBonus: number;
  large: boolean;
  ratingBaseOverride: number | null;
  ratingExperienceMultiplier: number;
  role: MemberRole;
  experience: string;
  minimumExperience?: number;
  stats: Record<StatLabel, string>;
  initialStats?: Partial<Record<StatLabel, string>>;
  maximumStats?: Partial<Record<StatLabel, number>> | null;
  equipment: string;
  skills: string;
  notes: string;
  position: number;
}

export interface WarriorAdvance {
  id: string;
  advanceTable: "Hero" | "Henchman";
  experienceThreshold: number;
  mode: "manual" | "simulated";
  roll: number | null;
  secondaryRoll: number | null;
  result: "stat_increase" | "new_skill" | "lads_got_talent";
  stat: StatLabel | null;
  learnedSkillId?: string | null;
  learnedSkillName?: string | null;
  learnedSkillCategory?: string | null;
  learnedSpellName?: string | null;
  reducedSpellName?: string | null;
  createdAt: string;
  consumedAt: string | null;
  canRemove: boolean;
  purchaseCost: number | null;
  experienceBeforePurchase: number | null;
}

export interface AdvancePurchaseRules {
  enabled: boolean;
  skillsEnabled: boolean;
  skillCost: number;
  stats: Record<StatLabel, { firstCost: number; additionalCost: number; maxIncreases: number | null }>;
}

export type ShopCategory = "weapon" | "armour" | "shield" | "misc";

export interface MordheimMapType {
  id: string;
  name: string;
  rolls: number[];
  effect: string;
}

export type MapSelection = { mode: "choose"; type: string } | { mode: "manual" | "simulated"; dice?: number[] };

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  baseCost: number;
  priceDice: number;
  priceMultiplier: number;
  rarity: number | null;
  rarityOverrides?: Record<string, number | null>;
  description: string;
  sourceReference: string;
  disabled?: boolean;
  allowedWarbands?: string[];
  excludedWarbands?: string[];
  allowedTypeNames?: string[];
  excludedTypeNames?: string[];
  heroOnly?: boolean;
  requiredSkill?: string;
  grade?: "core" | "1a" | "1b";
  shopCategory?: "close-combat" | "missile" | "blackpowder" | "armour" | "miscellaneous" | "animals";
  canPurchase?: boolean;
  creationOnly?: boolean;
  maxPerWarband?: number;
  maxPerModel?: number;
  requiresOwnedItem?: string;
  skillByWarband?: Record<string, string>;
  spellcasterOnly?: boolean;
  allowedRoles?: string[];
  purchaseAction?: "ritual" | "permanent-upgrade";
  priceOverrides?: { typeNames: string[]; baseCost: number; priceDice: number; priceMultiplier: number }[];
  mapTypes?: MordheimMapType[];
}

export interface TradingRules {
  overrides: Record<string, {
    disabled?: boolean;
    baseCost?: number;
    priceDice?: number;
    priceMultiplier?: number;
    rarity?: number | null;
  }>;
  customItems: ShopItem[];
}

export interface InventoryEntry {
  id: string;
  name: string;
  category: ShopCategory;
  quantity: number;
  unitCostPaid: number;
  shopItemId: string | null;
  equipmentOptionId: string | null;
  description: string;
  memberId?: string;
  modelIndex?: number;
  eligibleRecipients?: { memberId: string; allowIndividualGroupGear: boolean }[];
  returnQuantity?: number;
  returnModelIndex?: number;
  nontransferable?: boolean;
  boundWarriorId?: string | null;
  upgradeQuantity?: number;
  unitSaleValue?: number | null;
  saleRestriction?: string | null;
  mapResult?: { type: string; mode: "choose" | "manual" | "simulated"; roll: number | null };
}

export interface TradingSearch {
  id: string;
  heroId: string | null;
  heroName: string;
  itemId: string;
  itemName: string;
  dice: number[];
  modifier: number;
  total: number;
  success: boolean;
  purchased: boolean;
}

export interface TradingHero {
  id: string;
  name: string;
  outOfAction: boolean;
  searched: boolean;
  spellcaster?: boolean;
}

export interface TradingData {
  shop: ShopItem[];
  stash: InventoryEntry[];
  memberInventory: InventoryEntry[];
  heroes: TradingHero[];
  searches: TradingSearch[];
  canPurchase: boolean;
  canSell: boolean;
  canSearch: boolean;
  canTransfer: boolean;
  treasury: string;
}

export interface TradingQuote {
  id: string;
  itemId: string;
  price: number;
  dice: number[];
}

export interface AdvancePurchaseOptions {
  enabled: boolean;
  skillsEnabled: boolean;
  canPurchase: boolean;
  pendingAdvances: boolean;
  nextExperience: number | null;
  stats: { stat: StatLabel; cost: number; purchasedCount: number; maxIncreases: number | null; racialMaximum: number | null; available: boolean }[];
  skillCost: number;
  skillAllowance: number;
  availableSkills: SkillOption[];
}

export interface WarriorAdvancementsData {
  role: MemberRole;
  experience: number;
  lockedExperience: number;
  pendingCount: number;
  minimumExperience: number;
  advanceTable: "Hero" | "Henchman";
  advanceBaseline: number;
  pending: boolean;
  nextAdvanceThreshold: number | null;
  canGainExperience: boolean;
  experienceRule: string | null;
  warriorTypeName: string | null;
  initialStats: Partial<Record<StatLabel, string | number>>;
  stats: Record<StatLabel, string | number>;
  maximumProfile: string | null;
  maximumStats: Partial<Record<StatLabel, number>> | null;
  availableStats: StatLabel[];
  canPromote: boolean;
  pendingSkillAdvances: { id: string; experienceThreshold: number }[];
  history: WarriorAdvance[];
  purchases: AdvancePurchaseOptions;
}

export interface PurchaseAdvanceInput {
  stat?: StatLabel;
  skillId?: string;
}

export interface RecordAdvanceInput {
  mode: "manual" | "simulated";
  result?: "stat_increase" | "new_skill" | "lads_got_talent";
  stat?: StatLabel;
}

export type EquipmentCategory = "weapon" | "armour" | "shield" | "set" | "misc";

export interface EquipmentSpecialRule {
  name: string;
  description: string;
}

export interface WeaponStatProfile {
  name: string;
  weaponType: "close_combat" | "missile" | "blackpowder" | "special";
  rangeText: string;
  strengthModifier: string;
  specialRules: EquipmentSpecialRule[];
  notes: string | null;
  sourceReference: string;
}

export interface ArmourStatProfile {
  name: string;
  itemType: "armour" | "shield" | "helmet";
  saveText: string | null;
  movementPenalty: string | null;
  specialRules: EquipmentSpecialRule[];
  notes: string | null;
  sourceReference: string;
}

export interface WeaponMaterialModifier {
  name: string;
  effectText: string;
  costMultiplier: number;
  sourceReference: string;
}

export interface WeaponPoison {
  name: string;
  effectText: string;
  sourceReference: string;
}

export interface EquipmentStats {
  weapon: WeaponStatProfile | null;
  armour: ArmourStatProfile | null;
  materialModifier: WeaponMaterialModifier | null;
  poison: WeaponPoison | null;
}

export interface EquipmentOption {
  id: string;
  name: string;
  category: EquipmentCategory;
  unitCost: number;
  firstFree: boolean;
  listKey: string;
  listName: string;
  sourceReference: string;
  ruleText: string | null;
  equipmentRule: string;
  allowIndividualGroupGear: boolean;
  stats: EquipmentStats | null;
}

export interface WarriorInventoryItem {
  id: string;
  equipmentOptionId: string;
  name: string;
  category: EquipmentCategory;
  listName: string;
  modelIndex: number;
  quantity: number;
  unitCostPaid: number;
  sourceReference: string;
  stats: EquipmentStats | null;
  shopItemId?: string | null;
  description?: string;
  unitSaleValue?: number | null;
  saleRestriction?: string | null;
  mapResult?: InventoryEntry["mapResult"];
}

export interface WarriorEquipmentData {
  role: MemberRole;
  groupSize: number;
  availableOptions: EquipmentOption[];
  inventory: WarriorInventoryItem[];
  mutations: MutationInventory;
  canSell?: boolean;
  recruitmentRefund?: boolean;
}

export type SkillCategory = "Combat" | "Shooting" | "Strength" | "Speed" | "Special" | "Academic";

export interface SkillCategoryChoice {
  category: SkillCategory | string;
  specialListName: string | null;
}

export interface SkillOption {
  id: string;
  name: string;
  category: string;
  description: string;
  warbandId: string | null;
  warriorTypeId: string | null;
  specialListName: string | null;
  appliesToWarriorTypeNames: string[] | null;
  sourceReference: string;
  isStarting: boolean;
  isLearnable: boolean;
}

export interface LearnedSkill extends SkillOption {
  warriorSkillId: string;
  acquiredAt: string | null;
  isLeaderAbility?: boolean;
  notes: string | null;
  isStarting: boolean;
  purchaseCost: number | null;
}

export interface WarriorSkillsData {
  role: MemberRole;
  isPromotedHenchman: boolean;
  eligibility: SkillCategoryChoice[];
  pendingSkillAdvances: { id: string; experienceThreshold: number }[];
  availableSkills: SkillOption[];
  learnedSkills: LearnedSkill[];
}

export type SpellAcquisitionMethod = "starting" | "advance" | "tome" | "manual";

export interface CustomSpellInput {
  name: string;
  castingDifficulty: number | null;
  difficultyNote: string | null;
  effectSummary: string | null;
  sourceReference: string | null;
}

export interface LearnSpellInput {
  spellId?: string;
  customSpell?: CustomSpellInput;
  acquisitionMethod: SpellAcquisitionMethod;
  advanceId?: string;
}

export interface SpellOption {
  id: string;
  disciplineId: string;
  roll: number | null;
  name: string;
  castingDifficulty: number | null;
  difficultyNote: string | null;
  effectSummary: string;
  alreadyKnown: boolean;
}

export interface SpellDiscipline {
  disciplineId: string;
  name: string;
  kind: "Magic" | "Prayer" | "Ritual" | "Rune";
  sourceReference: string;
  castingRuleSummary: string;
  startingSpellCount: number | null;
  startingSpellEligible: boolean;
  selectionRule: string | null;
  spells: SpellOption[];
}

export interface SpellDisciplineChoice {
  disciplineId: string;
  name: string;
  choiceGroup: string | null;
  startingSpellCount: number | null;
  selectionRule: string | null;
  sourceReference: string;
}

export interface KnownSpell {
  warriorSpellId: string;
  spellId: string | null;
  disciplineId: string | null;
  disciplineName: string;
  roll: number | null;
  name: string;
  castingDifficulty: number | null;
  difficultyNote: string | null;
  castingDifficultyModifier: number;
  effectiveCastingDifficulty: number | null;
  effectSummary: string | null;
  sourceReference: string;
  isStarting: boolean;
  acquisitionMethod: SpellAcquisitionMethod;
  notes: string | null;
  acquiredAt: string;
}

export interface WarriorSpellsData {
  role: MemberRole;
  warriorTypeName: string | null;
  hasSpellcastingProfile: boolean;
  canShowSpellSection: boolean;
  hasArcaneLore: boolean;
  hasAcademicSkillAccess: boolean;
  canLearnLesserMagic: boolean;
  lesserMagicUnlocked: boolean;
  isWizard: boolean;
  castingRollBonus: number;
  tomeAllowed: boolean;
  tomeInventory: MagicTomeInventoryItem[];
  selectedSpellDisciplineId: string | null;
  disciplineChoices: SpellDisciplineChoice[];
  availableDisciplines: SpellDiscipline[];
  startingSpellCount: number | null;
  startingSpellCountLearned: number;
  startingSpellsRemaining: number;
  canLearnSpellFromAdvance: boolean;
  knownSpells: KnownSpell[];
}

export interface SpellRollResult extends SpellOption {
  alreadyKnown: boolean;
  knownWarriorSpellId: string | null;
  effectiveCastingDifficulty: number | null;
}

export interface SpellRollResponse {
  disciplineId: string;
  results: SpellRollResult[];
}

export interface MagicTomeInventoryItem {
  id: string;
  unitCostPaid: number | null;
  acquiredAt: string;
}

export interface LadsGotTalentOptions {
  options: SkillCategoryChoice[];
  selected: SkillCategoryChoice[];
}

export interface Campaign {
  phase: "setup" | "pre_battle" | "battle" | "post_battle";
  phaseLabel: string;
  step: number;
  stepLabel: string;
  stepDescription: string;
  battlesFought: number;
  scenario: string | null;
  scenarios: string[];
  preBattleSteps: string[];
  battleTurn: number | null;
  battlePhases: string[];
  postBattleSteps: string[];
  allowedActions: string[];
  nextLabel: string;
  canReopen: boolean;
}

export interface CampaignOption {
  id: string;
  name: string;
  maxGc: number;
  warbandCount: number;
  inviteCode?: string;
  isOwner?: boolean;
  advancePurchaseRules?: AdvancePurchaseRules;
}

export interface Roster {
  ownerId?: string;
  player?: string;
  shareCode?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  campaignMaxGc?: number | null;
  campaign?: Campaign;
  id: string;
  name: string;
  warband: string;
  warbandId: string | null;
  treasury: string;
  battlesFought: number;
  wyrdstone: string;
  rating: string;
  members: Member[];
  capacity: RosterCapacity | null;
  memberOrderCustomized: boolean;
}