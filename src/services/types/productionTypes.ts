
// Define types for production entities

export interface ProductionOrder {
  id: number;
  code: string;
  product_code: string;
  product_name: string;
  date: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
  total_cost: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductionOrderIngredient {
  id: number;
  production_order_id: number;
  raw_material_code: string;
  raw_material_name: string;
  required_quantity: number;
  created_at?: string;
}

export interface PackagingOrder {
  id: number;
  code: string;
  product_code: string;
  product_name: string;
  semi_finished_code: string;
  semi_finished_name: string;
  date: string;
  quantity: number;
  semi_finished_quantity: number;
  unit: string;
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
  total_cost: number;
  created_at?: string;
  updated_at?: string;
}

export interface PackagingOrderMaterial {
  id: number;
  packaging_order_id: number;
  packaging_material_code: string;
  packaging_material_name: string;
  required_quantity: number;
  created_at?: string;
}

export interface ProductionMovement {
  id?: string;
  product_code: string;
  quantity: number;
  movement_type: string;
  created_at?: string;
}
