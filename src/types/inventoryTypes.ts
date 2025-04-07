
export interface InventoryMovement {
  id: string;
  item_id: string;
  item_type: string;
  movement_type: 'in' | 'out' | 'adjustment' | string; // Allow string to avoid type compatibility issues
  quantity: number;
  balance_after: number;
  reason?: string;
  created_at: string;
  updated_at?: string; 
  user_id?: string;
  user_name?: string; // اسم المستخدم الذي قام بالحركة
}

// Semi-finished product ingredient types
export interface BaseIngredient {
  id: number;
  code: string;
  name: string;
  percentage: number;
  unit?: string;
  unit_cost?: number;
}

export interface RawMaterialIngredient extends BaseIngredient {
  ingredient_type: 'raw';
}

export interface SemiFinishedIngredient extends BaseIngredient {
  ingredient_type: 'semi';
}

export interface WaterIngredient extends BaseIngredient {
  ingredient_type: 'water';
  is_auto_calculated?: boolean;
}

export type Ingredient = RawMaterialIngredient | SemiFinishedIngredient | WaterIngredient;

// Type for semi-finished product form
export interface SemiFinishedProductFormData {
  name: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  sales_price: number;
  min_stock: number;
  ingredients: Ingredient[];
}
