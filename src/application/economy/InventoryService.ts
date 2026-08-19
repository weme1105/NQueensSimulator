import type { AssistItemId, DailyRewardDefinition, InventoryBalance } from '../../core/economy/types';
import type { PlayerProgress } from '../progress/PlayerProgress';

export interface DailyRewardPolicy {
  rewardForDay(dayKey: string, totalClaims: number): DailyRewardDefinition;
}

export function getInventoryQuantity(progress: PlayerProgress, itemId: AssistItemId): number {
  return progress.inventory.find((item) => item.itemId === itemId)?.quantity ?? 0;
}

export function grantInventory(progress: PlayerProgress, itemId: AssistItemId, quantity: number, nowIso = new Date().toISOString()): PlayerProgress {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Grant quantity must be a positive integer');
  const inventory = upsertBalance(progress.inventory, itemId, quantity);
  return { ...progress, inventory, updatedAt: nowIso };
}

export function consumeInventory(progress: PlayerProgress, itemId: AssistItemId, quantity = 1, nowIso = new Date().toISOString()): PlayerProgress {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Consume quantity must be a positive integer');
  const current = getInventoryQuantity(progress, itemId);
  if (current < quantity) throw new Error(`Insufficient inventory for ${itemId}`);
  const inventory = setBalance(progress.inventory, itemId, current - quantity);
  return { ...progress, inventory, updatedAt: nowIso };
}

export function canClaimDailyReward(progress: PlayerProgress, dayKey: string): boolean {
  return progress.dailyReward.lastClaimedDay !== dayKey;
}

export function claimDailyReward(
  progress: PlayerProgress,
  dayKey: string,
  policy: DailyRewardPolicy,
  nowIso = new Date().toISOString(),
): { progress: PlayerProgress; reward: DailyRewardDefinition } {
  if (!canClaimDailyReward(progress, dayKey)) throw new Error('Daily reward already claimed');
  const reward = policy.rewardForDay(dayKey, progress.dailyReward.totalClaims);
  let next = progress;
  for (const grant of reward.grants) next = grantInventory(next, grant.itemId, grant.quantity, nowIso);
  next = {
    ...next,
    dailyReward: {
      lastClaimedDay: dayKey,
      totalClaims: progress.dailyReward.totalClaims + 1,
    },
    updatedAt: nowIso,
  };
  return { progress: next, reward };
}

function upsertBalance(items: readonly InventoryBalance[], itemId: AssistItemId, delta: number): InventoryBalance[] {
  const current = items.find((item) => item.itemId === itemId)?.quantity ?? 0;
  return setBalance(items, itemId, current + delta);
}

function setBalance(items: readonly InventoryBalance[], itemId: AssistItemId, quantity: number): InventoryBalance[] {
  const next = items.filter((item) => item.itemId !== itemId).map((item) => ({ ...item }));
  next.push({ itemId, quantity });
  return next;
}
