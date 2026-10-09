import { useState } from "react";
import type { EquipmentCategory, EquipmentStats, InventoryEntry, Member, WarriorEquipmentData } from "../types";
import { MutationInventoryPanel } from "./mutation-inventory-panel";

function EquipmentStatsSummary({ stats }: { stats: EquipmentStats | null }) {
  if (!stats || (!stats.weapon && !stats.armour && !stats.materialModifier && !stats.poison)) return null;
  return (
    <div className="equipment-stats">
      {stats.weapon && (
        <div className="equipment-stats-block">
          <span className="equipment-stats-line">
            <strong>{stats.weapon.name}</strong> · Range {stats.weapon.rangeText} · Strength {stats.weapon.strengthModifier}
          </span>
          {stats.weapon.specialRules.map((rule) => (
            <p className="equipment-stats-rule" key={rule.name}><strong>{rule.name}:</strong> {rule.description}</p>
          ))}
          {stats.weapon.notes && <p className="equipment-stats-rule">{stats.weapon.notes}</p>}
        </div>
      )}
      {stats.armour && (
        <div className="equipment-stats-block">
          <span className="equipment-stats-line">
            <strong>{stats.armour.name}</strong>
            {stats.armour.saveText ? ` · Save ${stats.armour.saveText}` : ""}
            {stats.armour.movementPenalty ? ` · ${stats.armour.movementPenalty}` : ""}
          </span>
          {stats.armour.specialRules.map((rule) => (
            <p className="equipment-stats-rule" key={rule.name}><strong>{rule.name}:</strong> {rule.description}</p>
          ))}
          {stats.armour.notes && <p className="equipment-stats-rule">{stats.armour.notes}</p>}
        </div>
      )}
      {stats.materialModifier && (
        <p className="equipment-stats-rule"><strong>{stats.materialModifier.name}:</strong> {stats.materialModifier.effectText}</p>
      )}
      {stats.poison && (
        <p className="equipment-stats-rule"><strong>{stats.poison.name}:</strong> {stats.poison.effectText}</p>
      )}
    </div>
  );
}

interface EquipmentInventoryPanelProps {
  member: Member;
  treasury: string;
  data: WarriorEquipmentData | null;
  loading: boolean;
  error: string;
  purchaseLocked?: boolean;
  onPurchase: (equipmentOptionId: string, modelIndex: number, quantity: number) => Promise<void>;
  onSell: (inventoryItemIds: string[]) => Promise<void>;
  onSetMutations: (mutationIds: string[]) => Promise<boolean>;
  stashReturns?: InventoryEntry[];
  canReturnToStash?: boolean;
  onReturnToStash?: (inventoryId: string, quantity: number, modelIndex: number) => Promise<void>;
}

