import type { StoreProduct, StoreProductId } from '../../core/economy/types';

export interface PurchaseReceipt {
  transactionId: string;
  productId: StoreProductId;
  purchasedAt: string;
}

/**
 * Platform store boundary. Web, App Store and Google Play implementations can differ
 * without leaking billing APIs into application/core logic.
 */
export interface StoreRepository {
  listProducts(): Promise<StoreProduct[]>;
  purchase(productId: StoreProductId): Promise<PurchaseReceipt>;
  restorePurchases?(): Promise<PurchaseReceipt[]>;
}
