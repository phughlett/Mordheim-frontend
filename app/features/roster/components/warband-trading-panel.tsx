import { useEffect, useRef, useState } from "react";
import type { InventoryEntry, Member, Roster, ShopItem, TradingData, TradingHero, TradingQuote, TradingSearch } from "../types";
import { WarbandCurrency } from "./roster-fields";
import { defaultMapInput, mapSelection, MapResult, MordheimMapControls, UnresolvedMap, type MapInput } from "./mordheim-map-controls";

type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;

function diceLabel(dice: number[]) {
  return dice.length ? dice.join(", ") : "no dice";
}

export function shopItemPriceForType(item: ShopItem, type?: string): ShopItem {
  const override = item.priceOverrides?.find((entry) => type && entry.typeNames.includes(type));
  return override ? { ...item, ...override } : item;
}

export function filterShopItems(shop: ShopItem[], category = "", grade = ""): ShopItem[] {
  return shop.filter((entry) => (!category || entry.shopCategory === category) && (!grade || entry.grade === grade));
}

export function RitualPurchase({ item, heroes, enabled, onAttempt }: {
  item: ShopItem; heroes: TradingHero[]; enabled: boolean;
  onAttempt: (heroId: string, mode: "manual" | "simulated", priceDice: string, searchDice: string) => Promise<void>;
}) {
  const [heroId, setHeroId] = useState("");
  const [mode, setMode] = useState<"manual" | "simulated">("simulated");
  const [priceDice, setPriceDice] = useState("");
  const [searchDice, setSearchDice] = useState("");
  const hero = heroes.find((entry) => entry.id === heroId);
  return <div>
    <p className="trading-note">Pay for the summoning attempt even if it fails. A successful Familiar belongs only to the selected spellcaster. Prayer users cannot summon.</p>
    <div className="trading-inline">
      <label className="equipment-field"><span>SUMMONING SPELLCASTER</span><select aria-label="Summoning spellcaster" value={heroId} disabled={!enabled} onChange={(event) => setHeroId(event.target.value)}>
        <option value="">Choose spellcaster</option>
        {heroes.filter((entry) => entry.spellcaster).map((entry) => <option key={entry.id} value={entry.id} disabled={entry.outOfAction || entry.searched}>{entry.name}{entry.outOfAction ? " · out of action" : entry.searched ? " · searched this battle" : ""}</option>)}
      </select></label>
      <label className="equipment-field"><span>RITUAL ROLLS</span><select aria-label="Ritual roll mode" value={mode} disabled={!enabled} onChange={(event) => setMode(event.target.value as "manual" | "simulated")}><option value="simulated">Simulated</option><option value="manual">Manual</option></select></label>
      {mode === "manual" && <>
        {item.priceDice > 0 && <label className="equipment-field"><span>PRICE {item.priceDice}D6</span><input aria-label="Ritual price dice" value={priceDice} onChange={(event) => setPriceDice(event.target.value)} /></label>}
        <label className="equipment-field"><span>SUMMONING 2D6</span><input aria-label="Ritual summoning dice" value={searchDice} onChange={(event) => setSearchDice(event.target.value)} /></label>
      </>}
      <button className="primary-button" type="button" disabled={!enabled || !hero?.spellcaster || hero.outOfAction || hero.searched} onClick={() => void onAttempt(heroId, mode, priceDice, searchDice)}>Pay and attempt summoning</button>
    </div>
  </div>;
}

export function WeaponUpgrade({ item, entries, members, enabled, treasury, quotedPrice, onUpgrade }: {
  item: ShopItem; entries: InventoryEntry[]; members: Member[]; enabled: boolean; treasury: string;
  quotedPrice?: number;
  onUpgrade: (inventoryId: string) => Promise<void>;
}) {
  const [inventoryId, setInventoryId] = useState("");
  const targets = entries.filter((entry) => entry.category === "weapon" && !entry.nontransferable
    && ((entry.upgradeQuantity ?? 1) === 1 || entry.modelIndex === 0));
  const selected = targets.find((entry) => entry.id === inventoryId);
  const cost = (quotedPrice ?? item.baseCost) * (selected?.upgradeQuantity ?? 1);
  return <div>
    <p className="trading-note">Upgrade one carried weapon permanently. Identically equipped Henchmen upgrade one matching weapon per model. Poisoned weapons cannot be traded, sold or returned to stash.</p>
    <div className="trading-inline">
      <label className="equipment-field"><span>CARRIED WEAPON</span><select aria-label="Weapon to upgrade" value={inventoryId} disabled={!enabled} onChange={(event) => setInventoryId(event.target.value)}>
        <option value="">Choose weapon</option>
        {targets.map((entry) => <option key={entry.id} value={entry.id}>{members.find((member) => member.id === entry.memberId)?.name} · {entry.name}{(entry.upgradeQuantity ?? 1) > 1 ? ` · ${entry.upgradeQuantity} models` : ""}</option>)}
      </select></label>
      <strong>Total: {cost} GC</strong>
      <button className="primary-button" type="button" disabled={!enabled || !selected || cost > Number(treasury) || (item.priceDice > 0 && quotedPrice === undefined)} onClick={() => void onUpgrade(inventoryId)}>Permanently poison weapon</button>
    </div>
  </div>;
}

