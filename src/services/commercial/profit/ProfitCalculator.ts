import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import BaseCommercialService from '../BaseCommercialService';
import { ensureNumericValue } from '@/components/inventory/common/InventoryDataFormatter';

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
      let tableName: string;
      
      switch (itemType) {
        case 'raw_materials':
          tableName = 'raw_materials';
          break;
        case 'packaging_materials':
          tableName = 'packaging_materials';
          break;
        case 'semi_finished_products':
          tableName = 'semi_finished_products';
          break;
        case 'finished_products':
          // For finished products, we need special handling to calculate the true cost
          return await this.getFinishedProductTrueCost(itemId);
        default:
          return 0;
      }
      
      const { data, error } = await this.supabase
        .from(tableName)
        .select('unit_cost')
        .eq('id', itemId)
        .single();
      
      if (error) {
        console.error(`Error fetching cost for item ${itemId} from ${tableName}:`, error);
        return 0;
      }
      
      return ensureNumericValue(data?.unit_cost);
    } catch (error) {
      console.error('Error getting item cost:', error);
      return 0;
    }
  }
  
  /**
   * Get the true cost of a finished product by calculating the cost
   * of its semi-finished component and packaging materials
   */
  private async getFinishedProductTrueCost(finishedProductId: number): Promise<number> {
    try {
      // Get the finished product details including its semi-finished product component
      const { data: product, error } = await this.supabase
        .from('finished_products')
        .select(`
          unit_cost,
          semi_finished_id,
          semi_finished_quantity
        `)
        .eq('id', finishedProductId)
        .single();
      
      if (error) {
        console.error(`Error fetching finished product ${finishedProductId}:`, error);
        return ensureNumericValue(0);
      }
      
      // Get the semi-finished product's cost
      let semiFinishedCost = 0;
      if (product.semi_finished_id) {
        const { data: semiFinished } = await this.supabase
          .from('semi_finished_products')
          .select('unit_cost')
          .eq('id', product.semi_finished_id)
          .single();
        
        semiFinishedCost = semiFinished ? 
          ensureNumericValue(semiFinished.unit_cost) * ensureNumericValue(product.semi_finished_quantity) : 0;
      }
      
      // Simplified approach - use two separate queries
      let packagingCost = 0;
      
      // 1. Get the packaging material references and quantities
      const { data: packagingRefs, error: packagingRefsError } = await this.supabase
        .from('finished_product_packaging')
        .select('packaging_material_id, quantity')
        .eq('finished_product_id', finishedProductId);
        
      if (!packagingRefsError && packagingRefs && packagingRefs.length > 0) {
        // 2. For each packaging reference, get the material cost
        for (const pkg of packagingRefs) {
          const { data: material } = await this.supabase
            .from('packaging_materials')
            .select('unit_cost')
            .eq('id', pkg.packaging_material_id)
            .single();
            
          if (material) {
            packagingCost += ensureNumericValue(material.unit_cost) * ensureNumericValue(pkg.quantity);
          }
        }
      }
      
      // Return the total cost (semi-finished + packaging)
      const totalCost = semiFinishedCost + packagingCost;
      
      // If the calculated cost is zero but we have a stored unit_cost, use that as fallback
      if (totalCost === 0 && product.unit_cost) {
        return ensureNumericValue(product.unit_cost);
      }
      
      console.log(`Finished product ${finishedProductId} true cost:`, {
        semiFinishedCost,
        packagingCost,
        totalCost,
        storedUnitCost: product.unit_cost
      });
      
      return totalCost;
    } catch (error) {
      console.error(`Error calculating true cost for finished product ${finishedProductId}:`, error);
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
        totalCost += itemCost * ensureNumericValue(item.quantity);
      }
      
      return totalCost;
    } catch (error) {
      console.error('Error calculating invoice cost:', error);
      return 0;
    }
  }
  
  /**
   * Calculate item total value (quantity * unit_cost)
   */
  public calculateItemTotalValue(quantity: number, unitCost: number): number {
    return ensureNumericValue(quantity) * ensureNumericValue(unitCost);
  }
}

export default ProfitCalculator;
