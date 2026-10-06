import { useEffect, useState, type FormEvent } from "react";
import { apiBaseUrl, getToken } from "../../auth/auth";
import { statLabels, type AdvancePurchaseRules, type ShopCategory, type ShopItem, type TradingRules } from "../types";

const defaultPrices = {
  M: [15, 15], WS: [15, 15], BS: [15, 15], S: [25, 35], T: [30, 45],
  W: [20, 30], I: [10, 10], A: [25, 35], Ld: [15, 15],
};
const statNames = {
  M: "Movement", WS: "Weapon Skill", BS: "Ballistic Skill", S: "Strength", T: "Toughness",
  W: "Wounds", I: "Initiative", A: "Attacks", Ld: "Leadership",
};

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

function initialRules(): AdvancePurchaseRules {
  return {
    enabled: false, skillsEnabled: true, skillCost: 40,
    stats: {
      M: { firstCost: 15, additionalCost: 15, maxIncreases: null },
      WS: { firstCost: 15, additionalCost: 15, maxIncreases: null },
      BS: { firstCost: 15, additionalCost: 15, maxIncreases: null },
      S: { firstCost: 25, additionalCost: 35, maxIncreases: null },
      T: { firstCost: 30, additionalCost: 45, maxIncreases: null },
      W: { firstCost: 20, additionalCost: 30, maxIncreases: null },
      I: { firstCost: 10, additionalCost: 10, maxIncreases: null },
      A: { firstCost: 25, additionalCost: 35, maxIncreases: null },
      Ld: { firstCost: 15, additionalCost: 15, maxIncreases: null },
    },
  };
}

