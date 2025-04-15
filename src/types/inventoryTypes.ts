
export interface InventoryMovement {
  id: string;
  item_id: string;
  item_type: string;
  movement_type: "in" | "out" | "adjustment" | string; // Adding string to support any values from database
  quantity: number;
  balance_after: number;
  reason?: string;
  created_at: string;
  updated_at?: string;
  user_id?: string;
  user_name?: string;
}
