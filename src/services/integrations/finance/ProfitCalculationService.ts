
import InventoryCostService from './InventoryCostService';
import { ErrorHandler } from '@/utils/errorHandler';

/**
 * خدمة حساب الأرباح
 * توفر وظائف لحساب الأرباح من المبيعات والفواتير
 */
export class ProfitCalculationService {
  private static instance: ProfitCalculationService;
  private inventoryCostService: InventoryCostService;

  private constructor() {
    this.inventoryCostService = InventoryCostService.getInstance();
  }

  public static getInstance(): ProfitCalculationService {
    if (!ProfitCalculationService.instance) {
      ProfitCalculationService.instance = new ProfitCalculationService();
    }
    return ProfitCalculationService.instance;
  }

  /**
   * حساب الأرباح من فاتورة مبيعات
   * @param invoiceId معرف الفاتورة
   * @param itemsData بيانات عناصر الفاتورة
   */
  public async calculateInvoiceProfit(
    invoiceId: string,
    itemsData: Array<{
      item_id: number;
      item_type: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
      quantity: number;
      unit_price: number;
      cost_price?: number;
    }>
  ): Promise<{ totalCost: number; totalPrice: number; profit: number; profitMargin: number; }> {
    return ErrorHandler.wrapOperation(
      async () => {
        let totalCost = 0;
        let totalPrice = 0;

        for (const item of itemsData) {
          // استخدام cost_price إذا كان مُحدد، وإلا نحصل عليه من المخزون
          let costPrice = item.cost_price || 0;
          
          if (!costPrice) {
            try {
              costPrice = await this.inventoryCostService.getItemCostPrice(item.item_type, item.item_id);
            } catch (error) {
              console.error(`Error getting cost price for item ${item.item_id}:`, error);
              // استمر في العملية حتى مع وجود خطأ في سعر التكلفة
            }
          }

          totalCost += costPrice * item.quantity;
          totalPrice += item.unit_price * item.quantity;
        }

        const profit = totalPrice - totalCost;
        const profitMargin = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;

        return {
          totalCost,
          totalPrice,
          profit,
          profitMargin
        };
      },
      "calculateInvoiceProfit",
      "حدث خطأ أثناء حساب أرباح الفاتورة",
      {
        totalCost: 0,
        totalPrice: 0,
        profit: 0,
        profitMargin: 0
      }
    );
  }
}

export default ProfitCalculationService;