export function NewCampaignDialog({ error, onCancel, onSubmit }: {
  error: string;
  onCancel: () => void;
  onSubmit: (name: string, maxGc: number, rules: AdvancePurchaseRules, tradingRules: TradingRules) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [maxGc, setMaxGc] = useState("500");
  const [rules, setRules] = useState(initialRules);
  const [shop, setShop] = useState<ShopItem[]>([]);
  const [shopLoading, setShopLoading] = useState(true);
  const [shopError, setShopError] = useState("");
  const [shopAttempt, setShopAttempt] = useState(0);
  const [overrides, setOverrides] = useState<TradingRules["overrides"]>({});
  const [customItems, setCustomItems] = useState<ShopItem[]>([]);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customCost, setCustomCost] = useState("");
  const [customRarity, setCustomRarity] = useState("");
  const [customRarityNone, setCustomRarityNone] = useState(true);
  const [customHeroOnly, setCustomHeroOnly] = useState(false);
  const [customCategory, setCustomCategory] = useState<ShopCategory>("misc");
  const [customRestrictions, setCustomRestrictions] = useState({
    allowedWarbands: "", excludedWarbands: "", allowedTypeNames: "", excludedTypeNames: "", requiredSkill: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const parsedCustomCost = Number(customCost);
  const parsedCustomRarity = customRarity === "" ? null : Number(customRarity);
  const customItemValid = isCustomShopItemValid({
    name: customName,
    description: customDescription,
    baseCost: customCost,
    rarity: customRarity,
    rarityIsCommon: customRarityNone,
  });

  useEffect(() => {
    const controller = new AbortController();
    async function loadShop() {
      setShopLoading(true);
      setShopError("");
      try {
        const token = getToken();
        const response = await fetch(`${apiBaseUrl}/shop`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (response.status === 401) window.dispatchEvent(new Event("mordheim:signed-out"));
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Could not load the shop (${response.status}).`);
        if (!Array.isArray(result.items)) throw new Error("The shop response did not include an item list.");
        if (!controller.signal.aborted) setShop(result.items as ShopItem[]);
      } catch (requestError) {
        if (!controller.signal.aborted) setShopError(requestError instanceof Error ? requestError.message : "Could not load the shop.");
      } finally {
        if (!controller.signal.aborted) setShopLoading(false);
      }
    }
    void loadShop();
    return () => controller.abort();
  }, [shopAttempt]);

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
      baseCost: parsedCustomCost,
      priceDice: 0,
      priceMultiplier: 1,
      rarity: customRarityNone ? null : parsedCustomRarity,
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
    setCustomRestrictions({ allowedWarbands: "", excludedWarbands: "", allowedTypeNames: "", excludedTypeNames: "", requiredSkill: "" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const tradingRules: TradingRules = { overrides, customItems };
      if (await onSubmit(name.trim(), Number(maxGc), rules, tradingRules)) onCancel();
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="new-roster-dialog new-campaign-dialog" role="dialog" aria-modal="true" aria-labelledby="new-campaign-title">
        <form onSubmit={(event) => void submit(event)}>
          <h2 id="new-campaign-title">New campaign</h2>
          <label className="detail-field"><span>CAMPAIGN NAME</span><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="detail-field"><span>MAXIMUM GC</span><input required type="number" min={0} max={100000} step={1} value={maxGc} onChange={(event) => setMaxGc(event.target.value)} /></label>
          <label className="purchase-toggle"><input type="checkbox" checked={rules.enabled} onChange={(event) => setRules({ ...rules, enabled: event.target.checked })} />Allow purchased advancements during roster creation</label>
          {rules.enabled && <>
            <p className="heading-note">Heroes only. Each purchase raises XP to the next Hero advancement threshold. One skill purchase is allowed per purchased stat increase. Existing racial limits and the 90 XP track remain enforced. Blank maximum means no purchase-count cap; 0 disables that characteristic.</p>
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
            <label className="purchase-toggle"><input type="checkbox" checked={rules.skillsEnabled} onChange={(event) => setRules({ ...rules, skillsEnabled: event.target.checked })} />Allow skill purchases</label>
            {rules.skillsEnabled && <label className="detail-field"><span>SKILL PRICE GC</span><input aria-label="Skill price GC" required type="number" min={0} max={100000} step={1} value={rules.skillCost} onChange={(event) => setRules({ ...rules, skillCost: Number(event.target.value) })} /></label>}
          </>}
          <section className="campaign-trading-rules" aria-label="Campaign trading rules">
            <h3>Trading rules</h3>
            <p className="heading-note">Shop items are loaded from the canonical shop. Variable price is base cost + Nd6 × multiplier.</p>
            {shopLoading ? <p className="equipment-state">Loading shop items...</p> : shopError ? (
              <div className="equipment-error" role="alert">{shopError}<button className="outline-button" type="button" onClick={() => setShopAttempt((attempt) => attempt + 1)}>Retry</button></div>
            ) : (
              <div className="campaign-shop-list">
                {shop.map((item) => {
                  const override = overrides[item.id] ?? {};
                  return <div className="campaign-shop-row" key={item.id}>
                    <strong>{item.name} <small>{item.category}</small></strong>
                    <label><input type="checkbox" checked={override.disabled ?? Boolean(item.disabled)} onChange={(event) => setOverride(item, "disabled", event.target.checked)} />Unavailable</label>
                    <label>Base GC<input aria-label={`${item.name} base cost`} type="number" required min={0} max={100000} step={1} value={override.baseCost ?? item.baseCost} onChange={(event) => setOverride(item, "baseCost", Number(event.target.value))} /></label>
                    <label>Price dice<input aria-label={`${item.name} price dice`} type="number" required min={0} max={6} step={1} value={override.priceDice ?? item.priceDice} onChange={(event) => setOverride(item, "priceDice", Number(event.target.value))} /></label>
                    <label>Multiplier<input aria-label={`${item.name} price multiplier`} type="number" required min={1} max={100} step={1} value={override.priceMultiplier ?? item.priceMultiplier} onChange={(event) => setOverride(item, "priceMultiplier", Number(event.target.value))} /></label>
                    <label>Rarity<input aria-label={`${item.name} rarity`} type="number" min={2} max={20} step={1} placeholder="Not rare" value={override.rarity === null ? "" : override.rarity ?? item.rarity ?? ""} onChange={(event) => setOverride(item, "rarity", event.target.value === "" ? null : Number(event.target.value))} /></label>
                  </div>;
                })}
              </div>
            )}
            <div className="custom-shop-form">
              <h4>Add custom item</h4>
              <p className="heading-note">Name, description and base cost are required. Custom items default to not rare; uncheck that option to set rarity from 2–20.</p>
              <label className="detail-field"><span>NAME</span><input value={customName} onChange={(event) => setCustomName(event.target.value)} /></label>
              <label className="detail-field"><span>DESCRIPTION</span><input value={customDescription} onChange={(event) => setCustomDescription(event.target.value)} /></label>
              <div className="trading-inline">
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
              <span><strong>{item.name}</strong> · {item.baseCost} GC{item.rarity == null ? "" : ` · rarity ${item.rarity}`}</span>
              <button className="outline-button" type="button" onClick={() => setCustomItems((current) => current.filter((entry) => entry.id !== item.id))}>Remove</button>
            </li>)}</ul>}
          </section>
          <div className="new-roster-dialog-actions">
            <button className="outline-button" type="button" disabled={submitting} onClick={onCancel}>Cancel</button>
            <button className="primary-button" type="submit" disabled={submitting || !name.trim() || maxGc === "" || shopLoading || Boolean(shopError)}>{submitting ? "Creating..." : "Create campaign"}</button>
          </div>
          {error && <p className="equipment-error" role="alert">{error}</p>}
        </form>
      </section>
    </div>
  );
}
