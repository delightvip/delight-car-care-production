
import InventoryService from "@/services/InventoryService";
import { InvoiceItem } from "@/services/CommercialTypes";
import { ErrorHandler } from "@/utils/errorHandler";

/**
 * واجهة نتيجة حساب الأرباح
 */
export interface ProfitCalculationResult {
  totalCost: number;
  totalPrice: number;
  profit: number;
  profitMargin: number;
  items: Array<{
    item_id: number;
    item_name: string;
    quantity: number;
    cost_price: number;
    unit_price: number;
    total_cost: number;
    total_price: number;
    item_profit: number;
    item_profit_margin: number;
  }>;
}

/**
 * حاسبة أرباح الفواتير
 * مسؤولة عن حساب الأرباح على مستوى الفاتورة والعناصر
 */
export class InvoiceProfitCalculator {
  private inventoryService: InventoryService;

  constructor() {
    this.inventoryService = InventoryService.getInstance();
  }

  /**
   * حساب أرباح فاتورة المبيعات
   * @param invoiceItems عناصر الفاتورة
   * @returns نتيجة حساب الأرباح
   */
  public async calculateProfit(invoiceItems: InvoiceItem[]): Promise<ProfitCalculationResult> {
    return ErrorHandler.wrapOperation(
      async () => {
        let totalCost = 0;
        let totalPrice = 0;
        const itemsWithProfit = [];

        for (const item of invoiceItems) {
          const costPrice = await this.getItemCostPrice(
            item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
            item.item_id
          );
          
          const itemTotalCost = costPrice * item.quantity;
          const itemTotalPrice = item.unit_price * item.quantity;
          const itemProfit = itemTotalPrice - itemTotalCost;
          const itemProfitMargin = itemTotalPrice > 0 ? (itemProfit / itemTotalPrice) * 100 : 0;
          
          totalCost += itemTotalCost;
          totalPrice += itemTotalPrice;
          
          itemsWithProfit.push({
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            cost_price: costPrice,
            unit_price: item.unit_price,
            total_cost: itemTotalCost,
            total_price: itemTotalPrice,
            item_profit: itemProfit,
            item_profit_margin: itemProfitMargin
          });
        }

        const profit = totalPrice - totalCost;
        const profitMargin = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;

        return {
          totalCost,
          totalPrice,
          profit,
          profitMargin,
          items: itemsWithProfit
        };
      },
      "calculateProfit",
      "حدث خطأ أثناء حساب أرباح الفاتورة",
      {
        totalCost: 0,
        totalPrice: 0,
        profit: 0,
        profitMargin: 0,
        items: []
      }
    ) as Promise<ProfitCalculationResult>;
  }

  /**
   * الحصول على سعر التكلفة لعنصر من المخزون
   * @param itemType نوع العنصر
   * @param itemId معرف العنصر
   * @returns سعر التكلفة للوحدة
   */
  private async getItemCostPrice(
    itemType: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
    itemId: number
  ): Promise<number> {
    try {
      let item;
      switch (itemType) {
        case "raw_materials":
          // Get all raw materials and find the one with matching ID
          const rawMaterials = await this.inventoryService.getRawMaterials();
          item = rawMaterials.find(m => m.id === itemId);
          return item?.unit_cost || 0;
        case "packaging_materials":
          // Get all packaging materials and find the one with matching ID
          const packagingMaterials = await this.inventoryService.getPackagingMaterials();
          item = packagingMaterials.find(m => m.id === itemId);
          return item?.unit_cost || 0;
        case "semi_finished_products":
          // Get all semi-finished products and find the one with matching ID
          const semiFinishedProducts = await this.inventoryService.getSemiFinishedProducts();
          item = semiFinishedProducts.find(p => p.id === itemId);
          return item?.unit_cost || 0;
        case "finished_products":
          // Get all finished products and find the one with matching ID
          const finishedProducts = await this.inventoryService.getFinishedProducts();
          item = finishedProducts.find(p => p.id === itemId);
          return item?.unit_cost || 0;
        default:
          return 0;
      }
    } catch (error) {
      console.error(`Error getting cost price for ${itemType} ${itemId}:`, error);
      return 0;
    }
  }
}
