
// تعريف أنواع البيانات المستخدمة في نظام المخزون

export interface InventoryMovement {
  id: string;
  item_id: string;
  item_type: string;
  quantity: number;
  balance_after: number;
  movement_type: 'in' | 'out' | 'adjustment';
  reason?: string;
  created_at: string;
  updated_at?: string;
  user_id?: string;
}

export interface InventoryItem {
  id: number | string;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  created_at?: string;
  updated_at?: string;
}

export interface RawMaterial extends InventoryItem {
  importance?: number;
  supplier_id?: string;
  supplier_name?: string;
}

export interface PackagingMaterial extends InventoryItem {
  importance?: number;
  supplier_id?: string;
  supplier_name?: string;
}

export interface SemiFinishedProduct extends InventoryItem {
  ingredients?: {
    id: number;
    raw_material_id: number;
    percentage: number;
    raw_material?: {
      id: number;
      code: string;
      name: string;
    };
  }[];
}

export interface FinishedProductPackaging {
  id?: number;
  packaging_material_id: number;
  quantity: number;
  packaging_material?: {
    id: number;
    code: string;
    name: string;
    unit_cost: number;
  };
}

export interface FinishedProduct extends InventoryItem {
  semi_finished_id: number;
  semi_finished_quantity: number;
  semi_finished?: {
    id: number;
    code: string;
    name: string;
    unit_cost: number;
  };
  packaging?: FinishedProductPackaging[];
  sales_price?: number;
}

export interface InventoryStats {
  values: {
    rawMaterials: number;
    semiFinished: number;
    packaging: number;
    finished: number;
    total: number;
  };
  counts: {
    rawMaterials: number;
    semiFinished: number;
    packaging: number;
    finished: number;
    total: number;
  };
}
