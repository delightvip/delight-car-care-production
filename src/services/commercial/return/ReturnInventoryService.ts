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
      // أولاً، يجب الحصول على كمية المخزون الحالية
      let currentQuantity = 0;
      
      // جلب كمية المخزون الحالية حسب نوع العنصر
      switch (itemType) {
        case 'raw_materials': {
          const items = await this.inventoryService.getRawMaterials();
          const item = items.find(item => item.id === itemId);
          if (item) currentQuantity = item.quantity;
          break;
        }
        case 'packaging_materials': {
          const items = await this.inventoryService.getPackagingMaterials();
          const item = items.find(item => item.id === itemId);
          if (item) currentQuantity = item.quantity;
          break;
        }
        case 'semi_finished_products': {
          const items = await this.inventoryService.getSemiFinishedProducts();
          const item = items.find(item => item.id === itemId);
          if (item) currentQuantity = item.quantity;
          break;
        }
        case 'finished_products': {
          const items = await this.inventoryService.getFinishedProducts();
          const item = items.find(item => item.id === itemId);
          if (item) currentQuantity = item.quantity;
          break;
        }
        default:
          return false;
      }
      
      // حساب الكمية الجديدة = الكمية الحالية + كمية المرتجع
      const newQuantity = currentQuantity + Number(quantity);
      console.log(`Increasing inventory for ${itemType} ID ${itemId}: ${currentQuantity} + ${quantity} = ${newQuantity}`);
      
      // تحديث المخزون بالكمية الجديدة
      switch (itemType) {
        case 'raw_materials':
          await this.inventoryService.updateRawMaterial(itemId, { quantity: newQuantity });
          break;
        case 'packaging_materials':
          await this.inventoryService.updatePackagingMaterial(itemId, { quantity: newQuantity });
          break;
        case 'semi_finished_products':
          await this.inventoryService.updateSemiFinishedProduct(itemId, { quantity: newQuantity });
          break;
        case 'finished_products':
          await this.inventoryService.updateFinishedProduct(itemId, { quantity: newQuantity });
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
      // أولاً، يجب الحصول على كمية المخزون الحالية
      let currentQuantity = 0;
      
      // جلب كمية المخزون الحالية حسب نوع العنصر
      switch (itemType) {
        case 'raw_materials': {
          const items = await this.inventoryService.getRawMaterials();
          const item = items.find(item => item.id === itemId);
          if (item) currentQuantity = item.quantity;
          break;
        }
        case 'packaging_materials': {
          const items = await this.inventoryService.getPackagingMaterials();
          const item = items.find(item => item.id === itemId);
          if (item) currentQuantity = item.quantity;
          break;
        }
        case 'semi_finished_products': {
          const items = await this.inventoryService.getSemiFinishedProducts();
          const item = items.find(item => item.id === itemId);
          if (item) currentQuantity = item.quantity;
          break;
        }
        case 'finished_products': {
          const items = await this.inventoryService.getFinishedProducts();
          const item = items.find(item => item.id === itemId);
          if (item) currentQuantity = item.quantity;
          break;
        }
        default:
          return false;
      }
      
      // حساب الكمية الجديدة = الكمية الحالية - كمية المرتجع
      const newQuantity = Math.max(0, currentQuantity - Number(quantity)); // لمنع القيم السالبة
      console.log(`Decreasing inventory for ${itemType} ID ${itemId}: ${currentQuantity} - ${quantity} = ${newQuantity}`);
      
      // تحديث المخزون بالكمية الجديدة
      switch (itemType) {
        case 'raw_materials':
          await this.inventoryService.updateRawMaterial(itemId, { quantity: newQuantity });
          break;
        case 'packaging_materials':
          await this.inventoryService.updatePackagingMaterial(itemId, { quantity: newQuantity });
          break;
        case 'semi_finished_products':
          await this.inventoryService.updateSemiFinishedProduct(itemId, { quantity: newQuantity });
          break;
        case 'finished_products':
          await this.inventoryService.updateFinishedProduct(itemId, { quantity: newQuantity });
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
