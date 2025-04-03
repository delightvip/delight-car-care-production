
// Type definitions for commercial operations

export interface Invoice {
  id: string;
  party_id: string;
  party_name?: string;
  invoice_type: 'sale' | 'purchase';
  date: string;
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  status: 'unpaid' | 'partial' | 'paid';
  total_amount: number;
  notes?: string;
  created_at?: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_id: number;
  item_name: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

export interface Payment {
  id: string;
  party_id: string;
  party_name?: string;
  payment_type: 'collection' | 'payment' | 'disbursement';
  date: string;
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  method: 'cash' | 'bank' | 'other' | 'check' | 'bank_transfer';
  amount: number;
  notes?: string;
  related_invoice_id?: string;
  created_at?: string;
}

export interface Return {
  id: string;
  party_id: string;
  party_name?: string;
  return_type: 'sale' | 'purchase' | 'sales_return' | 'purchase_return';
  date: string;
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  amount: number;
  notes?: string;
  invoice_id?: string;
  created_at?: string;
  items: ReturnItem[];
}

export interface ReturnItem {
  id?: string;
  return_id?: string;
  item_id: number;
  item_name: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

export interface CommercialSummary {
  totalSales: number;
  totalPurchases: number;
  totalReturns: number;
  topCustomers: {
    id: string;
    name: string;
    total: number;
  }[];
  topProducts: {
    id: number;
    name: string;
    quantity: number;
    total: number;
  }[];
  recentInvoices: Invoice[];
}

export interface ProductionOrderIngredient {
  id: number;
  production_order_id: number;
  raw_material_code: string;
  raw_material_name: string;
  required_quantity: number;
  code?: string;
  name?: string;
  requiredQuantity?: number;
  available?: number;
}

export interface PackagingOrderMaterial {
  id: number;
  packaging_order_id: number;
  packaging_material_code: string;
  packaging_material_name: string;
  required_quantity: number;
  code?: string;
  name?: string;
  requiredQuantity?: number;
  available?: number;
}
