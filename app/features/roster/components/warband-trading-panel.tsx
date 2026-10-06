import { useEffect, useRef, useState } from "react";
import type { InventoryEntry, Roster, ShopItem, TradingData, TradingHero, TradingQuote, TradingSearch } from "../types";
import { WarbandCurrency } from "./roster-fields";

type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;

function diceLabel(dice: number[]) {
  return dice.length ? dice.join(", ") : "no dice";
}

export function tradingDataRefreshKey(roster: Pick<Roster, "id" | "campaignId" | "campaign"> & Partial<Pick<Roster, "members">>): string {
  return JSON.stringify([
    roster.id,
    roster.campaignId,
    roster.campaign?.phase ?? null,
    roster.campaign?.step ?? null,
    roster.campaign?.allowedActions ?? [],
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
  const groups = new Map<string, { name: string; category: InventoryEntry["category"]; quantity: number; memberIds: Set<string> }>();
  for (const entry of entries) {
    const key = JSON.stringify([entry.name, entry.category]);
    const group = groups.get(key) ?? { name: entry.name, category: entry.category, quantity: 0, memberIds: new Set<string>() };
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
  if (campaign) return null;
  return <div className="trading-quote">
    <strong>Combat spoils · no Gold Crowns charged</strong>
    <label className="equipment-field"><span>SPOILS QUANTITY</span><input aria-label="Combat spoils quantity" type="number" min={1} max={1000} step={1} value={quantity} disabled={!enabled || item.disabled} onChange={(event) => setQuantity(Math.min(1000, Math.max(1, Math.floor(Number(event.target.value) || 1))))} /></label>
    <button className="outline-button" type="button" disabled={!enabled || item.disabled} onClick={() => void onAdd(quantity)}>Add as combat spoils</button>
    <small>Add the selected shop item to your stash for free. No rarity search or price roll required; equipment restrictions still apply.</small>
  </div>;
}

export function StashItem({ entry, roster, enabled, onSend }: {
  entry: InventoryEntry;
  roster: Roster;
  enabled: boolean;
  onSend: (entryId: string, memberId: string, quantity: number, modelIndex: number) => Promise<void>;
}) {
  const [memberId, setMemberId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [modelIndex, setModelIndex] = useState(-1);
  const recipients = roster.members.filter((member) => entry.eligibleRecipients?.some((recipient) => recipient.memberId === member.id));
  const member = recipients.find((recipient) => recipient.id === memberId);
  const individual = entry.eligibleRecipients?.find((recipient) => recipient.memberId === memberId)?.allowIndividualGroupGear;
  const perModel = member?.role === "Henchman" && (modelIndex === -1 || !individual);
  const maximum = Math.min(1000, Math.floor(entry.quantity / (perModel ? member.groupSize : 1)));
  return <li>
    <strong>{entry.name} × {entry.quantity}</strong>
    <span>{entry.category} · {entry.unitCostPaid} GC each</span>
    {entry.description && <small>{entry.description}</small>}
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
  const [mode, setMode] = useState<"manual" | "simulated">("simulated");
  const [manualDice, setManualDice] = useState("");
  const [quote, setQuote] = useState<TradingQuote | null>(null);
  const [quotesByItem, setQuotesByItem] = useState<Record<string, TradingQuote>>({});
  const [quantity, setQuantity] = useState(1);
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
  const isInjuryWindow = isHeroStatusWindow(roster.campaign);
  const isCasualtyWindow = isCampaignInjuryStep(roster.campaign);
  const item = data?.shop.find((entry) => entry.id === itemId);
  const searchHero = roster.members.find((member) => member.id === searchHeroId);
  const searchRarity = item ? shopItemRarityForType(item, searchHero?.type) : null;
  const purchaseRarity = item && data ? shopItemPurchaseRarity(item, data.heroes, roster.members) : item?.rarity ?? null;
  const itemMayBeRare = Boolean(item && campaign && purchaseRarity !== null);
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
    if (data && !data.shop.some((entry) => entry.id === itemId)) {
      const firstItemId = data.shop[0]?.id ?? "";
      setItemId(firstItemId);
      setQuote(quotesByItem[firstItemId] ?? null);
    }
    if (data && !data.heroes.some((hero) => hero.id === searchHeroId && !hero.outOfAction && !hero.searched)) {
      setSearchHeroId(data.heroes.find((hero) => !hero.outOfAction && !hero.searched)?.id ?? "");
    }
    if (data && !roster.members.some((member) => member.id === casualtyMemberId)) setCasualtyMemberId(roster.members[0]?.id ?? "");
  }, [data, roster.members, itemId, searchHeroId, casualtyMemberId, quotesByItem]);

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
        itemId: item.id, mode, ...(dice === undefined ? {} : { dice }),
      });
      if (rosterIdRef.current === roster.id) {
        setQuotesByItem((current) => ({ ...current, [item.id]: result }));
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
      const offer = quote ?? await request<TradingQuote>(`/rosters/${roster.id}/trading/quote`, "POST", {
        itemId: item.id, mode: "simulated",
      });
      const refreshed = await request<TradingData>(`/rosters/${roster.id}/trading/purchase`, "POST", {
        quoteId: offer.id, quantity, ...(selectedSearch ? { searchId: selectedSearch.id } : {}),
      });
      if (rosterIdRef.current === roster.id) {
        setQuote(null);
        setQuotesByItem((current) => {
          const next = { ...current };
          delete next[item.id];
          return next;
        });
        setSearchResult(null);
        setData(refreshed);
      }
      await onChanged();
    });
  }

  async function addSpoils(spoilsQuantity: number) {
    if (!item) return;
    await act(async () => {
      const refreshed = await request<TradingData>(`/rosters/${roster.id}/trading/spoils`, "POST", {
        itemId: item.id, quantity: spoilsQuantity,
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
            <h3>Shop &amp; purchase</h3>
            {!data.shop.length ? <p className="equipment-state">No shop items are available.</p> : <>
              <label className="equipment-field"><span>SHOP ITEM</span><select value={itemId} onChange={(event) => {
                const nextItemId = event.target.value;
                setItemId(nextItemId);
                setQuote(quotesByItem[nextItemId] ?? null);
                setSearchResult(null);
              }}>
                {data.shop.map((entry) => <option key={entry.id} value={entry.id} disabled={entry.disabled}>{entry.name}{entry.disabled ? " · unavailable" : ""}{entry.rarity != null ? ` · rarity ${entry.rarity}` : ""}</option>)}
              </select></label>
              {item && <div className="shop-item-detail">
                <strong>{item.name} · {item.category}</strong>
                <span>{item.description || "No description."}</span>
                <small>Base {item.baseCost} GC{item.priceDice ? ` + ${item.priceDice}d6 × ${item.priceMultiplier}` : ""}{item.rarity == null ? "" : ` · rarity ${item.rarity}`}</small>
                {campaign && <small>Purchase rarity: {purchaseRarity == null ? "Common · no search required" : `${purchaseRarity} · requires a successful Hero search`}</small>}
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
              {item && item.priceDice > 0 && <div className="trading-inline">
                <label className="equipment-field"><span>PRICE ROLL</span><select value={mode} disabled={!actionsEnabled || Boolean(quote)} onChange={(event) => setMode(event.target.value as "manual" | "simulated")}><option value="simulated">Simulated</option><option value="manual">Manual</option></select></label>
                {mode === "manual" && item.priceDice > 0 && <label className="equipment-field"><span>{item.priceDice} D6 (comma separated)</span><input aria-label="Manual price dice" value={manualDice} disabled={!actionsEnabled} placeholder={Array.from({ length: item.priceDice }, () => "1").join(",")} onChange={(event) => setManualDice(event.target.value)} /></label>}
                <button className="outline-button" type="button" disabled={!actionsEnabled || !data.canPurchase || Boolean(item.disabled) || Boolean(quote) || (campaign && itemMayBeRare && !selectedSearch)} onClick={() => void createQuote()}>{quote ? "Quote locked" : "Get price quote"}</button>
              </div>}
              {item && (item.priceDice === 0 || quote) && <div className="trading-quote" role="status">
                <strong>{item.priceDice > 0 ? "Quote" : "Price"}: {quote?.price ?? item.baseCost} GC</strong>
                {item.priceDice > 0 && quote && <span>Price dice: {diceLabel(quote.dice)} · Base cost plus dice × multiplier</span>}
                <label className="equipment-field"><span>QUANTITY</span><input aria-label="Purchase quantity" type="number" min={1} max={1000} step={1} value={quantity} disabled={!actionsEnabled} onChange={(event) => setQuantity(Math.min(1000, Math.max(1, Math.floor(Number(event.target.value) || 1))))} /></label>
                <span>Total: {(quote?.price ?? item.baseCost) * quantity} GC · Treasury: {roster.treasury} GC</span>
                <button className="primary-button" type="button" disabled={!actionsEnabled || !data.canPurchase || item.disabled || (quote?.price ?? item.baseCost) * quantity > Number(roster.treasury) || (campaign && itemMayBeRare && (!selectedSearch || quantity !== 1))} onClick={() => void purchase()}>Buy into stash</button>
              </div>}
              {!data.canPurchase && <p className="trading-note">Purchasing is not available at this campaign stage.</p>}
              {item && <CombatSpoils key={item.id} campaign={campaign} item={item} enabled={actionsEnabled} onAdd={addSpoils} />}
            </>}
          </div>
          <div className="trading-block">
            <h3>Stash · {data.stash.length} stack{data.stash.length === 1 ? "" : "s"}</h3>
            {data.stash.length ? <ul className="trading-inventory">{data.stash.map((entry) => <StashItem key={entry.id} entry={entry} roster={roster} enabled={actionsEnabled && data.canTransfer} onSend={transfer} />)}</ul> : <p className="equipment-state">The stash is empty.</p>}
            {!data.canTransfer && <p className="trading-note">Transfers are not available at this campaign stage.</p>}
          </div>
        </div>

        <div className="trading-block">
          <h3>Assigned equipment</h3>
          <AssignedEquipment entries={data.memberInventory} members={roster.members} />
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
