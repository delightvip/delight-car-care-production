
export interface InventoryMovement {
  id: string;
  item_id: string;
  item_type: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  balance_after: number;
  reason?: string;
  created_at: string;
  updated_at?: string; // جعل الخاصية اختيارية
  user_id?: string;
  user_name?: string; // إضافة خاصية اسم المستخدم
}
