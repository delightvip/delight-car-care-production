
export interface Party {
  id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  address?: string;
  balance_type?: string;
  opening_balance?: number;
  created_at?: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_id: number;
  item_name: string;
  item_type: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
  quantity: number;
  unit_price: number;
  total?: number;
  created_at?: string;
}

export interface Invoice {
  id: string;
  invoice_type: "sale" | "purchase";
  party_id?: string;
  party_name?: string;
  date: string;
  status: string;
  payment_status: "draft" | "confirmed" | "cancelled";
  total_amount: number;
  notes?: string;
  created_at?: string;
  items?: InvoiceItem[];
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
  selected?: boolean;
  max_quantity?: number;
  invoice_quantity?: number;
}

export interface Return {
  id: string;
  return_type: "sales_return" | "purchase_return";
  invoice_id?: string;
  party_id?: string;
  party_name?: string;
  date: string;
  amount: number;
  payment_status: "draft" | "confirmed" | "cancelled";
  notes?: string;
  created_at?: string;
  items?: ReturnItem[];
}

export interface Payment {
  id: string;
  payment_type: "collection" | "disbursement";
  party_id?: string;
  party_name?: string;
  amount: number;
  date: string;
  method: string;
  payment_status: "draft" | "confirmed" | "cancelled";
  related_invoice_id?: string;
  notes?: string;
  created_at?: string;
}

export interface LedgerEntry {
  id: string;
  party_id?: string;
  transaction_id?: string;
  transaction_type: string;
  date: string;
  debit?: number;
  credit?: number;
  balance_after: number;
  created_at?: string;
}
