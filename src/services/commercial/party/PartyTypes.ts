
/**
 * أنواع بيانات الأطراف التجارية
 */

export interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  opening_balance: number;
  balance_type?: 'credit' | 'debit';
  balance: number;
  created_at: string;
  notes?: string;
  code?: string;
}

export interface Transaction {
  id: string;
  party_id: string;
  transaction_date: string;
  type: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
  created_at: string;
  transaction_type?: string;
  transaction_id?: string;
}

export interface LedgerEntry {
  id: string;
  party_id: string;
  transaction_id: string;
  transaction_type: string;
  date: string;
  debit: number;
  credit: number;
  balance_after: number;
  created_at: string;
  notes?: string;
  description?: string;
}