export function tradingDataRefreshKey(roster: Pick<Roster, "id" | "campaignId" | "campaign"> & Partial<Pick<Roster, "members" | "battlesFought">>): string {
  return JSON.stringify([
    roster.id,
    roster.campaignId,
    roster.campaign?.phase ?? null,
    roster.campaign?.step ?? null,
    roster.campaign?.allowedActions ?? [],
    roster.battlesFought ?? roster.campaign?.battlesFought ?? 0,
    roster.members?.map((member) => [member.id, member.warriorTypeId, member.groupSize]) ?? [],
  ]);
}

export function isCampaignInjuryStep(campaign: Roster["campaign"]): boolean {
  return campaign?.phase === "post_battle" && Number(campaign.step) === 1;
}

export function isHeroStatusWindow(campaign: Roster["campaign"]): boolean {
  return campaign?.phase === "battle" || isCampaignInjuryStep(campaign);
}

export function tradingHeroes(data: TradingData, roster: Roster): TradingHero[] {
  if (data.heroes.length > 0) return data.heroes;
  return roster.members
    .filter((member) => member.role === "Hero")
    .map((member) => ({ id: member.id, name: member.name, outOfAction: false, searched: false }));
}

export function parseTradingDice(value: string, expected: number): number[] | null {
  const values = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (expected === 0 && values.length === 0) return [];
  const dice = values.map(Number);
  return dice.length === expected && dice.every((die) => Number.isInteger(die) && die >= 1 && die <= 6) ? dice : null;
}

export function shopItemRarityForType(item: ShopItem, typeName: string | undefined): number | null {
  if (typeName && item.rarityOverrides && Object.prototype.hasOwnProperty.call(item.rarityOverrides, typeName)) {
    return item.rarityOverrides[typeName];
  }
  return item.rarity;
}

export function shopItemPurchaseRarity(
  item: ShopItem,
  heroes: TradingHero[],
  members: Roster["members"],
): number | null {
  const activeHeroTypes = heroes
    .filter((hero) => !hero.outOfAction)
    .map((hero) => members.find((member) => member.id === hero.id)?.type)
    .filter((typeName): typeName is string => Boolean(typeName));
  if (activeHeroTypes.some((typeName) => shopItemRarityForType(item, typeName) === null)) return null;
  return item.rarity;
}

export function AssignedEquipment({ entries, members }: {
  entries: InventoryEntry[];
  members: Roster["members"];
}) {
  const groups = new Map<string, { name: string; category: InventoryEntry["category"]; quantity: number; memberIds: Set<string>; mapEntry?: InventoryEntry }>();
  for (const entry of entries) {
    const key = JSON.stringify([entry.name, entry.category]);
    const group = groups.get(key) ?? { name: entry.name, category: entry.category, quantity: 0, memberIds: new Set<string>(), mapEntry: entry.shopItemId === "mordheim-map" ? entry : undefined };
    group.quantity += entry.quantity;
    if (entry.memberId) group.memberIds.add(entry.memberId);
    groups.set(key, group);
  }
  const categoryLabels: Record<InventoryEntry["category"], string> = {
    weapon: "Weapon", armour: "Armour", shield: "Shield", misc: "Miscellaneous",
  };

  return groups.size ? (
    <ul className="trading-inventory trading-inventory-assigned">
      {[...groups].map(([key, group]) => (
        <li key={key}>
          <strong>{group.name} x {group.quantity} - {categoryLabels[group.category]}</strong>
          <span>{[...group.memberIds].map((id) => members.find((member) => member.id === id)?.name || "Unnamed warrior").join(", ")}</span>
          {group.mapEntry && <small>{group.mapEntry.description}</small>}
        </li>
      ))}
    </ul>
  ) : <p className="equipment-state">No assigned inventory entries.</p>;
}

