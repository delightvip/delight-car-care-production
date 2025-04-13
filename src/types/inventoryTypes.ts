
export interface InventoryMovement {
  id: string;
  item_id: string;
  item_type: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  balance_after: number;
  reason?: string;
  created_at: string;
  updated_at?: string; 
  user_id?: string;
  user_name?: string; // اسم المستخدم الذي قام بالحركة
  date: Date | string; // Adding date as a required property
  category?: string;
  type?: 'in' | 'out';
  note?: string;
  item_name?: string;
}
