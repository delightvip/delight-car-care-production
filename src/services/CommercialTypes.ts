
// أنواع البيانات للوظائف التجارية

export interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'other';
  email?: string;
  phone?: string;
  address?: string;
  opening_balance: number;
  balance_type: 'debit' | 'credit';
  created_at: string;
}

export interface Invoice {
  id: string;
  party_id: string;
  party_name?: string;
  date: string;
  invoice_type: 'sale' | 'purchase';
  status: 'draft' | 'pending' | 'paid' | 'partially_paid' | 'cancelled' | 'overdue';
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  total_amount: number;
  notes?: string;
  created_at: string;
  items: InvoiceItem[]; 
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_id: number;
  item_name: string;
  item_type: 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products';
  quantity: number;
  unit_price: number;
  total: number;
  cost_price?: number;
  created_at: string;
}

export interface Payment {
  id: string;
  party_id: string;
  party_name?: string;
  date: string;
  amount: number;
  payment_type: 'collection' | 'disbursement';
  method: 'cash' | 'check' | 'bank_transfer' | 'other';
  related_invoice_id?: string;
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface Return {
  id: string;
  party_id: string;
  party_name?: string;
  date: string;
  invoice_id?: string;
  return_type: 'sales_return' | 'purchase_return';
  amount: number;
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  notes?: string;
  created_at: string;
  items: ReturnItem[]; 
}

export interface ReturnItem {
  id: string;
  return_id: string;
  item_id: number;
  item_name: string;
  item_type: 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products';
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  party_id: string;
  party_name?: string;
  transaction_id: string;
  transaction_type: string;
  date: string;
  debit: number;
  credit: number;
  balance_after: number;
  created_at: string;
  notes: string;
}
