
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
  user_name?: string;
  
  // Adding missing properties for chart components
  type?: 'in' | 'out' | 'adjustment';
  date?: Date;
  item_name?: string;
  category?: string;
  note?: string;
}
