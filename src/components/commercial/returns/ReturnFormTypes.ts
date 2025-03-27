
export interface ReturnFormValues {
  return_type: 'sales_return' | 'purchase_return';
  invoice_id?: string;
  party_id?: string;
  date: Date;
  amount: number;
  notes?: string;
  items: Array<{
    item_id: number;
    item_type: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
    item_name: string;
    quantity: number;
    unit_price: number;
    selected?: boolean;
    max_quantity?: number;
    invoice_quantity?: number;
  }>;
}
