
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import BaseCommercialService from '../BaseCommercialService';

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
   * Get the cost of an item based on its type and ID
   */
  public async getItemCost(itemId: number, itemType: string): Promise<number> {
    try {
      let table: string;
      
      switch (itemType) {
        case 'raw_materials':
          table = 'raw_materials';
          break;
        case 'packaging_materials':
          table = 'packaging_materials';
          break;
        case 'semi_finished_products':
          table = 'semi_finished_products';
          break;
        case 'finished_products':
          table = 'finished_products';
          break;
        default:
          return 0;
      }
      
      const { data, error } = await this.supabase
        .from(table)
        .select('unit_cost')
        .eq('id', itemId)
        .single();
      
      if (error) {
        console.error(`Error fetching cost for item ${itemId} from ${table}:`, error);
        return 0;
      }
      
      return data?.unit_cost || 0;
    } catch (error) {
      console.error('Error getting item cost:', error);
      return 0;
    }
  }
  
  /**
   * Calculate total cost of invoice items
   */
  public async calculateInvoiceCost(invoiceId: string): Promise<number> {
    try {
      const { data: items, error: itemsError } = await this.supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);
      
      if (itemsError) throw itemsError;
      
      if (!items || items.length === 0) {
        return 0;
      }
      
      let totalCost = 0;
      
      for (const item of items) {
        const itemCost = await this.getItemCost(item.item_id, item.item_type);
        totalCost += itemCost * item.quantity;
      }
      
      return totalCost;
    } catch (error) {
      console.error('Error calculating invoice cost:', error);
      return 0;
    }
  }
}

export default ProfitCalculator;
