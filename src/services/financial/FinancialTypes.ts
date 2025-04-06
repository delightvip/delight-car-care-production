export interface Category {
  id: string;
  name: string;
  description?: string;
  type: 'income' | 'expense';
  created_at?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  category_name?: string;
  category_type?: 'income' | 'expense';
  date: string;
  payment_method: string;
  notes?: string;
  reference_id?: string;
  reference_type?: string;
  created_at?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  incomeByCategory: CategoryAmount[];
  expenseByCategory: CategoryAmount[];
  recentTransactions: Transaction[];
  // Additional properties used in the components
  startDate?: string;
  endDate?: string;
  netIncome?: number; // Alias for netProfit for backward compatibility
  cashBalance?: number;
  bankBalance?: number;
  totalBalance?: number;
  categoryAnalysis?: any[];
  salesProfit?: number; // صافي الربح من المبيعات (من جدول profits)
}

export interface CategoryAmount {
  category: string;
  amount: number;
  percentage: number;
}

export interface FinancialBalance {
  id: string;
  cash_balance: number;
  bank_balance: number;
  last_updated?: string;
}
