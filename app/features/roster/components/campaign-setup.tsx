import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  statLabels, type AdvancePurchaseRules, type CampaignOption, type HouseRuleOptions, type OptionalRuleDefinition,
  type ShopCategory, type ShopItem, type StatLabel, type TradingRules, type WarbandOption,
} from "../types";

type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;

const defaultPrices = {
  M: [15, 15], WS: [15, 15], BS: [15, 15], S: [25, 35], T: [30, 45],
  W: [20, 30], I: [10, 10], A: [25, 35], Ld: [15, 15],
};
const statNames: Record<StatLabel, string> = {
  M: "Movement", WS: "Weapon Skill", BS: "Ballistic Skill", S: "Strength", T: "Toughness",
  W: "Wounds", I: "Initiative", A: "Attacks", Ld: "Leadership",
};
const sections = [
  ["setup-basics", "Basics"], ["setup-warbands", "Warbands"], ["setup-heroes", "Hero bonuses"],
  ["setup-trading", "Trading Post"], ["setup-rules", "House rules"],
] as const;
const blankRestrictions = { allowedWarbands: "", excludedWarbands: "", allowedTypeNames: "", excludedTypeNames: "", requiredSkill: "" };

export function isCustomShopItemValid(input: {
  name: string;
  description: string;
  baseCost: string;
  rarity: string;
  rarityIsCommon: boolean;
}): boolean {
  const baseCost = Number(input.baseCost);
  const rarity = input.rarity === "" ? null : Number(input.rarity);
  return input.name.trim().length > 0 && input.description.trim().length > 0
    && input.baseCost !== "" && Number.isSafeInteger(baseCost) && baseCost >= 0 && baseCost <= 100000
    && (input.rarityIsCommon || (rarity !== null && Number.isSafeInteger(rarity) && rarity >= 2 && rarity <= 20));
}

export function initialPurchaseRules(): AdvancePurchaseRules {
  return {
    enabled: false, skillsEnabled: true, skillCost: 40, costEscalation: "characteristic",
    stats: Object.fromEntries(statLabels.map((stat) => [stat, { firstCost: defaultPrices[stat][0], additionalCost: defaultPrices[stat][1], maxIncreases: null }])) as AdvancePurchaseRules["stats"],
  };
}

const emptyOptions: HouseRuleOptions = { optionalRules: [], startingBonus: null };

interface Preset {
  houseRules: string;
  preset: { maxGc: number; scenarioLimit: number; advancePurchaseRules: AdvancePurchaseRules; houseRuleOptions: HouseRuleOptions };
}

export function CampaignRulesSummary({ campaign, warbands, catalog }: {
  campaign: CampaignOption; warbands: WarbandOption[]; catalog: OptionalRuleDefinition[];
}) {
  const options = campaign.houseRuleOptions ?? emptyOptions;
  const purchase = campaign.advancePurchaseRules;
  const allowed = campaign.allowedWarbandIds ?? [];
  const optional = catalog.filter((rule) => options.optionalRules.includes(rule.id));
  const buyable = purchase?.enabled ? statLabels.filter((stat) => purchase.stats[stat].maxIncreases !== 0) : [];
  return <div className="campaign-rules-summary">
    <ul className="rules-summary-list">
      <li><span className="automation-badge is-automated">Automated</span><strong>Starting gold:</strong> {campaign.maxGc} GC</li>
      <li><span className="automation-badge is-automated">Automated</span><strong>Length:</strong> {campaign.scenarioLimit == null ? "Indefinite" : `${campaign.scenarioLimit} scenarios`}</li>
      <li><span className="automation-badge is-automated">Automated</span><strong>Warbands:</strong> {allowed.length ? warbands.filter((w) => allowed.includes(w.id)).map((w) => w.displayName ?? w.name).join(", ") : "All warbands"}</li>
      {options.startingBonus && <li><span className="automation-badge is-automated">Automated</span><strong>Starting bonus:</strong> {options.startingBonus.pool} free +1 {options.startingBonus.stats.join("/")} per warband, at most {options.startingBonus.maxPerHero} per Hero; XP advances to the next threshold.</li>}
      {purchase?.enabled && <li><span className="automation-badge is-automated">Automated</span><strong>Paid starting advances:</strong> {buyable.map((stat) => `${stat} ${purchase.stats[stat].firstCost}${purchase.stats[stat].additionalCost !== purchase.stats[stat].firstCost ? `/${purchase.stats[stat].additionalCost}` : ""} GC`).join(", ") || "none"}{purchase.costEscalation === "hero" ? " (higher price after each Hero's first)" : ""}{purchase.skillsEnabled ? `; skills ${purchase.skillCost} GC` : "; no skill purchases"}.</li>}
      {(campaign.tradingRules?.customItems.length ?? 0) > 0 && <li><span className="automation-badge is-automated">Automated</span><strong>Custom items:</strong> {campaign.tradingRules?.customItems.map((item) => item.name).join(", ")}</li>}
      {optional.map((rule) => <li key={rule.id}><span className="automation-badge is-manual">Manual</span><strong>{rule.name}:</strong> {rule.summary}</li>)}
    </ul>
    {optional.length > 0 && <p className="heading-note">Manual rules are played at the table or recorded by hand. Adjust rosters with the normal edit, treasury and advancement controls.</p>}
  </div>;
}

