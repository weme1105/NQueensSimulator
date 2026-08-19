import type { CurrencyCode, WalletSnapshot, WalletTransaction } from '../../core/economy/wallet';

export interface WalletRepository {
  load(): Promise<WalletSnapshot>;
  credit(currency: CurrencyCode, amount: number, transaction: Omit<WalletTransaction, 'amount' | 'currency'>): Promise<WalletSnapshot>;
  debit(currency: CurrencyCode, amount: number, transaction: Omit<WalletTransaction, 'amount' | 'currency'>): Promise<WalletSnapshot>;
}
