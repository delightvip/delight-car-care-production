
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * حاسبة الأرباح
 * مسؤولة عن حساب التكلفة والربح للفواتير والأصناف
 */
class ProfitCalculator {
  private static instance: ProfitCalculator;

  private constructor() {}

  public static getInstance(): ProfitCalculator {
    if (!ProfitCalculator.instance) {
      ProfitCalculator.instance = new ProfitCalculator();
    }
    return ProfitCalculator.instance;
  }

  /**
   * حساب التكلفة الإجمالية لفاتورة
   * @param invoiceId معرف الفاتورة
   * @returns إجمالي التكلفة
   */
  public async calculateInvoiceCost(invoiceId: string): Promise<number> {
    try {
      // 1. جلب عناصر الفاتورة
      const { data: invoiceItems, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (error) throw error;

      if (!invoiceItems || invoiceItems.length === 0) {
        return 0;
      }

      // 2. حساب مجموع التكلفة لكل الأصناف
      let totalCost = 0;
      for (const item of invoiceItems) {
        // 3. حساب تكلفة كل صنف
        const itemCost = await this.getItemCost(item.item_id, item.item_type);
        totalCost += itemCost * item.quantity;
      }

      return totalCost;
    } catch (error) {
      console.error('Error calculating invoice cost:', error);
      return 0;
    }
  }

  /**
   * الحصول على تكلفة الوحدة للصنف
   * @param itemId معرف الصنف
   * @param itemType نوع الصنف
   * @returns تكلفة الوحدة
   */
  public async getItemCost(itemId: number | string, itemType: string): Promise<number> {
    try {
      if (!itemId || !itemType) {
        console.error('Invalid item_id or item_type:', itemId, itemType);
        return 0;
      }

      let table: string;
      switch (itemType) {
        case 'finished_products':
          table = 'finished_products';
          break;
        case 'semi_finished_products':
          table = 'semi_finished_products';
          break;
        case 'raw_materials':
          table = 'raw_materials';
          break;
        case 'packaging_materials':
          table = 'packaging_materials';
          break;
        default:
          console.error('Unknown item type:', itemType);
          return 0;
      }

      // جلب تكلفة الصنف من الجدول المناسب
      const { data, error } = await supabase
        .from(table)
        .select('unit_cost')
        .eq('id', itemId)
        .single();

      if (error) {
        console.error(`Error fetching cost for ${itemType} item ${itemId}:`, error);
        return 0;
      }

      return data.unit_cost || 0;
    } catch (error) {
      console.error(`Error getting unit cost for ${itemType} item ${itemId}:`, error);
      return 0;
    }
  }

  /**
   * حساب هامش الربح ونسبة الربح
   * @param totalSales إجمالي المبيعات
   * @param totalCost إجمالي التكلفة
   * @returns مصفوفة تحتوي على هامش الربح ونسبة الربح
   */
  public calculateMarginAndPercentage(totalSales: number, totalCost: number): [number, number] {
    // التأكد من أن القيم رقمية
    totalSales = Number(totalSales) || 0;
    totalCost = Number(totalCost) || 0;

    // حساب هامش الربح
    const profitMargin = totalSales - totalCost;
    
    // حساب نسبة الربح
    const profitPercentage = totalSales > 0 ? (profitMargin / totalSales) * 100 : 0;
    
    return [profitMargin, profitPercentage];
  }
}

export default ProfitCalculator;
