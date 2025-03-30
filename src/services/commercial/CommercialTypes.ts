
export interface Payment {
  id: string;
  party_id?: string;
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
