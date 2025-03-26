
import { supabase } from '@/integrations/supabase/client';
import InventoryService from '@/services/InventoryService';

class ReturnProcessor {
  private supabase;
  private inventoryService;

  constructor() {
    this.supabase = supabase;
    // Fix getInstance access by using the static method correctly
    this.inventoryService = new InventoryService();
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

  async confirmReturn(returnId: string): Promise<boolean> {
    try {
      // Fetch the return data
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
      
      // Check if return is already confirmed
      if (returnData.payment_status === 'confirmed') {
        console.log(`Return ${returnId} is already confirmed.`);
        return true;
      }
      
      // Process the inventory changes
      await this.processReturn(returnId);
      
      // Update the return status to confirmed
      const { error: updateError } = await this.supabase
        .from('returns')
        .update({ payment_status: 'confirmed' })
        .eq('id', returnId);
        
      if (updateError) {
        console.error("Error updating return status:", updateError);
        throw new Error(`Failed to update return status: ${updateError.message}`);
      }
      
      console.log(`Return ${returnId} confirmed successfully.`);
      return true;
    } catch (error) {
      console.error("Error confirming return:", error);
      return false;
    }
  }
  
  async cancelReturn(returnId: string): Promise<boolean> {
    try {
      // Fetch the return data
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
      
      // Check if return can be cancelled (only confirmed returns can be cancelled)
      if (returnData.payment_status !== 'confirmed') {
        console.error(`Return ${returnId} is not in confirmed state and cannot be cancelled.`);
        return false;
      }
      
      // Fetch return items
      const { data: returnItems, error: returnItemsError } = await this.supabase
        .from('return_items')
        .select('*')
        .eq('return_id', returnId);
        
      if (returnItemsError) {
        console.error("Error fetching return items:", returnItemsError);
        throw new Error(`Failed to fetch return items: ${returnItemsError.message}`);
      }
      
      // Reverse the inventory changes
      for (const item of returnItems || []) {
        const { item_id, item_type, quantity } = item;
        
        if (returnData.return_type === 'sales_return') {
          // For sales return cancellation, decrease inventory (opposite of confirmation)
          await this.inventoryService.decreaseInventory(item_id, item_type, quantity);
          console.log(`Decreased inventory for item ${item_id} (${item_type}) by ${quantity}`);
        } else if (returnData.return_type === 'purchase_return') {
          // For purchase return cancellation, increase inventory (opposite of confirmation)
          await this.inventoryService.increaseInventory(item_id, item_type, quantity);
          console.log(`Increased inventory for item ${item_id} (${item_type}) by ${quantity}`);
        }
      }
      
      // Update the return status to cancelled
      const { error: updateError } = await this.supabase
        .from('returns')
        .update({ payment_status: 'cancelled' })
        .eq('id', returnId);
        
      if (updateError) {
        console.error("Error updating return status:", updateError);
        throw new Error(`Failed to update return status: ${updateError.message}`);
      }
      
      console.log(`Return ${returnId} cancelled successfully.`);
      return true;
    } catch (error) {
      console.error("Error cancelling return:", error);
      return false;
    }
  }
}

export default ReturnProcessor;
