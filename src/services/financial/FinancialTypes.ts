
/**
 * أنواع البيانات المالية
 */

/**
 * نوع الفئة المالية
 */
export interface Category {
  id: string;
  name: string;
  description?: string;
  type: 'income' | 'expense';
  created_at?: string;
}

/**
 * نوع المعاملة المالية
 */
export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category_id: string;
  category_name?: string;
  amount: number;
  payment_method: 'cash' | 'bank' | 'other';
  notes?: string;
  reference_id?: string;
  reference_type?: string;
  created_at?: string;
}

/**
 * نوع رصيد الخزينة
 */
export interface Balance {
  cash_balance: number;
  bank_balance: number;
  last_updated?: string;
}
