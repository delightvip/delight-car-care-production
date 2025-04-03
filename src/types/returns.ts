
import { z } from "zod";

export interface Return {
  id: string;
  party_id: string;
  party_name?: string;
  return_type: 'sales_return' | 'purchase_return';
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
  selected?: boolean;
  max_quantity?: number;
}

export interface ReturnFormValues {
  return_type: 'sales_return' | 'purchase_return';
  invoice_id?: string;
  party_id: string;
  date: Date;
  notes?: string;
  amount?: number;
  items: ReturnFormItem[];
}

export interface ReturnFormItem extends ReturnItem {
  selected: boolean;
  max_quantity: number;
}

export const returnFormSchema = z.object({
  return_type: z.enum(['sales_return', 'purchase_return']),
  invoice_id: z.string().optional(),
  party_id: z.string(),
  date: z.date(),
  notes: z.string().optional(),
  amount: z.number().optional(),
  items: z.array(
    z.object({
      item_id: z.number(),
      item_name: z.string(),
      item_type: z.string(),
      quantity: z.number(),
      unit_price: z.number(),
      selected: z.boolean(),
      max_quantity: z.number(),
      total: z.number().optional()
    })
  )
});
