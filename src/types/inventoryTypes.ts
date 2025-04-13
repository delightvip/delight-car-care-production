
export type ItemType = 'raw' | 'packaging' | 'semi' | 'finished';

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
  
  // Adding properties for UI components
  type?: 'in' | 'out' | 'adjustment';
  date?: Date;
  item_name?: string;
  category?: string;
  note?: string;
}

// Interface for manual movement input
export interface ManualMovementInput {
  type: 'in' | 'out';
  category: string;
  item_id: number;
  item_name: string;
  quantity: number;
  unit: string;
  note?: string;
  date: Date;
}