export function CombatSpoils({ campaign, item, enabled, onAdd }: {
  campaign: boolean;
  item: ShopItem;
  enabled: boolean;
  onAdd: (quantity: number) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(1);
  if (campaign || item.purchaseAction || (item.creationOnly && item.canPurchase === false)) return null;
  return <div className="trading-quote">
    <strong>Combat spoils · no Gold Crowns charged</strong>
    <label className="equipment-field"><span>SPOILS QUANTITY</span><input aria-label="Combat spoils quantity" type="number" min={1} max={1000} step={1} value={quantity} disabled={!enabled || item.disabled} onChange={(event) => setQuantity(Math.min(1000, Math.max(1, Math.floor(Number(event.target.value) || 1))))} /></label>
    <button className="outline-button" type="button" disabled={!enabled || item.disabled} onClick={() => void onAdd(quantity)}>Add as combat spoils</button>
    <small>Add the selected shop item to your stash for free. No rarity search or price roll required; equipment restrictions still apply.</small>
  </div>;
}

export function StashItem({ entry, roster, enabled, onSend, canSell = false, onSell, mapControls }: {
  entry: InventoryEntry;
  roster: Roster;
  enabled: boolean;
  onSend: (entryId: string, memberId: string, quantity: number, modelIndex: number) => Promise<void>;
  canSell?: boolean;
  onSell?: (entryId: string, quantity: number) => Promise<void>;
  mapControls?: React.ReactNode;
}) {
  const [memberId, setMemberId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [modelIndex, setModelIndex] = useState(-1);
  const [saleQuantity, setSaleQuantity] = useState(1);
  const recipients = roster.members.filter((member) => entry.eligibleRecipients?.some((recipient) => recipient.memberId === member.id));
  const member = recipients.find((recipient) => recipient.id === memberId);
  const individual = entry.eligibleRecipients?.find((recipient) => recipient.memberId === memberId)?.allowIndividualGroupGear;
  const perModel = member?.role === "Henchman" && (modelIndex === -1 || !individual);
  const maximum = Math.min(1000, Math.floor(entry.quantity / (perModel ? member.groupSize : 1)));
  return <li>
    <strong>{entry.name} × {entry.quantity}</strong>
    <span>{entry.category} · {entry.unitCostPaid} GC each</span>
    {entry.description && <small>{entry.description}</small>}
    <MapResult entry={entry} />
    {mapControls}
    {entry.boundWarriorId && <small>Bound to {roster.members.find((member) => member.id === entry.boundWarriorId)?.name ?? "its summoner"}; lost if they die.</small>}
    <div className="trading-inline">
      <label className="equipment-field"><span>SEND TO</span><select aria-label={`Recipient for ${entry.name}`} value={memberId} disabled={!enabled || !recipients.length} onChange={(event) => {
        setMemberId(event.target.value); setModelIndex(-1); setQuantity(1);
      }}>
        <option value="">Choose eligible warrior</option>
        {recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name} · {recipient.role}</option>)}
      </select></label>
      {member?.role === "Henchman" && individual && <label className="equipment-field"><span>MODEL</span><select aria-label={`Model for ${entry.name}`} value={modelIndex} disabled={!enabled} onChange={(event) => { setModelIndex(Number(event.target.value)); setQuantity(1); }}>
        <option value={-1}>All {member.groupSize} models</option>
        {Array.from({ length: member.groupSize }, (_, index) => <option key={index} value={index}>Model {index + 1}</option>)}
      </select></label>}
      <label className="equipment-field"><span>QUANTITY{perModel ? " PER MODEL" : ""}</span><input aria-label={`Send quantity for ${entry.name}`} type="number" min={1} max={Math.max(1, maximum)} value={quantity} disabled={!enabled} onChange={(event) => setQuantity(Math.max(1, Math.min(1000, Math.floor(Number(event.target.value) || 1))))} /></label>
      <button className="outline-button" type="button" disabled={!enabled || !member || quantity > maximum} onClick={() => {
        if (member) void onSend(entry.id, member.id, quantity, member.role === "Henchman" ? individual ? modelIndex : -1 : 0);
      }}>Send to member</button>
    </div>
    {!recipients.length && <small>No warriors in this warband can use this item.</small>}
    {perModel && <small>Requires {quantity * member.groupSize} copies for all {member.groupSize} models.</small>}
    {onSell && entry.unitSaleValue != null && !entry.saleRestriction && <div className="trading-inline">
      <label className="equipment-field"><span>SELL QUANTITY</span><input aria-label={`Sell quantity for ${entry.name}`} type="number" min={1} max={Math.min(1000, entry.quantity)}
        value={saleQuantity} disabled={!canSell} onChange={(event) => setSaleQuantity(Math.max(1, Math.min(1000, entry.quantity, Math.floor(Number(event.target.value) || 1))))} /></label>
      <button className="outline-button" type="button" disabled={!canSell || saleQuantity > entry.quantity}
        onClick={() => void onSell(entry.id, saleQuantity)}>Sell ×{saleQuantity} · {entry.unitSaleValue * saleQuantity} GC</button>
    </div>}
    {entry.saleRestriction && <small>{entry.saleRestriction}</small>}
  </li>;
}

