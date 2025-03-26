
import { supabase } from "@/integrations/supabase/client";
import { Invoice, InvoiceItem } from "@/services/CommercialTypes";

export class InvoiceService {
  /**
   * Get all invoice items for a specific invoice
   */
  public async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);
      
      if (error) throw error;
      
      // Process each item to get the cost price
      const itemsWithCostPrice = await Promise.all(data.map(async item => {
        const costPrice = await this.getItemCostPrice(item.item_id, item.item_type);
        return {
          id: item.id,
          invoice_id: item.invoice_id,
          item_id: item.item_id,
          item_name: item.item_name,
          item_type: item.item_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          cost_price: costPrice,
          created_at: item.created_at
        };
      }));
      
      return itemsWithCostPrice;
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      return [];
    }
  }

  /**
   * Get the cost price for a specific item
   */
  private async getItemCostPrice(itemId: number, itemType: string): Promise<number> {
    try {
      // Get the table name based on item type
      let table;
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
      
      const { data, error } = await supabase
        .from(table)
        .select('unit_cost')
        .eq('id', itemId)
        .single();
      
      if (error || !data) return 0;
      
      return data.unit_cost || 0;
    } catch (error) {
      console.error(`Error getting cost price for item ${itemId} of type ${itemType}:`, error);
      return 0;
    }
  }
}

// Export a default instance for convenience
export default new InvoiceService();
