import InventoryService from './InventoryService';

class ProductionService {
  private static instance: ProductionService;
  
  private constructor() {}
  
  public static getInstance(): ProductionService {
    if (!ProductionService.instance) {
      ProductionService.instance = new ProductionService();
    }
    return ProductionService.instance;
  }

  async getProductionOrders() {
    // Implementation
    return [];
  }

  async createProductionOrder(orderData: any) {
    // Implementation
    return true;
  }

  async getRecipeForSemiFinished(semiFinishedId: number) {
    // Implement this method
    return [];
  }

  async startProductionOrder(id: string) {
    // Implement this method
    return true;
  }

  async completeProductionOrder(id: string) {
    // Implement this method
    return true;
  }

  async cancelProductionOrder(id: string) {
    // Implement this method
    return true;
  }

  // Fix other methods where InventoryService is used
  someMethod() {
    const inventoryService = InventoryService;
    // Implementation
  }

  anotherMethod() {
    const inventoryService = InventoryService;
    // Implementation
  }
}

// Define the ProductionOrder interface
export interface ProductionOrder {
  id: string;
  date: string;
  semi_finished_id: number;
  semi_finished_name: string; // Add missing property
  quantity: number;
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
  notes?: string; // Add missing property
  created_at: string;
  materials: Array<{
    id: string;
    production_order_id: string;
    raw_material_id: number;
    raw_material_name: string;
    quantity: number;
    created_at: string;
  }>;
}

export interface PackagingOrder {
  id: number;
  code: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
  date: string;
  totalCost: number;
  semiFinished: {
    code: string;
    name: string;
    quantity: number;
    available: boolean;
  };
  packagingMaterials: Array<{
    code: string;
    name: string;
    quantity: number;
    available: boolean;
  }>;
}

export default ProductionService.getInstance();
