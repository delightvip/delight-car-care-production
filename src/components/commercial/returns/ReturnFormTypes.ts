
import { z } from 'zod';

export const returnFormSchema = z.object({
  return_type: z.enum(['sales_return', 'purchase_return']),
  invoice_id: z.string().optional(),
  party_id: z.string().optional(),
  date: z.date(),
  amount: z.number().min(0, 'يجب أن يكون المبلغ أكبر من صفر'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      item_id: z.number(),
      item_type: z.enum(['raw_materials', 'packaging_materials', 'semi_finished_products', 'finished_products']),
      item_name: z.string(),
      quantity: z.number().min(0.1, 'يجب أن تكون الكمية أكبر من صفر'),
      unit_price: z.number().min(0, 'يجب أن يكون السعر أكبر من أو يساوي صفر'),
      selected: z.boolean().optional(),
      max_quantity: z.number().optional(),
      invoice_quantity: z.number().optional()
    })
  ).refine(items => items.some(item => item.selected === true && item.quantity > 0), {
    message: "يجب اختيار صنف واحد على الأقل وتحديد كمية له",
    path: ["items"]
  })
});

export type ReturnFormValues = z.infer<typeof returnFormSchema>;
