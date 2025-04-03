
export interface Invoice {
  id: string;
  invoice_type: 'sale' | 'purchase';
  party_id: string;
  party_name?: string;
  date: string;
  total_amount: number;
  items: InvoiceItem[];
  status: 'paid' | 'partial' | 'unpaid';
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  notes?: string;
  created_at?: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_id: number;
  item_type: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
  item_name: string;
  quantity: number;
  unit_price: number;
  total?: number;
  created_at?: string;
}

export interface Payment {
  id: string;
  party_id: string;
  party_name?: string;
  date: string;
  amount: number;
  payment_type: 'collection' | 'disbursement';
  method: 'cash' | 'check' | 'bank_transfer' | 'bank' | 'credit' | 'other';
  related_invoice_id?: string;
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  notes?: string;
  created_at?: string;
}

export interface Return {
  id: string;
  invoice_id?: string;
  party_id?: string;
  party_name?: string;
  date: string;
  return_type: 'sales_return' | 'purchase_return';
  amount: number;
  items?: ReturnItem[];
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  notes?: string;
  created_at?: string;
}

export interface ReturnItem {
  id?: string;
  return_id?: string;
  item_id: number;
  item_type: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
  item_name: string;
  quantity: number;
  unit_price: number;
  total?: number;
  created_at?: string;
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
  created_at?: string;
  notes?: string;
}