export function WarbandTradingPanel({ roster, request, onChanged, onUpdateRoster, readOnly, refreshVersion = 0, onDataChanged }: {
  roster: Roster;
  request: Request;
  onChanged: () => Promise<void>;
  onUpdateRoster: (changes: Partial<Roster>) => void;
  readOnly: boolean;
  refreshVersion?: string | number;
  onDataChanged?: (data: TradingData | null) => void;
}) {
  const [data, setData] = useState<TradingData | null>(null);
  const [loading, setLoading] = useState(Boolean(roster.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [itemId, setItemId] = useState("");
  const [shopCategory, setShopCategory] = useState("");
  const [grade, setGrade] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [mode, setMode] = useState<"manual" | "simulated">("simulated");
  const [manualDice, setManualDice] = useState("");
  const [quote, setQuote] = useState<TradingQuote | null>(null);
  const [quotesByItem, setQuotesByItem] = useState<Record<string, TradingQuote>>({});
  const [quantity, setQuantity] = useState(1);
  const [mapInput, setMapInput] = useState<MapInput>(defaultMapInput);
  const [searchHeroId, setSearchHeroId] = useState("");
  const [searchMode, setSearchMode] = useState<"manual" | "simulated">("simulated");
  const [searchDice, setSearchDice] = useState("1, 1");
  const [searchResult, setSearchResult] = useState<TradingSearch | null>(null);
  const [statusHeroId, setStatusHeroId] = useState("");
  const [casualtyMemberId, setCasualtyMemberId] = useState("");
  const [casualtyModelIndex, setCasualtyModelIndex] = useState(0);
  const rosterIdRef = useRef(roster.id);
  rosterIdRef.current = roster.id;
  const refreshKey = tradingDataRefreshKey(roster);

  const campaign = Boolean(roster.campaignId);
  const creation = !campaign && (roster.battlesFought ?? 0) === 0;
  const isInjuryWindow = isHeroStatusWindow(roster.campaign);
  const isCasualtyWindow = isCampaignInjuryStep(roster.campaign);
  const filteredShop = data ? filterShopItems(data.shop, shopCategory, grade) : [];
  const rawItem = filteredShop.find((entry) => entry.id === itemId);
  const item = rawItem ? shopItemPriceForType(rawItem, roster.members.find((member) => member.id === buyerId)?.type) : undefined;
  const quoteKey = `${itemId}:${buyerId}`;
  const purchasable = item?.canPurchase ?? data?.canPurchase;
  const sourceUrl = item?.sourceReference.match(/https:\/\/mordheimer\.net\/[^\s;]+/)?.[0];
  const searchHero = roster.members.find((member) => member.id === searchHeroId);
  const searchRarity = item ? shopItemRarityForType(item, searchHero?.type) : null;
  const purchaseRarity = item && data ? shopItemPurchaseRarity(item, data.heroes, roster.members) : item?.rarity ?? null;
  const itemMayBeRare = Boolean(item && !item.creationOnly && !item.purchaseAction && campaign && purchaseRarity !== null);
  const selectedItem = item;
  const commonOverrideHeroes = selectedItem && data
    ? data.heroes.filter((hero) => !hero.outOfAction
      && roster.members.some((member) => member.id === hero.id
        && member.type
        && selectedItem.rarityOverrides
        && Object.prototype.hasOwnProperty.call(selectedItem.rarityOverrides, member.type)
        && selectedItem.rarityOverrides[member.type] === null))
    : [];
  const selectedSearch = item && itemMayBeRare
    ? data?.searches.find((search) => search.itemId === item.id && search.success && !search.purchased)
    : undefined;
  const casualtyMember = roster.members.find((member) => member.id === casualtyMemberId);
  const availableTradingHeroes = data ? tradingHeroes(data, roster) : [];

  useEffect(() => {
    if (!roster.id) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setData(null);
    setQuote(null);
    setQuotesByItem({});
    void request<TradingData>(`/rosters/${roster.id}/trading`)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load warband trading.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roster.id, request, refreshKey, refreshVersion]);

  useEffect(() => { onDataChanged?.(data); }, [data, onDataChanged]);

  useEffect(() => {
    if (data && !filteredShop?.some((entry) => entry.id === itemId)) {
      const firstItemId = filteredShop.find((entry) => !entry.disabled)?.id ?? filteredShop[0]?.id ?? "";
      setItemId(firstItemId);
      setBuyerId("");
      setQuote(quotesByItem[`${firstItemId}:`] ?? null);
    }
    if (data && !data.heroes.some((hero) => hero.id === searchHeroId && !hero.outOfAction && !hero.searched)) {
      setSearchHeroId(data.heroes.find((hero) => !hero.outOfAction && !hero.searched)?.id ?? "");
    }
    if (buyerId && data && !data.heroes.some((hero) => hero.id === buyerId && !hero.outOfAction)) {
      setBuyerId("");
      setQuote(quotesByItem[`${itemId}:`] ?? null);
    }
    if (data && !roster.members.some((member) => member.id === casualtyMemberId)) setCasualtyMemberId(roster.members[0]?.id ?? "");
  }, [data, roster.members, itemId, searchHeroId, casualtyMemberId, quotesByItem, shopCategory, grade, buyerId]);

  async function act(action: () => Promise<void>) {
    const actionRosterId = roster.id;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (actionError) {
      if (rosterIdRef.current === actionRosterId) {
        setError(actionError instanceof Error ? actionError.message : "Trading action failed.");
      }
    } finally {
      if (rosterIdRef.current === actionRosterId) setBusy(false);
    }
  }

  async function createQuote() {
    if (!item) return;
    const dice = mode === "manual" ? parseTradingDice(manualDice, item.priceDice) : undefined;
    if (mode === "manual" && dice === null) {
      setError(`Enter exactly ${item.priceDice} d6 result${item.priceDice === 1 ? "" : "s"} (1–6), separated by commas.`);
      return;
    }
    await act(async () => {
      const result = await request<TradingQuote>(`/rosters/${roster.id}/trading/quote`, "POST", {
        itemId: item.id, mode, ...(buyerId ? { buyerId } : {}), ...(dice === undefined ? {} : { dice }),
      });
      if (rosterIdRef.current === roster.id) {
        setQuotesByItem((current) => ({ ...current, [quoteKey]: result }));
        setQuote(result);
        setQuantity(1);
      }
    });
  }

  async function search() {
    if (!item || !searchHeroId) return;
    const dice = searchMode === "manual" ? parseTradingDice(searchDice, 2) : undefined;
    if (searchMode === "manual" && dice === null) {
      setError("Enter exactly two d6 results (1–6), separated by a comma.");
      return;
    }
    await act(async () => {
      const refreshed = await request<TradingData>(`/rosters/${roster.id}/trading/search`, "POST", {
        heroId: searchHeroId, itemId: item.id, mode: searchMode, ...(dice ? { dice } : {}),
      });
      if (rosterIdRef.current === roster.id) {
        setSearchResult(refreshed.searches.find((entry) => entry.heroId === searchHeroId && entry.itemId === item.id) ?? null);
        setData(refreshed);
      }
      await onChanged();
    });
  }

  async function purchase() {
    if (!item || !data || (item.priceDice > 0 && !quote)) return;
    if (campaign && itemMayBeRare && (!selectedSearch || quantity !== 1)) {
      setError("A campaign rare item requires one successful, unused search. Purchase one item per search.");
      return;
    }
    await act(async () => {
      const selection = item.id === "mordheim-map" ? mapSelection(mapInput, quantity) : undefined;
      const offer = quote ?? await request<TradingQuote>(`/rosters/${roster.id}/trading/quote`, "POST", {
        itemId: item.id, mode: "simulated", ...(buyerId ? { buyerId } : {}),
      });
      const refreshed = await request<TradingData>(`/rosters/${roster.id}/trading/purchase`, "POST", {
        quoteId: offer.id, quantity, mapSelection: selection, ...(selectedSearch ? { searchId: selectedSearch.id } : {}),
      });
      if (rosterIdRef.current === roster.id) {
        setQuote(null);
        setQuotesByItem((current) => {
          const next = { ...current };
          delete next[quoteKey];
          return next;
        });
        setSearchResult(null);
        setData(refreshed);
      }
      await onChanged();
    });
  }

  async function summon(heroId: string, ritualMode: "manual" | "simulated", priceResults: string, searchResults: string) {
    if (!item) return;
    const priceDice = ritualMode === "manual" ? parseTradingDice(priceResults, item.priceDice) : undefined;
    const dice = ritualMode === "manual" ? parseTradingDice(searchResults, 2) : undefined;
    if (priceDice === null || dice === null) {
      setError(`Enter ${item.priceDice} price d6 results and two summoning d6 results, each 1–6.`);
      return;
    }
    await act(async () => {
      const offer = await request<TradingQuote>(`/rosters/${roster.id}/trading/quote`, "POST", {
        itemId: item.id, buyerId: heroId, mode: ritualMode, ...(priceDice ? { dice: priceDice } : {}),
      });
      const result = await request<TradingData & { attempt: Pick<TradingSearch, "heroName" | "success" | "dice" | "total" | "modifier"> }>(
        `/rosters/${roster.id}/trading/search`, "POST", { itemId: item.id, heroId, quoteId: offer.id, mode: ritualMode, ...(dice ? { dice } : {}) });
      if (rosterIdRef.current === roster.id) {
        setData(result);
        setSearchResult({ ...result.attempt, id: "", heroId, itemId: item.id, itemName: item.name, purchased: result.attempt.success });
      }
      await onChanged();
    });
  }

  async function upgrade(inventoryId: string) {
    if (!item) return;
    await act(async () => {
      const offer = quote ?? await request<TradingQuote>(`/rosters/${roster.id}/trading/quote`, "POST", { itemId: item.id, mode: "simulated" });
      const result = await request<TradingData>(`/rosters/${roster.id}/trading/upgrade`, "POST", { itemId: item.id, inventoryId, quoteId: offer.id });
      if (rosterIdRef.current === roster.id) {
        setData(result);
        setQuote(null);
        setQuotesByItem((current) => {
          const next = { ...current };
          delete next[quoteKey];
          return next;
        });
      }
      await onChanged();
    });
  }

  async function addSpoils(spoilsQuantity: number) {
    if (!item) return;
    await act(async () => {
      const refreshed = await request<TradingData>(`/rosters/${roster.id}/trading/spoils`, "POST", {
        itemId: item.id, quantity: spoilsQuantity,
        ...(item.id === "mordheim-map" ? { mapSelection: mapSelection(mapInput, spoilsQuantity) } : {}),
      });
      if (rosterIdRef.current === roster.id) setData(refreshed);
      await onChanged();
    });
  }

  async function resolveMap(entry: InventoryEntry, source: "stash" | "member", input: MapInput) {
    await act(async () => {
      const refreshed = await request<TradingData>(`/rosters/${roster.id}/trading/map`, "POST", {
        source, inventoryId: entry.id, mapSelection: mapSelection(input, 1),
      });
      if (rosterIdRef.current === roster.id) setData(refreshed);
      await onChanged();
    });
  }

  async function transfer(entryId: string, memberId: string, quantity: number, modelIndex: number) {
    await act(async () => {
      const refreshed = await request<TradingData>(`/rosters/${roster.id}/trading/transfer`, "POST", {
        direction: "to_member", inventoryId: entryId, memberId, quantity, modelIndex,
      });
      if (rosterIdRef.current === roster.id) {
        setData(refreshed);
      }
      await onChanged();
    });
  }

  async function setHeroStatus(hero: TradingHero) {
    await act(async () => {
      const refreshed = await request<TradingData>(`/rosters/${roster.id}/trading/hero-status`, "POST", {
        heroId: hero.id, outOfAction: !hero.outOfAction,
      });
      if (rosterIdRef.current === roster.id) setData(refreshed);
      await onChanged();
    });
  }

  async function recordCasualty() {
    if (!casualtyMember) return;
    const index = casualtyMember.role === "Henchman" ? casualtyModelIndex : 0;
    const detail = casualtyMember.role === "Henchman" ? `model ${index + 1} of ${casualtyMember.name}` : casualtyMember.name;
    if (!window.confirm(`Permanently record the death of ${detail}? This removes their inventory and does not refund gold.`)) return;
    await act(async () => {
      const refreshed = await request<TradingData>(`/rosters/${roster.id}/casualties`, "POST", {
        memberId: casualtyMember.id, modelIndex: index,
      });
      if (rosterIdRef.current === roster.id) setData(refreshed);
      await onChanged();
    });
  }

  const actionsEnabled = !readOnly && !busy;
  async function sellStash(inventoryId: string, saleQuantity: number) {
    await act(async () => {
      const refreshed = await request<TradingData>(`/rosters/${roster.id}/trading/sell`, "POST", {
        source: "stash", inventoryIds: [inventoryId], quantity: saleQuantity,
      });
      if (rosterIdRef.current === roster.id) setData(refreshed);
      await onChanged();
    });
  }
  return (
    <section className="warband-trading" aria-label="Warband stash and trading">
      <div className="section-heading">
        <div><div className="eyebrow">MARKET &amp; INVENTORY</div><h2>Warband stash</h2></div>
        <WarbandCurrency roster={roster} onUpdate={onUpdateRoster} readOnly={readOnly} />
      </div>
      {readOnly && <p className="trading-note">Read-only view: stash, equipment and shop listings can be inspected, but trading actions are disabled.</p>}
      {loading && <p className="equipment-state">Loading stash and shop...</p>}
      {error && <p className="equipment-error" role="alert">{error}</p>}
      {!loading && !data && <button className="outline-button" type="button" disabled={busy} onClick={() => {
        setLoading(true);
        setError("");
        void request<TradingData>(`/rosters/${roster.id}/trading`).then(setData).catch((loadError: unknown) => {
          setError(loadError instanceof Error ? loadError.message : "Could not load warband trading.");
        }).finally(() => setLoading(false));
      }}>Retry loading trading</button>}
      {data && <>
        <div className="trading-columns">
          <div className="trading-block">
            <h3>Mordheim shop</h3>
            {creation ? <p className="trading-note" role="note">0 battles fought: use the warband-specific equipment shop in each warrior's details. The Mordheim shop opens after your first battle. Update Battles fought in Warband Information after playing.</p> : <>
            {!campaign && <p className="trading-note">After the first battle, buy here into the stash, then transfer equipment to eligible warriors.</p>}
            <div className="trading-inline">
              <label className="equipment-field"><span>CATEGORY</span><select aria-label="Shop category" value={shopCategory} onChange={(event) => setShopCategory(event.target.value)}>
                <option value="">All categories</option><option value="close-combat">Close combat</option><option value="missile">Missile</option><option value="blackpowder">Blackpowder</option><option value="armour">Armour</option><option value="miscellaneous">Miscellaneous</option><option value="animals">Animal bestiary</option>
              </select></label>
              <label className="equipment-field"><span>GRADE</span><select aria-label="Shop grade" value={grade} onChange={(event) => setGrade(event.target.value)}>
                <option value="">Core, 1a and 1b</option><option value="core">Core</option><option value="1a">1a</option><option value="1b">1b</option>
              </select></label>
            </div>
            {filteredShop?.length === 0 && <p className="equipment-state">No shop items match these filters.</p>}
            {!data.shop.length ? <p className="equipment-state">No shop items are available.</p> : <>
              <label className="equipment-field"><span>SHOP ITEM</span><select aria-label="Shop item" value={itemId} onChange={(event) => {
                const nextItemId = event.target.value;
                setItemId(nextItemId);
                setBuyerId("");
                setQuote(quotesByItem[`${nextItemId}:`] ?? null);
                setSearchResult(null);
              }}>
                {filteredShop?.map((entry) => <option key={entry.id} value={entry.id} disabled={entry.disabled}>{entry.name}{entry.grade ? ` · ${entry.grade}` : ""}{entry.disabled ? " · unavailable" : ""}{entry.rarity != null ? ` · rarity ${entry.rarity}` : ""}</option>)}
              </select></label>
              {item && <div className="shop-item-detail">
                <strong>{item.name} · {item.category}</strong>
                {item.grade && <small>Grade {item.grade} · {item.shopCategory?.replace("-", " ")}</small>}
                <span>{item.description || "No description."}</span>
                {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer">View source rules</a>}
                <small>Equipment effects without a linked profile are resolved using the item's tabletop rules.</small>
                <small>Base {item.baseCost} GC{item.priceDice ? ` + ${item.priceDice}d6 × ${item.priceMultiplier}` : ""}{item.rarity == null ? "" : ` · rarity ${item.rarity}`}</small>
                {campaign && !item.creationOnly && !item.purchaseAction && <small>Purchase rarity: {purchaseRarity == null ? "Common · no search required" : `${purchaseRarity} · requires a successful Hero search`}</small>}
                {item.creationOnly && <small>Warband creation only; unavailable after the first battle.</small>}
                {item.maxPerWarband && <small>Maximum {item.maxPerWarband} per warband.</small>}
                {item.maxPerModel && <small>Maximum {item.maxPerModel} per model.</small>}
                {item.requiresOwnedItem && <small>Recipient must carry a warhorse before receiving this barding.</small>}
                {item.skillByWarband && <small>{Object.entries(item.skillByWarband).map(([warband, skill]) => `${warband}: requires ${skill}`).join(" · ")}</small>}
                {item.allowedRoles?.length && <small>Roles: {item.allowedRoles.join(", ")}</small>}
                {commonOverrideHeroes.length > 0 && <small>Common purchase eligibility via: {commonOverrideHeroes.map((hero) => hero.name).join(", ")}</small>}
                {(item.heroOnly || item.requiredSkill || item.allowedWarbands?.length || item.excludedWarbands?.length || item.allowedTypeNames?.length || item.excludedTypeNames?.length) && <small>
                  {item.heroOnly ? "Heroes only · " : ""}
                  {item.requiredSkill ? `Requires ${item.requiredSkill} · ` : ""}
                  {item.allowedWarbands?.length ? `Warbands: ${item.allowedWarbands.join(", ")} · ` : ""}
                  {item.excludedWarbands?.length ? `Not for: ${item.excludedWarbands.join(", ")} · ` : ""}
                  {item.allowedTypeNames?.length ? `Types: ${item.allowedTypeNames.join(", ")} · ` : ""}
                  {item.excludedTypeNames?.length ? `Not for types: ${item.excludedTypeNames.join(", ")}` : ""}
                </small>}
                {item.disabled && <small className="trading-unavailable">Unavailable in this market.</small>}
              </div>}
              {item && (item.priceOverrides?.length ?? 0) > 0 && <label className="equipment-field"><span>BUYER / PRICE ELIGIBILITY</span><select aria-label="Shop buyer" value={buyerId} disabled={!actionsEnabled} onChange={(event) => {
                setBuyerId(event.target.value);
                setQuote(quotesByItem[`${item.id}:${event.target.value}`] ?? null);
              }}>
                <option value="">Standard price</option>
                {data.heroes.filter((hero) => item.priceOverrides?.some((override) => override.typeNames.includes(roster.members.find((member) => member.id === hero.id)?.type ?? ""))).map((hero) => <option key={hero.id} value={hero.id} disabled={hero.outOfAction}>{hero.name} · special price</option>)}
              </select></label>}
              {item?.purchaseAction === "ritual" && <>
                <RitualPurchase key={item.id} item={item} heroes={data.heroes} enabled={actionsEnabled && !item.disabled && Boolean(purchasable) && (!campaign || data.canSearch)} onAttempt={summon} />
                {searchResult && <p className="trading-result" role="status">{searchResult.heroName}: rolled {diceLabel(searchResult.dice)} = {searchResult.total} · {searchResult.success ? "Familiar summoned into stash" : "summoning failed"} · ritual cost paid</p>}
              </>}
              {item?.purchaseAction === "permanent-upgrade" && <WeaponUpgrade key={item.id} item={item} entries={data.memberInventory} members={roster.members} treasury={roster.treasury} quotedPrice={quote?.price} enabled={actionsEnabled && !item.disabled && Boolean(purchasable)} onUpgrade={upgrade} />}
              {itemMayBeRare && campaign && <>
                <div className="trading-inline">
                  <label className="equipment-field"><span>SEARCHING HERO</span><select value={searchHeroId} disabled={!actionsEnabled || !data.canSearch} onChange={(event) => setSearchHeroId(event.target.value)}>
                    <option value="">Choose available Hero</option>
                    {data.heroes.map((hero) => {
                      const heroType = roster.members.find((member) => member.id === hero.id)?.type;
                      const rarity = selectedItem ? shopItemRarityForType(selectedItem, heroType) : null;
                      return <option key={hero.id} value={hero.id} disabled={hero.outOfAction || hero.searched}>{hero.name} · {rarity == null ? "Common" : `rarity ${rarity}`}{hero.outOfAction ? " · out of action" : hero.searched ? " · searched this battle" : ""}</option>;
                    })}
                  </select></label>
                  <label className="equipment-field"><span>SEARCH ROLL</span><select value={searchMode} disabled={!actionsEnabled} onChange={(event) => setSearchMode(event.target.value as "manual" | "simulated")}><option value="simulated">Simulated</option><option value="manual">Manual</option></select></label>
                  {searchMode === "manual" && <label className="equipment-field"><span>2D6 (comma separated)</span><input aria-label="Manual search dice" value={searchDice} onChange={(event) => setSearchDice(event.target.value)} /></label>}
                  <button className="outline-button" type="button" disabled={!actionsEnabled || !data.canSearch || !searchHeroId || searchRarity == null || Boolean(item?.disabled)} onClick={() => void search()}>Search for item</button>
                </div>
                {searchResult && <p className="trading-result" role="status">{searchResult.heroName}: rolled {diceLabel(searchResult.dice)}{searchResult.modifier ? ` ${searchResult.modifier > 0 ? "+" : ""}${searchResult.modifier}` : ""} = {searchResult.total} · {searchResult.success ? "success" : "no item found"}</p>}
                {selectedSearch && <p className="trading-result">Successful search by {selectedSearch.heroName}; this item may be purchased once.</p>}
              </>}
              {item?.mapTypes && <MordheimMapControls types={item.mapTypes} value={mapInput} enabled={actionsEnabled && !item.disabled && Boolean(purchasable)} onChange={setMapInput} />}
              {item && item.purchaseAction !== "ritual" && item.priceDice > 0 && <div className="trading-inline">
                <label className="equipment-field"><span>PRICE ROLL</span><select value={mode} disabled={!actionsEnabled || Boolean(quote)} onChange={(event) => setMode(event.target.value as "manual" | "simulated")}><option value="simulated">Simulated</option><option value="manual">Manual</option></select></label>
                {mode === "manual" && item.priceDice > 0 && <label className="equipment-field"><span>{item.priceDice} D6 (comma separated)</span><input aria-label="Manual price dice" value={manualDice} disabled={!actionsEnabled} placeholder={Array.from({ length: item.priceDice }, () => "1").join(",")} onChange={(event) => setManualDice(event.target.value)} /></label>}
                <button className="outline-button" type="button" disabled={!actionsEnabled || !purchasable || Boolean(item.disabled) || Boolean(quote) || (campaign && itemMayBeRare && !selectedSearch)} onClick={() => void createQuote()}>{quote ? "Quote locked" : "Get price quote"}</button>
              </div>}
              {item && !item.purchaseAction && (item.priceDice === 0 || quote) && <div className="trading-quote" role="status">
                <strong>{item.priceDice > 0 ? "Quote" : "Price"}: {quote?.price ?? item.baseCost} GC</strong>
                {item.priceDice > 0 && quote && <span>Price dice: {diceLabel(quote.dice)} · Base cost plus dice × multiplier</span>}
                <label className="equipment-field"><span>QUANTITY</span><input aria-label="Purchase quantity" type="number" min={1} max={1000} step={1} value={quantity} disabled={!actionsEnabled} onChange={(event) => setQuantity(Math.min(1000, Math.max(1, Math.floor(Number(event.target.value) || 1))))} /></label>
                <span>Total: {(quote?.price ?? item.baseCost) * quantity} GC · Treasury: {roster.treasury} GC</span>
                <button className="primary-button" type="button" disabled={!actionsEnabled || !purchasable || item.disabled || (quote?.price ?? item.baseCost) * quantity > Number(roster.treasury) || (campaign && itemMayBeRare && (!selectedSearch || quantity !== 1))} onClick={() => void purchase()}>Buy into stash</button>
              </div>}
              {!purchasable && <p className="trading-note">Purchasing this item is not available at this campaign stage.</p>}
              {item && !item.purchaseAction && <CombatSpoils key={item.id} campaign={campaign} item={item} enabled={actionsEnabled && Boolean(purchasable)} onAdd={addSpoils} />}
            </>}
            </>}
          </div>
          <div className="trading-block">
            <h3>Stash · {data.stash.length} stack{data.stash.length === 1 ? "" : "s"}</h3>
            {data.stash.length ? <ul className="trading-inventory">{data.stash.map((entry) => <StashItem key={entry.id} entry={entry} roster={roster} enabled={actionsEnabled && data.canTransfer} onSend={transfer} canSell={actionsEnabled && data.canSell} onSell={sellStash}
              mapControls={<UnresolvedMap entry={entry} types={data.shop.find((item) => item.id === "mordheim-map")?.mapTypes ?? []} enabled={actionsEnabled && (data.canTransfer || data.canPurchase)} onResolve={(input) => resolveMap(entry, "stash", input)} />}
            />)}</ul> : <p className="equipment-state">The stash is empty.</p>}
            {data.canSell && <p className="trading-note">Sales pay half the listed base price, rounded down per item. Variable-price dice and amounts paid are not refunded.</p>}
            {!data.canTransfer && <p className="trading-note">Transfers are not available at this campaign stage.</p>}
          </div>
        </div>

        <div className="trading-block">
          <h3>Assigned equipment</h3>
          <AssignedEquipment entries={data.memberInventory} members={roster.members} />
          {data.memberInventory.filter((entry) => entry.shopItemId === "mordheim-map").map((entry) => <div key={entry.id}>
            <strong>{entry.name} · {roster.members.find((member) => member.id === entry.memberId)?.name}</strong>
            <MapResult entry={entry} />
            <UnresolvedMap entry={entry} types={data.shop.find((item) => item.id === "mordheim-map")?.mapTypes ?? []} enabled={actionsEnabled && (data.canTransfer || data.canPurchase)} onResolve={(input) => resolveMap(entry, "member", input)} />
          </div>)}
        </div>

        {campaign && <div className="trading-block">
          <h3>Battle records</h3>
          {isInjuryWindow && availableTradingHeroes.length > 0 && <div className="trading-inline">
            <label className="equipment-field"><span>HERO STATUS</span><select value={statusHeroId} disabled={!actionsEnabled} onChange={(event) => setStatusHeroId(event.target.value)}>
              <option value="">Choose Hero</option>{availableTradingHeroes.map((hero) => <option key={hero.id} value={hero.id}>{hero.name} · {hero.outOfAction ? "out of action" : "in action"}</option>)}
            </select></label>
            <button className="outline-button" type="button" disabled={!actionsEnabled || !statusHeroId} onClick={() => {
              const hero = availableTradingHeroes.find((entry) => entry.id === statusHeroId);
              if (hero) void setHeroStatus(hero);
            }}>{availableTradingHeroes.find((hero) => hero.id === statusHeroId)?.outOfAction ? "Mark returned to action" : "Mark out of action"}</button>
            <p className="trading-note">Hero status changes are available only during battle and the post-battle injury step. Backend campaign rules still apply.</p>
          </div>}
          {isCasualtyWindow && <div className="trading-inline casualty-controls">
            <label className="equipment-field"><span>FATAL CASUALTY</span><select value={casualtyMemberId} disabled={!actionsEnabled} onChange={(event) => { setCasualtyMemberId(event.target.value); setCasualtyModelIndex(0); }}>
              {roster.members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}{member.role === "Henchman" ? ` × ${member.groupSize}` : ""}</option>)}
            </select></label>
            {casualtyMember?.role === "Henchman" && <label className="equipment-field"><span>ACTUAL MODEL</span><select value={casualtyModelIndex} disabled={!actionsEnabled} onChange={(event) => setCasualtyModelIndex(Number(event.target.value))}>
              {Array.from({ length: casualtyMember.groupSize }, (_, index) => <option key={index} value={index}>Model {index + 1}</option>)}
            </select></label>}
            <button className="delete-roster-button" type="button" disabled={!actionsEnabled || !casualtyMember} onClick={() => void recordCasualty()}>Record permanent death</button>
            <p className="casualty-warning">This is a permanent death, not a generic roster removal. The warrior's equipment is lost and no gold is refunded. Confirm carefully.</p>
          </div>}
          {!isInjuryWindow && !isCasualtyWindow && <p className="trading-note">Out-of-action and casualty controls appear only in their applicable battle or post-battle step.</p>}
          <h3>Search history</h3>
          {data.searches.length ? <ul className="trading-history">{data.searches.map((search) => <li key={search.id}>{search.heroName} searched for {search.itemName}: {diceLabel(search.dice)}{search.modifier ? ` ${search.modifier > 0 ? "+" : ""}${search.modifier}` : ""} = {search.total} · {search.success ? "success" : "failed"}{search.purchased ? " · purchased" : ""}</li>)}</ul> : <p className="equipment-state">No item searches recorded.</p>}
        </div>}
      </>}
    </section>
  );
}
