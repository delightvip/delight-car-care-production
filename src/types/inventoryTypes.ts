
// Define inventory-related types for the application

export interface RawMaterial {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  sales_price?: number;
  importance: number;
  created_at?: string;
  updated_at?: string;
}

export interface PackagingMaterial {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  sales_price?: number;
  importance: number;
  created_at?: string;
  updated_at?: string;
}

export interface SemiFinishedProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  sales_price?: number;
  ingredients: {
    id: number;
    code: string;
    name: string;
    percentage: number;
  }[];
  created_at?: string;
  updated_at?: string;
}

export interface FinishedProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  sales_price?: number;
  semi_finished_id: number;
  semi_finished_quantity: number;
  semiFinished: {
    code: string;
    name: string;
    quantity: number;
  };
  packaging: {
    code: string;
    name: string;
    quantity: number;
  }[];
  created_at?: string;
  updated_at?: string;
}

export interface InventoryMovement {
  id: string;
  movement_type: 'add' | 'subtract';
  item_type: string;
  item_id: string;
  quantity: number;
  balance_after: number;
  reason?: string;
  user_id?: string;
  created_at: string;
  updated_at?: string;
}

// Export from InventoryService.ts for use in components
export type { RawMaterial, PackagingMaterial, SemiFinishedProduct, FinishedProduct, InventoryMovement };
