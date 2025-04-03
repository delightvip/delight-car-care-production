
export interface ProductionOrderIngredient {
  id: number;
  production_order_id: number;
  raw_material_code: string;
  raw_material_name: string;
  required_quantity: number;
  available?: boolean;
  code?: string;
  name?: string;
  requiredQuantity?: number;
}

export interface ProductionOrder {
  id: number;
  code: string;
  product_code: string;
  product_name: string;
  date: string;
  quantity: number;
  unit: string;
  status: "pending" | "inProgress" | "completed" | "cancelled";
  total_cost: number;
  created_at: string;
  updated_at: string;
  ingredients: ProductionOrderIngredient[];
  productCode?: string;
  productName?: string;
  totalCost?: number;
}

export interface PackagingOrderMaterial {
  id: number;
  packaging_order_id: number;
  packaging_material_code: string;
  packaging_material_name: string;
  required_quantity: number;
}

export interface PackagingSemiFinished {
  code: string;
  name: string;
  quantity: number;
  available: boolean;
}

export interface PackagingOrder {
  id: number;
  code: string;
  product_code: string;
  product_name: string;
  date: string;
  quantity: number;
  unit: string;
  status: "pending" | "inProgress" | "completed" | "cancelled";
  total_cost: number;
  created_at: string;
  updated_at: string;
  semi_finished_code: string;
  semi_finished_name: string;
  semi_finished_quantity: number;
  packagingMaterials: PackagingOrderMaterial[];
  semiFinished: PackagingSemiFinished;
  productCode?: string;
  productName?: string;
  totalCost?: number;
}

export interface ProductionMovement {
  type: string;
  item_id: string;
  item_type: string;
  quantity: number;
  production_order_id: string;
  date: string;
}
