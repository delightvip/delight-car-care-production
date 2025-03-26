import { supabase } from '@/integrations/supabase/client';
import InventoryService from '../../InventoryService';

class ReturnProcessor {
  private supabase;
  private inventoryService;

  constructor() {
    this.supabase = supabase;
    this.inventoryService = InventoryService.getInstance();
  }

  async processReturn(returnId: string) {
    try {
      const { data: returnData, error: returnError } = await this.supabase
        .from('returns')
        .select('*')
        .eq('id', returnId)
        .single();

      if (returnError) {
        console.error("Error fetching return data:", returnError);
        throw new Error(`Failed to fetch return data: ${returnError.message}`);
      }

      if (!returnData) {
        throw new Error("Return data not found.");
      }

      const { data: returnItems, error: returnItemsError } = await this.supabase
        .from('return_items')
        .select('*')
        .eq('return_id', returnId);

      if (returnItemsError) {
        console.error("Error fetching return items:", returnItemsError);
        throw new Error(`Failed to fetch return items: ${returnItemsError.message}`);
      }

      if (!returnItems || returnItems.length === 0) {
        console.warn("No items found for this return.");
        return; // No items to process, exit early
      }

      // Process each item in the return
      for (const item of returnItems) {
        const { item_id, item_type, quantity } = item;

        // Update inventory based on return type
        if (returnData.return_type === 'sales_return') {
          // Increase inventory for sales returns
          await this.inventoryService.increaseInventory(item_id, item_type, quantity);
          console.log(`Increased inventory for item ${item_id} (${item_type}) by ${quantity}`);
        } else if (returnData.return_type === 'purchase_return') {
          // Decrease inventory for purchase returns
          await this.inventoryService.decreaseInventory(item_id, item_type, quantity);
          console.log(`Decreased inventory for item ${item_id} (${item_type}) by ${quantity}`);
        } else {
          console.warn(`Unknown return type: ${returnData.return_type}. Skipping inventory update for item ${item_id}.`);
        }
      }

      console.log(`Return ${returnId} processed successfully.`);
    } catch (error) {
      console.error("Error processing return:", error);
      throw error; // Re-throw the error for handling in the calling function
    }
  }
}

export default ReturnProcessor;
