import type { AssistItemId, DailyRewardDefinition, InventoryBalance } from '../../core/economy/types';

export function quantityOf(balances: readonly InventoryBalance[], itemId: AssistItemId): number {
  return balances.find((entry) => entry.itemId === itemId)?.quantity ?? 0;
}

export function grantItem(
  balances: readonly InventoryBalance[],
  itemId: AssistItemId,
  quantity: number,
): InventoryBalance[] {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Grant quantity must be a positive integer.');
  const next = balances.map((entry) => ({ ...entry }));
  const current = next.find((entry) => entry.itemId === itemId);
  if (current) current.quantity += quantity;
  else next.push({ itemId, quantity });
  return next;
}

export function consumeItem(
  balances: readonly InventoryBalance[],
  itemId: AssistItemId,
  quantity = 1,
): InventoryBalance[] {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Consume quantity must be a positive integer.');
  const available = quantityOf(balances, itemId);
  if (available < quantity) throw new Error(`Not enough ${itemId} inventory.`);
  return balances.map((entry) => entry.itemId === itemId
    ? { ...entry, quantity: entry.quantity - quantity }
    : { ...entry });
}

export function applyDailyReward(
  balances: readonly InventoryBalance[],
  reward: DailyRewardDefinition,
): InventoryBalance[] {
  return reward.grants.reduce(
    (current, grant) => grantItem(current, grant.itemId, grant.quantity),
    balances.map((entry) => ({ ...entry })),
  );
}
