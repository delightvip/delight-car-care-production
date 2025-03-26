
export interface InventoryItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  quantity: number;
  min_stock?: number;
  unit: string;
  unit_cost?: number;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  item_type: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  balance_after: number;
  reason?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  users?: {
    name?: string;
  };
}
