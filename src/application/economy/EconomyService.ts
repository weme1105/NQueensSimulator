import type {
  AssistItemId,
  DailyRewardDefinition,
  InventoryBalance,
  StoreProductId,
} from '../../core/economy/types';

export interface PurchaseResult {
  productId: StoreProductId;
  grantedItemId: AssistItemId;
  grantedQuantity: number;
  transactionId: string;
}

/**
 * Platform boundary for real purchases. Web/App implementations provide localized pricing,
 * checkout and receipt/transaction verification. Core game code never talks directly to
 * App Store / Google Play / web payment SDKs.
 */
export interface StoreService {
  purchase(productId: StoreProductId): Promise<PurchaseResult>;
  restore?(): Promise<void>;
}

export interface InventoryRepository {
  load(): Promise<InventoryBalance[]>;
  save(balances: InventoryBalance[]): Promise<void>;
}

export interface DailyRewardRepository {
  getDefinition(dayKey: string): Promise<DailyRewardDefinition>;
}
