
/**
 * أنواع بيانات معاملات الأطراف التجارية
 */

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
  notes: string;  // Making notes non-optional to match usage
  description?: string;
}

export interface TransactionDescriptions {
  [key: string]: string;
}
