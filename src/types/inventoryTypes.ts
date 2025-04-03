export interface RawMaterial {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  importance?: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface PackagingMaterial {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  importance?: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface SemiFinishedProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  created_at: string | null;
  updated_at: string | null;
  ingredients: {
    id: number;
    code: string;
    name: string;
    percentage: number;
  }[];
}

export interface FinishedProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  semi_finished_id: number;
  semi_finished_quantity: number;
  created_at: string | null;
  updated_at: string | null;
  // Add these properties to match expected usage
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
}

// Add the sales_price field to the relevant interfaces
export interface RawMaterialWithSalesPrice extends RawMaterial {
  sales_price?: number;
}

export interface PackagingMaterialWithSalesPrice extends PackagingMaterial {
  sales_price?: number;
}

export interface SemiFinishedProductWithSalesPrice extends SemiFinishedProduct {
  sales_price?: number;
}

export interface FinishedProductWithSalesPrice extends FinishedProduct {
  sales_price?: number;
}
