export type AssistItemId = 'solve-step' | 'solve-next-queen';

export type StoreProductId = 'assist.solve-step' | 'assist.solve-next-queen';

export interface InventoryBalance {
  itemId: AssistItemId;
  quantity: number;
}

export interface AssistUsage {
  itemId: AssistItemId;
  quantity: number;
}

export interface StoreProduct {
  productId: StoreProductId;
  itemId: AssistItemId;
  displayName: string;
  description: string;
  /** Quantity granted by one purchase. Pricing is supplied by the platform store adapter. */
  grantQuantity: number;
  consumable: true;
}

export interface DailyRewardGrant {
  itemId: AssistItemId;
  quantity: number;
}

export interface DailyRewardDefinition {
  rewardId: string;
  grants: DailyRewardGrant[];
}

export interface DailyRewardState {
  lastClaimedDay?: string;
  totalClaims: number;
}

export const ASSIST_PRODUCTS: readonly StoreProduct[] = [
  {
    productId: 'assist.solve-step',
    itemId: 'solve-step',
    displayName: '推演一步',
    description: '使用一次推演一步輔助。',
    grantQuantity: 1,
    consumable: true,
  },
  {
    productId: 'assist.solve-next-queen',
    itemId: 'solve-next-queen',
    displayName: '推演到下一個皇后',
    description: '使用一次推演到下一個皇后的輔助。',
    grantQuantity: 1,
    consumable: true,
  },
] as const;
