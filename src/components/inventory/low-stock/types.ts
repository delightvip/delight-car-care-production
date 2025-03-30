
export interface InventoryItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
  min_stock: number;
  unit: string;
  unit_cost?: number;
  importance?: number;
}

export interface InventoryLowStockTableProps {
  data: InventoryItem[];
  isLoading: boolean;
  sortOrder: 'asc' | 'desc';
  type: 'raw' | 'semi' | 'packaging' | 'finished';
}
