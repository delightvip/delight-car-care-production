
/**
 * نموذج فئة المعاملات المالية
 */
export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  created_at?: string;
}

/**
 * نموذج المعاملة المالية
 */
export interface Transaction {
  id: string;
  date: string; // Changed from string | Date to just string for consistency
  amount: number;
  type: 'income' | 'expense';
  category_id: string;
  category_name: string;
  category_type: string;
  payment_method: string;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_at?: string;
}

/**
 * نموذج الملخص المالي
 */
export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  cashBalance: number;
  bankBalance: number;
  totalBalance: number;
  categoryAnalysis: any[];
  recentTransactions: Transaction[];
  startDate?: string;
  endDate?: string;
}

/**
 * نموذج رصيد مالي
 */
export interface FinancialBalance {
  id: string;
  cash_balance: number;
  bank_balance: number;
  last_updated?: string;
}
