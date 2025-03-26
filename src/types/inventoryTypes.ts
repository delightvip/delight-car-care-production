
export interface InventoryItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  min_stock: number;
  unit_cost?: number;
  updated_at?: string;
  created_at?: string;
}

export interface RawMaterial extends InventoryItem {
  importance?: number;
}

export interface PackagingMaterial extends InventoryItem {
  importance?: number;
}

export interface SemiFinishedProduct extends InventoryItem {
  // Additional properties specific to semi-finished products
}

export interface FinishedProduct extends InventoryItem {
  semi_finished_id?: number;
  semi_finished_quantity?: number;
}