export function InventoryStashReturn({ entry, enabled, onReturn }: {
  entry: InventoryEntry;
  enabled: boolean;
  onReturn: (inventoryId: string, quantity: number, modelIndex: number) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const maximum = Math.min(1000, entry.returnQuantity ?? 0);
  const shared = entry.returnModelIndex === -1 && entry.modelIndex !== -1;
  if (entry.nontransferable) return <small>Permanently poisoned: cannot be traded or returned to stash.</small>;
  return <div className="trading-inline">
    <label className="equipment-field"><span>RETURN{shared ? " PER MODEL" : ""}</span><input aria-label={`Return quantity for ${entry.name}${shared || entry.modelIndex === -1 ? "" : ` model ${(entry.modelIndex ?? 0) + 1}`}`} type="number" min={1} max={Math.max(1, maximum)} value={quantity} disabled={!enabled || busy} onChange={(event) => setQuantity(Math.max(1, Math.min(1000, Math.floor(Number(event.target.value) || 1))))} /></label>
    <button className="outline-button" type="button" disabled={!enabled || busy || maximum < quantity} onClick={() => {
      setBusy(true);
      void onReturn(entry.id, quantity, entry.returnModelIndex ?? entry.modelIndex ?? 0).finally(() => setBusy(false));
    }}>{busy ? "Returning..." : `Return to stash${shared ? " · all models" : ""}`}</button>
    {shared && <small>Returns the same quantity from every model.</small>}
  </div>;
}

export function EquipmentInventoryPanel({ member, treasury, data, loading, error, purchaseLocked = false, onPurchase, onSell, onSetMutations, stashReturns = [], canReturnToStash = false, onReturnToStash }: EquipmentInventoryPanelProps) {
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [modelIndex, setModelIndex] = useState(-1);
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [sellingStackKey, setSellingStackKey] = useState<string | null>(null);
  const availableOptions = (data?.availableOptions ?? []).filter((option) => !(option.firstFree && option.unitCost === 0));
  const inventoryStacks = (() => {
    const stacks = new Map<string, {
      key: string;
      name: string;
      quantity: number;
      unitCostPaid: number;
      sourceReference: string;
      stats: EquipmentStats | null;
      description: string;
      category: EquipmentCategory;
      inventoryItemIds: string[];
      modelIndexes: number[];
      shopItemId: string | null;
      unitSaleValue: number | null;
      saleRestriction: string | null;
    }>();
    for (const item of data?.inventory ?? []) {
      const key = member.role === "Henchman"
        ? `${item.shopItemId ? `shop:${item.shopItemId}` : `option:${item.equipmentOptionId}`}/${item.unitCostPaid}`
        : item.id;
      const stack = stacks.get(key);
      if (stack) {
        stack.quantity += item.quantity;
        stack.inventoryItemIds.push(item.id);
        stack.modelIndexes.push(item.modelIndex);
        if (!stack.description && item.description) stack.description = item.description;
        if (item.shopItemId) stack.shopItemId = item.shopItemId;
      } else {
        stacks.set(key, {
          key,
          name: item.name,
          quantity: item.quantity,
          unitCostPaid: item.unitCostPaid,
          sourceReference: item.sourceReference,
          stats: item.stats,
          description: item.description ?? "",
          category: item.category,
          inventoryItemIds: [item.id],
          modelIndexes: [item.modelIndex],
          shopItemId: item.shopItemId ?? null,
          unitSaleValue: item.unitSaleValue ?? null,
          saleRestriction: item.saleRestriction ?? null,
        });
      }
    }
    return [...stacks.values()];
  })();
  const selectedOption = availableOptions.find((option) => option.id === selectedOptionId);
  const groupSize = member.role === "Henchman" ? member.groupSize : 1;
  const targetModels = member.role === "Henchman" && modelIndex === -1
    ? Array.from({ length: groupSize }, (_, index) => index)
    : [member.role === "Henchman" ? modelIndex : 0];
  const totalCost = selectedOption
    ? targetModels.reduce((total, model) => {
      const hasItem = data?.inventory.some((item) => item.equipmentOptionId === selectedOption.id && item.modelIndex === model);
      const freeQuantity = selectedOption.firstFree && !hasItem ? 1 : 0;
      return total + Math.max(0, quantity - freeQuantity) * selectedOption.unitCost;
    }, 0)
    : 0;

  function selectOption(optionId: string) {
    setSelectedOptionId(optionId);
    setModelIndex(-1);
  }

  async function buySelectedOption() {
    if (!selectedOption) return;
    setPurchasing(true);
    try {
      await onPurchase(selectedOption.id, modelIndex, quantity);
      setQuantity(1);
    } finally {
      setPurchasing(false);
    }
  }

  async function sellItem(stackKey: string, inventoryItemIds: string[]) {
    setSellingStackKey(stackKey);
    try {
      await onSell(inventoryItemIds);
    } finally {
      setSellingStackKey(null);
    }
  }

  return (
    <section className="equipment-inventory" aria-label="Warrior inventory">
      <div className="equipment-inventory-heading">
        <span className="equipment-inventory-label">INVENTORY</span>
        <strong>Weapons &amp; armour</strong>
      </div>
      {purchaseLocked && <p className="trading-note" role="note">Recruitment equipment shops are closed after the first battle in Freebuild, or after campaign setup. Buy through the Trading Post into Warband stash, then transfer items here.</p>}
      {loading ? <p className="equipment-state">Loading equipment...</p> : purchaseLocked ? null : availableOptions.length ? (
        <div className="equipment-purchase-form">
          <label className="equipment-field">
            <span>ITEM</span>
            <select value={selectedOptionId} onChange={(event) => selectOption(event.target.value)}>
              <option value="">Choose item</option>
              {availableOptions.map((option) => (
                <option key={option.id} value={option.id}>
                    {option.name} · {option.category} · {option.listName} · {option.firstFree ? `1st free, then ${option.unitCost} GC` : `${option.unitCost} GC`}
                </option>
              ))}
            </select>
          </label>
          {member.role === "Henchman" && selectedOption?.allowIndividualGroupGear && (
            <label className="equipment-field">
              <span>MODEL</span>
              <select value={modelIndex} onChange={(event) => setModelIndex(Number(event.target.value))}>
                <option value={-1}>All {groupSize} models</option>
                {Array.from({ length: groupSize }, (_, index) => <option key={index} value={index}>Model {index + 1}</option>)}
              </select>
            </label>
          )}
          <div className="equipment-purchase-row">
            <label className="equipment-field equipment-quantity">
              <span>QTY {member.role === "Henchman" && modelIndex === -1 ? "PER MODEL" : ""}</span>
              <input type="number" min={1} step={1} value={quantity} onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isSafeInteger(value) && value >= 1) setQuantity(value);
              }} />
            </label>
            <div className="equipment-total">
              <span>TOTAL</span>
              <strong>{totalCost} GC</strong>
            </div>
            <button className="equipment-buy-button" type="button" disabled={!selectedOption || purchasing || totalCost > Number(treasury)} onClick={() => void buySelectedOption()}>
              {purchasing ? "Buying..." : "Buy"}
            </button>
          </div>
          {selectedOption && <small className="equipment-source">{selectedOption.equipmentRule}{selectedOption.ruleText ? ` ${selectedOption.ruleText}` : ""}</small>}
          {selectedOption && <EquipmentStatsSummary stats={selectedOption.stats} />}
        </div>
      ) : (
        <p className="equipment-state">No weapon or armour list is available for this warrior.</p>
      )}
      {error && <p className="equipment-error" role="alert">{error}</p>}
      <div className="equipment-owned">
        <span className="equipment-inventory-label">OWNED</span>
        {inventoryStacks.length ? inventoryStacks.map((stack) => {
          const creationRefund = data?.recruitmentRefund !== false;
          const refund = (creationRefund ? stack.unitCostPaid : stack.unitSaleValue ?? 0) * stack.quantity;
          const saleAvailable = creationRefund ? !stack.shopItemId && refund > 0
            : Boolean(data?.canSell && stack.unitSaleValue !== null && !stack.saleRestriction);
          const modelNumbers = [...new Set(stack.modelIndexes)].sort((first, second) => first - second).map((index) => index + 1);
          const modelLabel = modelNumbers.length === 1 ? `Model ${modelNumbers[0]}` : `Models ${modelNumbers.join(", ")}`;
          const returns = stashReturns.filter((entry) => stack.inventoryItemIds.includes(entry.id));
          const returnEntries = returns[0]?.returnModelIndex === -1 ? returns.slice(0, 1) : returns;
          return (
          <div className="equipment-owned-item" key={stack.key}>
            <div className="equipment-owned-item-main">
              <span>{stack.name} ×{stack.quantity}<small>{stack.category}{member.role === "Henchman" ? ` · ${modelLabel}` : ""}</small>{stack.description && <small>{stack.description}</small>}</span>
              <EquipmentStatsSummary stats={stack.stats} />
            </div>
            <div className="equipment-owned-actions">
              <strong>{creationRefund ? "Refund" : "Resale"}: {refund} GC</strong>
              {saleAvailable
                ? <button className="equipment-sell-button" type="button" disabled={sellingStackKey !== null} aria-label={`${creationRefund ? "Refund" : "Sell"} ${stack.quantity} ${stack.name} for ${refund} GC`} onClick={() => void sellItem(stack.key, stack.inventoryItemIds)}>{sellingStackKey === stack.key ? "Selling..." : `${creationRefund ? "Refund" : "Sell"} ×${stack.quantity} · ${refund} GC`}</button>
                : <span className="equipment-unsellable">{creationRefund ? stack.shopItemId ? "No refund" : "Free · not for sale"
                  : stack.saleRestriction ?? "Sales are unavailable at this campaign stage."}</span>}
              {onReturnToStash && returnEntries.map((entry) => <div key={entry.id}>
                {member.role === "Henchman" && entry.returnModelIndex !== -1 && <small>Model {(entry.modelIndex ?? 0) + 1}</small>}
                <InventoryStashReturn entry={entry} enabled={canReturnToStash && sellingStackKey === null} onReturn={onReturnToStash} />
              </div>)}
            </div>
          </div>
          );
        }) : <p className="equipment-state">No items purchased.</p>}
      </div>
      {!loading && data?.mutations.eligible && <MutationInventoryPanel
        key={`${member.id}-${data.mutations.entries.map((entry) => entry.id).join(",")}`}
        data={data.mutations}
        treasury={treasury}
        onSave={onSetMutations}
      />}
    </section>
  );
}
