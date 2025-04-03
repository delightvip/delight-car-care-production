
import { supabase } from "@/integrations/supabase/client";
import BaseCommercialService from '../BaseCommercialService';

/**
 * آلة حساب الأرباح
 * تتولى هذه الخدمة مسؤولية حساب تكلفة المنتجات وتحديد الأرباح
 */
class ProfitCalculator extends BaseCommercialService {
  private static instance: ProfitCalculator;
  
  private constructor() {
    super();
  }
  
  public static getInstance(): ProfitCalculator {
    if (!ProfitCalculator.instance) {
      ProfitCalculator.instance = new ProfitCalculator();
    }
    return ProfitCalculator.instance;
  }
  
  /**
   * حساب تكلفة فاتورة مبيعات
   * @param invoiceId معرف الفاتورة
   * @returns إجمالي التكلفة
   */
  public async calculateInvoiceCost(invoiceId: string): Promise<number> {
    try {
      // Get invoice items
      const { data: invoiceItems, error } = await this.supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);
      
      if (error) throw error;
      
      // If no items, return 0
      if (!invoiceItems || invoiceItems.length === 0) {
        return 0;
      }
      
      console.log('Calculating cost for invoice items:', invoiceItems);
      
      let totalCost = 0;
      
      // Calculate cost for each item
      for (const item of invoiceItems) {
        const itemCost = await this.calculateItemCost(
          item.item_id, 
          item.item_type, 
          Number(item.quantity)
        );
        
        console.log(`Item ${item.item_name} cost: ${itemCost} for quantity ${item.quantity}`);
        totalCost += itemCost;
      }
      
      console.log('Total invoice cost:', totalCost);
      return Number(totalCost);
    } catch (error) {
      console.error('Error calculating invoice cost:', error);
      return 0;
    }
  }
  
  /**
   * حساب تكلفة منتج معين
   * @param itemId معرف المنتج
   * @param itemType نوع المنتج
   * @param quantity الكمية
   * @returns تكلفة المنتج
   */
  private async calculateItemCost(itemId: number, itemType: string, quantity: number): Promise<number> {
    try {
      const dbItemType = this.mapItemTypeToTable(itemType);
      
      if (!dbItemType) {
        console.error('Unknown item type:', itemType);
        return 0;
      }
      
      // Get item unit cost
      const { data, error } = await this.supabase
        .from(dbItemType)
        .select('unit_cost')
        .eq('id', itemId)
        .single();
      
      if (error) {
        console.error(`Error getting ${itemType} with ID ${itemId}:`, error);
        return 0;
      }
      
      // Make sure we properly convert to a number
      const unitCost = Number(data.unit_cost);
      console.log(`Unit cost for ${itemType} (id: ${itemId}): ${unitCost}`);
      
      return unitCost * quantity;
    } catch (error) {
      console.error('Error calculating item cost:', error);
      return 0;
    }
  }
  
  /**
   * تحويل نوع المنتج إلى اسم الجدول في قاعدة البيانات
   * @param itemType نوع المنتج
   * @returns اسم الجدول
   */
  private mapItemTypeToTable(itemType: string): string | null {
    switch(itemType) {
      case 'raw_materials':
        return 'raw_materials';
      case 'packaging_materials':
        return 'packaging_materials';
      case 'semi_finished_products':
        return 'semi_finished_products';
      case 'finished_products':
        return 'finished_products';
      default:
        return null;
    }
  }
}

export default ProfitCalculator;
