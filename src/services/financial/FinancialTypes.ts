
export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  periodIncome: number;
  periodExpense: number;
  periodProfit: number;
  previousPeriodIncome?: number;
  previousPeriodExpense?: number;
  previousPeriodProfit?: number;
  incomeGrowth?: number;
  expenseGrowth?: number;
  profitGrowth?: number;
  cashBalance?: number;
  bankBalance?: number;
  // Add missing properties
  startDate?: string;
  endDate?: string;
  totalBalance?: number;
  recentTransactions?: any[];
  netIncome?: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  created_at?: string;
}

export interface Transaction {
  id: string;
  date: string;
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
  is_reduction?: boolean;
}

export interface FinancialBalance {
  id: string;
  cash_balance: number;
  bank_balance: number;
  last_updated: string;
}
