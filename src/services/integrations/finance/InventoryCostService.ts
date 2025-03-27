
import InventoryService from '@/services/InventoryService';

/**
 * خدمة حساب تكاليف المخزون
 * توفر وظائف لحساب تكلفة العناصر في المخزون
 */
export class InventoryCostService {
  private static instance: InventoryCostService;
  private inventoryService: InventoryService;

  private constructor() {
    this.inventoryService = InventoryService.getInstance();
  }

  public static getInstance(): InventoryCostService {
    if (!InventoryCostService.instance) {
      InventoryCostService.instance = new InventoryCostService();
    }
    return InventoryCostService.instance;
  }

  /**
   * الحصول على سعر التكلفة لعنصر من المخزون
   * @param itemType نوع العنصر
   * @param itemId معرف العنصر
   * @returns سعر التكلفة للوحدة
   */
  public async getItemCostPrice(
    itemType: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
    itemId: number
  ): Promise<number> {
    try {
      let item;
      
      // استخدام الطريقة المناسبة وفقاً لنوع العنصر
      switch (itemType) {
        case "raw_materials":
          try {
            const rawMaterials = await this.inventoryService.getRawMaterials();
            if (!rawMaterials) return 0;
            item = rawMaterials.find(m => m.id === itemId);
          } catch (error) {
            console.error('Error fetching raw materials:', error);
            return 0;
          }
          break;
          
        case "packaging_materials":
          try {
            const packagingMaterials = await this.inventoryService.getPackagingMaterials();
            if (!packagingMaterials) return 0;
            item = packagingMaterials.find(m => m.id === itemId);
          } catch (error) {
            console.error('Error fetching packaging materials:', error);
            return 0;
          }
          break;
          
        case "semi_finished_products":
          try {
            const semiFinishedProducts = await this.inventoryService.getSemiFinishedProducts();
            if (!semiFinishedProducts) return 0;
            item = semiFinishedProducts.find(p => p.id === itemId);
          } catch (error) {
            console.error('Error fetching semi-finished products:', error);
            return 0;
          }
          break;
          
        case "finished_products":
          try {
            const finishedProducts = await this.inventoryService.getFinishedProducts();
            if (!finishedProducts) return 0;
            item = finishedProducts.find(p => p.id === itemId);
          } catch (error) {
            console.error('Error fetching finished products:', error);
            return 0;
          }
          break;
          
        default:
          return 0;
      }
      
      return item?.unit_cost || 0;
    } catch (error) {
      console.error(`Error in getItemCostPrice for ${itemType} ${itemId}:`, error);
      return 0;
    }
  }
}

export default InventoryCostService;