export function DeleteCampaignDialog({ campaign, request, onCancel, onDeleted }: {
  campaign: CampaignOption;
  request: Request;
  onCancel: () => void;
  onDeleted: (movedWarbandCount: number) => void;
}) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const confirmed = typed.trim() === campaign.name.trim();
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !deleting) onCancel(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [deleting, onCancel]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed) return;
    setDeleting(true);
    setError("");
    try {
      const result = await request<{ movedWarbandCount: number }>(`/campaigns/${campaign.id}`, "DELETE", { confirmName: typed });
      onDeleted(result?.movedWarbandCount ?? 0);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete the campaign.");
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="new-roster-dialog delete-campaign-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-campaign-title" aria-describedby="delete-campaign-warning">
        <form onSubmit={(event) => void submit(event)}>
          <div className="eyebrow">COMMISSIONER DESK</div>
          <h2 id="delete-campaign-title">Delete {campaign.name}?</h2>
          <div id="delete-campaign-warning" className="setup-notice is-danger">
            <strong>Deleting a campaign is permanent and cannot be undone.</strong>
            <p>Its schedule, scenario results, standings, campaign battles, player memberships, invite code and unused custom items are erased for every player.</p>
            <p>{campaign.warbandCount === 0 ? "It has no warbands."
              : campaign.warbandCount === 1 ? "Its warband will move to Freebuild for its owner, keeping its warriors, gold and equipment."
              : `Its ${campaign.warbandCount} warbands will move to Freebuild for their owners, keeping their warriors, gold and equipment.`}</p>
          </div>
          <label className="detail-field">
            <span>TYPE THE CAMPAIGN NAME TO CONFIRM</span>
            <input autoFocus value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={campaign.name} autoComplete="off" spellCheck={false} />
          </label>
          {error && <p className="equipment-error" role="alert">{error}</p>}
          <div className="new-roster-dialog-actions">
            <button className="outline-button" type="button" disabled={deleting} onClick={onCancel}>Cancel</button>
            <button className="primary-button danger-button" type="submit" disabled={deleting || !confirmed}>{deleting ? "Deleting..." : "Delete campaign permanently"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function CampaignSetup({ initialCampaign, warbands, request, onCancel, onSaved, onDeleted }: {
  initialCampaign?: CampaignOption;
  warbands: WarbandOption[];
  request: Request;
  onCancel: () => void;
  onSaved: (campaign: CampaignOption) => void;
  onDeleted?: (campaignId: string, movedWarbandCount: number) => void;
}) {
  const editing = Boolean(initialCampaign);
  const [name, setName] = useState(initialCampaign?.name ?? "");
  const [maxGc, setMaxGc] = useState(String(initialCampaign?.maxGc ?? 500));
  const [indefinite, setIndefinite] = useState(initialCampaign ? initialCampaign.scenarioLimit == null : false);
  const [scenarioLimit, setScenarioLimit] = useState(String(initialCampaign?.scenarioLimit ?? 10));
  const [warbandsPerPlayer, setWarbandsPerPlayer] = useState(initialCampaign ? initialCampaign.maxWarbandsPerPlayer == null ? "" : String(initialCampaign.maxWarbandsPerPlayer) : "1");
  const [allowed, setAllowed] = useState<string[]>(initialCampaign?.allowedWarbandIds ?? []);
  const [warbandFilter, setWarbandFilter] = useState("");
  const [rules, setRules] = useState<AdvancePurchaseRules>(() => ({ ...initialPurchaseRules(), ...initialCampaign?.advancePurchaseRules }));
  const [options, setOptions] = useState<HouseRuleOptions>(initialCampaign?.houseRuleOptions ?? emptyOptions);
  const [houseRules, setHouseRules] = useState(initialCampaign?.houseRules ?? "");
  const [catalog, setCatalog] = useState<OptionalRuleDefinition[]>([]);
  const [shop, setShop] = useState<ShopItem[]>([]);
  const [shopLoading, setShopLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [shopFilter, setShopFilter] = useState("");
  const [showChangedOnly, setShowChangedOnly] = useState(false);
  const [overrides, setOverrides] = useState<TradingRules["overrides"]>(initialCampaign?.tradingRules?.overrides ?? {});
  const existingCustomIds = useMemo(() => new Set((initialCampaign?.tradingRules?.customItems ?? []).map((item) => item.id)), [initialCampaign]);
  const [customItems, setCustomItems] = useState<ShopItem[]>(initialCampaign?.tradingRules?.customItems ?? []);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customCost, setCustomCost] = useState("");
  const [customRarity, setCustomRarity] = useState("");
  const [customRarityNone, setCustomRarityNone] = useState(true);
  const [customHeroOnly, setCustomHeroOnly] = useState(false);
  const [customCategory, setCustomCategory] = useState<ShopCategory>("misc");
  const [customRestrictions, setCustomRestrictions] = useState(blankRestrictions);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [presetLoading, setPresetLoading] = useState(false);
  const [error, setError] = useState("");
  const customItemValid = isCustomShopItemValid({ name: customName, description: customDescription, baseCost: customCost, rarity: customRarity, rarityIsCommon: customRarityNone });

  useEffect(() => {
    let active = true;
    setShopLoading(true);
    setLoadError("");
    Promise.all([request<{ items: ShopItem[] }>("/shop"), request<{ optionalRules: OptionalRuleDefinition[] }>("/league/rule-options")])
      .then(([shopResult, ruleResult]) => {
        if (!active) return;
        if (!Array.isArray(shopResult.items)) throw new Error("The Trading Post response did not include an item list.");
        setShop(shopResult.items);
        setCatalog(ruleResult.optionalRules);
      })
      .catch((requestError: unknown) => { if (active) setLoadError(requestError instanceof Error ? requestError.message : "Could not load campaign setup options."); })
      .finally(() => { if (active) setShopLoading(false); });
    return () => { active = false; };
  }, [request, loadAttempt]);

  function payload() {
    return {
      name: name.trim(), maxGc: Number(maxGc), scenarioLimit: indefinite ? null : Number(scenarioLimit),
      maxWarbandsPerPlayer: warbandsPerPlayer === "" ? null : Number(warbandsPerPlayer),
      allowedWarbandIds: allowed, advancePurchaseRules: rules, houseRuleOptions: options, houseRules,
      tradingRules: { overrides, customItems } satisfies TradingRules,
    };
  }
  const [initialPayload] = useState(() => JSON.stringify(payload()));
  const dirty = JSON.stringify(payload()) !== initialPayload;

  function cancel() {
    if (!dirty || window.confirm("Discard your campaign setup changes?")) onCancel();
  }

  async function applyPreset() {
    if (dirty && !window.confirm("Replace starting gold, length, advancement prices, starting bonus, optional rules and house-rule text with the 2026 campaign settings?")) return;
    setPresetLoading(true);
    setError("");
    try {
      const template = await request<Preset>("/league/templates/2026");
      setMaxGc(String(template.preset.maxGc));
      setIndefinite(false);
      setScenarioLimit(String(template.preset.scenarioLimit));
      setRules({ ...initialPurchaseRules(), ...template.preset.advancePurchaseRules });
      setOptions(template.preset.houseRuleOptions);
      setHouseRules(template.houseRules);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load the 2026 campaign settings.");
    } finally {
      setPresetLoading(false);
    }
  }

  function setOverride(item: ShopItem, field: keyof NonNullable<TradingRules["overrides"][string]>, value: boolean | number | null) {
    setOverrides((current) => ({ ...current, [item.id]: { ...current[item.id], [field]: value } }));
  }

  function addCustomItem() {
    if (!customItemValid) return;
    const split = (value: string) => value.split(",").map((entry) => entry.trim()).filter(Boolean);
    setCustomItems((current) => [...current, {
      id: `custom-${crypto.randomUUID()}`,
      name: customName.trim(),
      description: customDescription.trim(),
      category: customCategory,
      baseCost: Number(customCost),
      priceDice: 0,
      priceMultiplier: 1,
      rarity: customRarityNone ? null : Number(customRarity),
      sourceReference: "Campaign custom item",
      ...(customHeroOnly ? { heroOnly: true } : {}),
      ...(split(customRestrictions.allowedWarbands).length ? { allowedWarbands: split(customRestrictions.allowedWarbands) } : {}),
      ...(split(customRestrictions.excludedWarbands).length ? { excludedWarbands: split(customRestrictions.excludedWarbands) } : {}),
      ...(split(customRestrictions.allowedTypeNames).length ? { allowedTypeNames: split(customRestrictions.allowedTypeNames) } : {}),
      ...(split(customRestrictions.excludedTypeNames).length ? { excludedTypeNames: split(customRestrictions.excludedTypeNames) } : {}),
      ...(customRestrictions.requiredSkill.trim() ? { requiredSkill: customRestrictions.requiredSkill.trim() } : {}),
    }]);
    setCustomName("");
    setCustomDescription("");
    setCustomCost("");
    setCustomRarity("");
    setCustomRarityNone(true);
    setCustomHeroOnly(false);
    setCustomRestrictions(blankRestrictions);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const saved = initialCampaign
        ? await request<CampaignOption>(`/campaigns/${initialCampaign.id}`, "PATCH", payload())
        : await request<CampaignOption>("/campaigns", "POST", payload());
      onSaved(saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save the campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  const visibleWarbands = warbands.filter((warband) => (warband.displayName ?? warband.name).toLowerCase().includes(warbandFilter.trim().toLowerCase()));
  const changed = (item: ShopItem) => Object.values(overrides[item.id] ?? {}).some((value) => value !== undefined);
  const visibleShop = shop.filter((item) => item.name.toLowerCase().includes(shopFilter.trim().toLowerCase()) && (!showChangedOnly || changed(item)));
  const bonus = options.startingBonus;
  const summaryCampaign: CampaignOption = {
    id: initialCampaign?.id ?? "draft", name, maxGc: Number(maxGc) || 0, warbandCount: 0,
    scenarioLimit: indefinite ? null : Number(scenarioLimit), allowedWarbandIds: allowed, advancePurchaseRules: rules,
    houseRuleOptions: options, tradingRules: { overrides, customItems },
  };
  const groups = [...new Set(catalog.map((rule) => rule.group))];

  return (
    <section className="campaign-setup" aria-labelledby="campaign-setup-title">
      <header className="campaign-setup-header">
        <div>
          <p className="eyebrow">{editing ? "COMMISSIONER DESK" : "NEW CAMPAIGN"}</p>
          <h1 id="campaign-setup-title">{editing ? `Campaign setup: ${initialCampaign?.name}` : "Set up a campaign"}</h1>
          <p className="heading-note">As commissioner you set the rules every player's warband is built under. {editing ? "Changes apply to future hires, purchases and claims. Existing treasury, purchases and custom items are kept." : "You can change these settings later from the commissioner desk."}</p>
        </div>
        <button className="outline-button" type="button" disabled={presetLoading || submitting} onClick={() => void applyPreset()}>{presetLoading ? "Loading..." : "Start from the 2026 campaign"}</button>
      </header>

      <div className="campaign-setup-layout">
        <aside className="campaign-setup-aside">
          <nav aria-label="Campaign setup sections">{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
          <div className="campaign-setup-summary">
            <h2>Rules summary</h2>
            <CampaignRulesSummary campaign={summaryCampaign} warbands={warbands} catalog={catalog} />
          </div>
        </aside>

        <form className="campaign-setup-form" onSubmit={(event) => void submit(event)}>
          <section id="setup-basics" className="setup-card">
            <h2>Campaign basics</h2>
            <div className="setup-grid">
              <label className="detail-field"><span>CAMPAIGN NAME</span><input autoFocus required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label className="detail-field"><span>STARTING GOLD (GC)</span><input required type="number" min={0} max={100000} step={1} value={maxGc} onChange={(event) => setMaxGc(event.target.value)} /></label>
              <label className="detail-field"><span>WARBANDS PER PLAYER (BLANK = NO LIMIT)</span><input type="number" min={1} max={100} step={1} value={warbandsPerPlayer} onChange={(event) => setWarbandsPerPlayer(event.target.value)} /></label>
            </div>
            <fieldset className="setup-choice">
              <legend>Campaign length</legend>
              <label className="purchase-toggle"><input type="radio" name="campaign-length" checked={!indefinite} onChange={() => setIndefinite(false)} />A set number of scenarios</label>
              {!indefinite && <label className="detail-field setup-inline"><span>SCENARIOS</span><input required type="number" min={1} max={1000} step={1} value={scenarioLimit} onChange={(event) => setScenarioLimit(event.target.value)} /></label>}
              <label className="purchase-toggle"><input type="radio" name="campaign-length" checked={indefinite} onChange={() => setIndefinite(true)} />Indefinite: keep scheduling scenarios until you end it</label>
            </fieldset>
            <p className="heading-note">Once scenarios are scheduled, league play uses one active warband per player; retired warbands can be replaced.</p>
          </section>

          <section id="setup-warbands" className="setup-card">
            <h2>Allowed warbands</h2>
            <p className="heading-note">{allowed.length ? `${allowed.length} of ${warbands.length} warbands allowed.` : "No restriction: every warband is allowed."} Restrictions apply to new warbands.</p>
            <div className="setup-toolbar">
              <input aria-label="Filter warbands" placeholder="Filter warbands" value={warbandFilter} onChange={(event) => setWarbandFilter(event.target.value)} />
              <button className="outline-button" type="button" onClick={() => setAllowed([...new Set([...allowed, ...visibleWarbands.map((warband) => warband.id)])])}>Allow shown</button>
              <button className="outline-button" type="button" onClick={() => setAllowed([])}>Allow all (clear)</button>
            </div>
            <div className="setup-warband-grid">
              {visibleWarbands.map((warband) => <label className="setup-check" key={warband.id}>
                <input type="checkbox" checked={allowed.includes(warband.id)} onChange={(event) => setAllowed(event.target.checked ? [...allowed, warband.id] : allowed.filter((id) => id !== warband.id))} />
                <span>{warband.displayName ?? warband.name}{warband.grade && <small> · {warband.grade}</small>}</span>
              </label>)}
            </div>
          </section>

          <section id="setup-heroes" className="setup-card">
            <h2>Hero bonuses and starting advancements</h2>
            <p className="heading-note">Both options are automated for Heroes while a warband is first being built. Each increase advances the Hero's XP to the next advance and counts as that advance. Racial maximums are enforced.</p>
            <div className="setup-option">
              <label className="purchase-toggle"><input type="checkbox" checked={Boolean(bonus)} onChange={(event) => setOptions({ ...options, startingBonus: event.target.checked ? { stats: ["W"], pool: 4, maxPerHero: 1 } : null })} />
                <strong>Free starting bonus characteristics</strong><span className="automation-badge is-automated">Automated</span></label>
              <p className="heading-note">A shared pool of free +1 characteristic increases each warband divides among its Heroes, e.g. "4 extra Wounds, no more than one per Hero".</p>
              {bonus && <div className="setup-grid">
                <fieldset className="setup-stat-picks"><legend>Characteristics</legend>{statLabels.map((stat) => <label className="setup-check" key={stat}>
                  <input type="checkbox" checked={bonus.stats.includes(stat)} onChange={(event) => setOptions({ ...options, startingBonus: { ...bonus, stats: event.target.checked ? [...bonus.stats, stat] : bonus.stats.filter((item) => item !== stat) } })} />{stat}
                </label>)}</fieldset>
                <label className="detail-field"><span>INCREASES PER WARBAND</span><input required type="number" min={1} max={50} step={1} value={bonus.pool} onChange={(event) => setOptions({ ...options, startingBonus: { ...bonus, pool: Number(event.target.value) } })} /></label>
                <label className="detail-field"><span>MAXIMUM PER HERO</span><input required type="number" min={1} max={9} step={1} value={bonus.maxPerHero} onChange={(event) => setOptions({ ...options, startingBonus: { ...bonus, maxPerHero: Number(event.target.value) } })} /></label>
              </div>}
              {bonus && bonus.stats.length === 0 && <p className="skills-error">Choose at least one characteristic.</p>}
            </div>
            <div className="setup-option">
              <label className="purchase-toggle"><input type="checkbox" checked={rules.enabled} onChange={(event) => setRules({ ...rules, enabled: event.target.checked })} />
                <strong>Paid characteristic and skill advances</strong><span className="automation-badge is-automated">Automated</span></label>
              <p className="heading-note">Heroes may buy increases with starting gold. Set a maximum of 0 to forbid a characteristic; blank means no cap.</p>
              {rules.enabled && <>
                <label className="detail-field setup-inline"><span>PRICE ESCALATION</span><select value={rules.costEscalation ?? "characteristic"} onChange={(event) => setRules({ ...rules, costEscalation: event.target.value === "hero" ? "hero" : "characteristic" })}>
                  <option value="characteristic">Further price applies to repeat purchases of the same characteristic</option>
                  <option value="hero">Further price applies to each Hero's second and later purchases</option>
                </select></label>
                <div className="purchase-rules-grid">
                  <strong>Characteristic</strong><strong>First GC</strong><strong>Further GC</strong><strong>Max increases</strong>
                  {statLabels.map((stat) => (
                    <div className="purchase-rule-row" key={stat}>
                      <span>{statNames[stat]}</span>
                      {(["firstCost", "additionalCost", "maxIncreases"] as const).map((field) => (
                        <input key={field} aria-label={`${statNames[stat]} ${field === "firstCost" ? "first price" : field === "additionalCost" ? "additional price" : "maximum purchases"}`}
                          required={field !== "maxIncreases"} type="number" min={0} max={field === "maxIncreases" ? 21 : 100000} step={1}
                          value={rules.stats[stat][field] ?? ""} placeholder={field === "maxIncreases" ? "No cap" : String(defaultPrices[stat][field === "firstCost" ? 0 : 1])}
                          onChange={(event) => setRules({
                            ...rules, stats: { ...rules.stats, [stat]: { ...rules.stats[stat], [field]: field === "maxIncreases" && event.target.value === "" ? null : Number(event.target.value) } },
                          })}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <label className="purchase-toggle"><input type="checkbox" checked={rules.skillsEnabled} onChange={(event) => setRules({ ...rules, skillsEnabled: event.target.checked })} />Allow skill purchases (one per purchased characteristic)</label>
                {rules.skillsEnabled && <label className="detail-field setup-inline"><span>SKILL PRICE GC</span><input aria-label="Skill price GC" required type="number" min={0} max={100000} step={1} value={rules.skillCost} onChange={(event) => setRules({ ...rules, skillCost: Number(event.target.value) })} /></label>}
              </>}
            </div>
          </section>

          <section id="setup-trading" className="setup-card campaign-trading-rules" aria-label="Campaign trading rules">
            <h2>Trading Post and items <span className="automation-badge is-automated">Automated</span></h2>
            <p className="heading-note">Change prices and rarity, make items unavailable, or add campaign-only items. Variable price is base cost + Nd6 × multiplier.</p>
            {shopLoading ? <p className="equipment-state">Loading Trading Post items...</p> : loadError ? (
              <div className="equipment-error" role="alert">{loadError}<button className="outline-button" type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry</button></div>
            ) : <>
              <div className="setup-toolbar">
                <input aria-label="Filter Trading Post items" placeholder="Filter items" value={shopFilter} onChange={(event) => setShopFilter(event.target.value)} />
                <label className="purchase-toggle"><input type="checkbox" checked={showChangedOnly} onChange={(event) => setShowChangedOnly(event.target.checked)} />Only customised items</label>
              </div>
              <div className="campaign-shop-list">
                {visibleShop.map((item) => {
                  const override = overrides[item.id] ?? {};
                  return <div className="campaign-shop-row" key={item.id}>
                    <strong>{item.name} <small>{item.category}</small></strong>
                    <label><input type="checkbox" checked={override.disabled ?? Boolean(item.disabled)} onChange={(event) => setOverride(item, "disabled", event.target.checked)} />Unavailable</label>
                    <label>Base GC<input aria-label={`${item.name} base cost`} type="number" required min={0} max={100000} step={1} value={override.baseCost ?? item.baseCost} onChange={(event) => setOverride(item, "baseCost", Number(event.target.value))} /></label>
                    <label>Price dice<input aria-label={`${item.name} price dice`} type="number" required min={0} max={10} step={1} value={override.priceDice ?? item.priceDice} onChange={(event) => setOverride(item, "priceDice", Number(event.target.value))} /></label>
                    <label>Multiplier<input aria-label={`${item.name} price multiplier`} type="number" required min={1} max={100} step={1} value={override.priceMultiplier ?? item.priceMultiplier} onChange={(event) => setOverride(item, "priceMultiplier", Number(event.target.value))} /></label>
                    <label>Rarity<input aria-label={`${item.name} rarity`} type="number" min={2} max={20} step={1} placeholder="Not rare" value={override.rarity === null ? "" : override.rarity ?? item.rarity ?? ""} onChange={(event) => setOverride(item, "rarity", event.target.value === "" ? null : Number(event.target.value))} /></label>
                  </div>;
                })}
                {visibleShop.length === 0 && <p className="equipment-state">No items match.</p>}
              </div>
            </>}
            <div className="custom-shop-form">
              <h3>Add custom item</h3>
              <p className="heading-note">Name, description and base cost are required. Custom items default to not rare; uncheck that option to set rarity from 2–20. {editing && "Items already saved cannot be removed or changed, because warbands may own them."}</p>
              <div className="setup-grid">
                <label className="detail-field"><span>NAME</span><input value={customName} onChange={(event) => setCustomName(event.target.value)} /></label>
                <label className="detail-field"><span>DESCRIPTION</span><input value={customDescription} onChange={(event) => setCustomDescription(event.target.value)} /></label>
                <label className="equipment-field"><span>CATEGORY</span><select value={customCategory} onChange={(event) => setCustomCategory(event.target.value as ShopCategory)}>{(["weapon", "armour", "shield", "misc"] as const).map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                <label className="equipment-field"><span>BASE COST GC</span><input type="number" step={1} value={customCost} onChange={(event) => setCustomCost(event.target.value)} /></label>
                <label className="equipment-field"><span>RARITY</span><input type="number" step={1} value={customRarity} disabled={customRarityNone} onChange={(event) => setCustomRarity(event.target.value)} /></label>
              </div>
              <label className="purchase-toggle"><input type="checkbox" checked={customRarityNone} onChange={(event) => setCustomRarityNone(event.target.checked)} />Not a rare item (default)</label>
              <label className="purchase-toggle"><input type="checkbox" checked={customHeroOnly} onChange={(event) => setCustomHeroOnly(event.target.checked)} />Heroes only</label>
              <div className="campaign-restrictions">
                <label className="equipment-field"><span>ALLOWED WARBANDS (COMMA SEPARATED)</span><input value={customRestrictions.allowedWarbands} onChange={(event) => setCustomRestrictions({ ...customRestrictions, allowedWarbands: event.target.value })} /></label>
                <label className="equipment-field"><span>EXCLUDED WARBANDS</span><input value={customRestrictions.excludedWarbands} onChange={(event) => setCustomRestrictions({ ...customRestrictions, excludedWarbands: event.target.value })} /></label>
                <label className="equipment-field"><span>ALLOWED WARRIOR TYPES</span><input value={customRestrictions.allowedTypeNames} onChange={(event) => setCustomRestrictions({ ...customRestrictions, allowedTypeNames: event.target.value })} /></label>
                <label className="equipment-field"><span>EXCLUDED WARRIOR TYPES</span><input value={customRestrictions.excludedTypeNames} onChange={(event) => setCustomRestrictions({ ...customRestrictions, excludedTypeNames: event.target.value })} /></label>
                <label className="equipment-field"><span>REQUIRED SKILL (OPTIONAL)</span><input value={customRestrictions.requiredSkill} onChange={(event) => setCustomRestrictions({ ...customRestrictions, requiredSkill: event.target.value })} /></label>
              </div>
              <button className="outline-button" type="button" disabled={!customItemValid} onClick={addCustomItem}>Add custom item</button>
            </div>
            {customItems.length > 0 && <ul className="custom-shop-items">{customItems.map((item) => <li key={item.id}>
              <span><strong>{item.name}</strong> · {item.baseCost} GC{item.rarity == null ? "" : ` · rarity ${item.rarity}`}{existingCustomIds.has(item.id) ? " · saved" : ""}</span>
              {!existingCustomIds.has(item.id) && <button className="outline-button" type="button" onClick={() => setCustomItems((current) => current.filter((entry) => entry.id !== item.id))}>Remove</button>}
            </li>)}</ul>}
          </section>

          <section id="setup-rules" className="setup-card">
            <h2>Optional and house rules</h2>
            <div className="setup-notice" role="note">
              <strong>Some house rules need manual roster changes.</strong>
              <p>Items marked <span className="automation-badge is-automated">Automated</span> are enforced by the roster app. Items marked <span className="automation-badge is-manual">Manual</span> are shown to every player as campaign rules but are played at the table or applied by hand, for example by editing treasury, experience, characteristics or equipment after a game.</p>
            </div>
            {groups.map((group) => <fieldset className="setup-optional-rules" key={group}>
              <legend>{group}</legend>
              {catalog.filter((rule) => rule.group === group).map((rule) => <label className="setup-rule" key={rule.id}>
                <input type="checkbox" checked={options.optionalRules.includes(rule.id)} onChange={(event) => setOptions({
                  ...options, optionalRules: event.target.checked ? [...options.optionalRules, rule.id] : options.optionalRules.filter((id) => id !== rule.id),
                })} />
                <span><strong>{rule.name}</strong> <span className={`automation-badge is-${rule.automation}`}>{rule.automation === "manual" ? "Manual" : "Automated"}</span><small>{rule.summary}</small></span>
              </label>)}
            </fieldset>)}
            <label className="detail-field setup-house-rules"><span>HOUSE RULES TEXT, RATING GAPS, MERCENARIES AND ABSENCE POLICY</span>
              <textarea rows={14} maxLength={150000} value={houseRules} onChange={(event) => setHouseRules(event.target.value)} placeholder="Write anything the options above do not cover. Players can read this from the campaign page." />
            </label>
            <p className="heading-note">{houseRules.length.toLocaleString()} / 150,000 characters</p>
          </section>

          {initialCampaign && onDeleted && <section id="setup-delete" className="setup-card setup-danger">
            <h2>Delete campaign</h2>
            <p className="heading-note">Permanently removes this campaign for every player. This cannot be undone. Warbands move to Freebuild.</p>
            <button className="outline-button danger-outline" type="button" disabled={submitting} onClick={() => setConfirmingDelete(true)}>Delete campaign...</button>
          </section>}

          <div className="campaign-setup-actions">
            {error && <p className="equipment-error" role="alert">{error}</p>}
            <button className="outline-button" type="button" disabled={submitting} onClick={cancel}>Cancel</button>
            <button className="primary-button" type="submit" disabled={submitting || !name.trim() || maxGc === "" || shopLoading || Boolean(loadError) || (bonus !== null && bonus.stats.length === 0)}>
              {submitting ? "Saving..." : editing ? "Save campaign setup" : "Create campaign"}
            </button>
          </div>
        </form>
      </div>
      {confirmingDelete && initialCampaign && onDeleted && <DeleteCampaignDialog campaign={initialCampaign} request={request}
        onCancel={() => setConfirmingDelete(false)} onDeleted={(moved) => onDeleted(initialCampaign.id, moved)} />}
    </section>
  );
}
