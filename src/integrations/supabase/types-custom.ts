
// Custom Supabase types to extend the generated types
export interface CashOperation {
  id: string;
  date: string;
  amount: number;
  operation_type: 'deposit' | 'withdraw' | 'transfer';
  account_type: 'cash' | 'bank' | null;
  from_account: 'cash' | 'bank' | null;
  to_account: 'cash' | 'bank' | null;
  notes: string | null;
  reference: string | null;
  created_at: string | null;
}

// This file can be expanded to include other custom types as needed
