
import { z } from 'zod';

// Schema for returns form validation
export const returnFormSchema = z.object({
  return_type: z.enum(['sales_return', 'purchase_return']),
  invoice_id: z.string().optional(),
  party_id: z.string().optional(), // Added party_id field
  date: z.date(),
  notes: z.string().optional(),
  amount: z.number().optional(), // Added amount field
  items: z.array(
    z.object({
      item_id: z.number(),
      item_type: z.enum(['raw_materials', 'packaging_materials', 'semi_finished_products', 'finished_products']),
      item_name: z.string(),
      quantity: z.number().min(0.01, 'يجب أن تكون الكمية أكبر من صفر'),
      unit_price: z.number().min(0, 'يجب أن يكون السعر أكبر من أو يساوي صفر'),
      total: z.number().optional(),
      selected: z.boolean(),
      max_quantity: z.number(),
      invoice_quantity: z.number().optional()
    })
  ).refine(items => items.some(item => item.selected === true && item.quantity > 0), {
    message: "يجب اختيار صنف واحد على الأقل وتحديد كمية له",
    path: ["items"]
  })
});

export type ReturnFormValues = z.infer<typeof returnFormSchema>;

// Return item interface
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

// Return interface
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
