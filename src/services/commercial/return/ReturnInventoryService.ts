
import InventoryService from "@/services/InventoryService";

/**
 * خدمة التعامل مع المخزون للمرتجعات
 */
export class ReturnInventoryService {
  private inventoryService: InventoryService;

  constructor() {
    this.inventoryService = InventoryService.getInstance();
  }

  /**
   * زيادة كمية صنف في المخزون
   */
  public async increaseItemQuantity(
    itemType: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
    itemId: number,
    quantity: number
  ): Promise<boolean> {
    try {
      switch (itemType) {
        case 'raw_materials':
          await this.inventoryService.updateRawMaterial(itemId, { quantity: Number(quantity) });
          break;
        case 'packaging_materials':
          await this.inventoryService.updatePackagingMaterial(itemId, { quantity: Number(quantity) });
          break;
        case 'semi_finished_products':
          await this.inventoryService.updateSemiFinishedProduct(itemId, { quantity: Number(quantity) });
          break;
        case 'finished_products':
          await this.inventoryService.updateFinishedProduct(itemId, { quantity: Number(quantity) });
          break;
        default:
          return false;
      }
      return true;
    } catch (error) {
      console.error(`Error increasing item quantity:`, error);
      return false;
    }
  }

  /**
   * تقليل كمية صنف من المخزون
   */
  public async decreaseItemQuantity(
    itemType: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
    itemId: number,
    quantity: number
  ): Promise<boolean> {
    try {
      switch (itemType) {
        case 'raw_materials':
          await this.inventoryService.updateRawMaterial(itemId, { quantity: -Number(quantity) });
          break;
        case 'packaging_materials':
          await this.inventoryService.updatePackagingMaterial(itemId, { quantity: -Number(quantity) });
          break;
        case 'semi_finished_products':
          await this.inventoryService.updateSemiFinishedProduct(itemId, { quantity: -Number(quantity) });
          break;
        case 'finished_products':
          await this.inventoryService.updateFinishedProduct(itemId, { quantity: -Number(quantity) });
          break;
        default:
          return false;
      }
      return true;
    } catch (error) {
      console.error(`Error decreasing item quantity:`, error);
      return false;
    }
  }
}

export default new ReturnInventoryService();
