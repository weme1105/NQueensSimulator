export type CurrencyCode = 'QC';

export interface WalletBalance {
  currency: CurrencyCode;
  amount: number;
}

export interface WalletTransaction {
  transactionId: string;
  currency: CurrencyCode;
  amount: number;
  reason: 'purchase' | 'reward' | 'challenge' | 'achievement' | 'event' | 'adjustment';
  referenceId?: string;
  createdAt: string;
}

export interface WalletSnapshot {
  balances: WalletBalance[];
  recentTransactions: WalletTransaction[];
}

export function balanceOf(wallet: WalletSnapshot, currency: CurrencyCode): number {
  return wallet.balances.find((entry) => entry.currency === currency)?.amount ?? 0;
}
