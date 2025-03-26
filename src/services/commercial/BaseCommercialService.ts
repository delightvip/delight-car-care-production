import InventoryService from '@/services/InventoryService';

class BaseCommercialService {
  protected inventoryService;
  
  constructor() {
    this.inventoryService = InventoryService;
  }
}

export default BaseCommercialService;
