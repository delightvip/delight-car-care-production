
// Define types for commercial entities

export interface Invoice {
  id: string;
  invoice_type: "sale" | "purchase";
  party_id: string;
  party_name?: string;
  date: string;
  total_amount: number;
  status: "paid" | "partial" | "unpaid";
  payment_status: "draft" | "confirmed" | "cancelled";
  notes?: string;
  created_at: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_id: number;
  item_type: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at?: string;
}
