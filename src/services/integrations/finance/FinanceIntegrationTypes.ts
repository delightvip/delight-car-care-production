
/**
 * أنواع بيانات التكامل المالي
 */

export interface ProfitCalculationResult {
  totalCost: number;
  totalPrice: number;
  profit: number;
  profitMargin: number;
}

export interface LedgerEntryData {
  party_id: string;
  transaction_id: string;
  transaction_type: string;
  date: string;
  debit: number;
  credit: number;
  notes?: string;
}

export interface BalanceUpdateData {
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'other';
}
