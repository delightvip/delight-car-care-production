
export interface Payment {
  id: string;
  party_id: string;  // Making this required to match with other definitions
  party_name?: string;
  date: string;
  amount: number;
  payment_type: 'collection' | 'disbursement';
  method: 'cash' | 'check' | 'bank_transfer' | 'other';
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  related_invoice_id?: string;
  notes?: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  party_id: string;
  party_name?: string;
  transaction_id?: string;
  transaction_type: string;
  date: string;
  debit: number;
  credit: number;
  balance_after: number;
  created_at: string;
  notes?: string;
}

// Add Invoice interface that was missing in this file but referenced in CommercialFinancialLinkage.tsx
export interface Invoice {
  id: string;
  invoice_type: 'sale' | 'purchase';
  party_id: string;
  party_name?: string;
  date: string;
  total_amount: number;
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  status: 'paid' | 'partial' | 'unpaid';
  notes?: string;
  created_at?: string;
}
