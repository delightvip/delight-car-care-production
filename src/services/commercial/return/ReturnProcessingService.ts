
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Return, ReturnItem } from "@/services/commercial/CommercialTypes";
import ReturnEntity from "./ReturnEntity";
import { ReturnProcessor } from "./ReturnProcessor";

export class ReturnProcessingService {
  private returnProcessor: ReturnProcessor;
  
  constructor() {
    this.returnProcessor = new ReturnProcessor();
  }
  
  /**
   * Create a new return
   */
  async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      const createdReturn = await ReturnEntity.create(returnData);
      toast.success('تم إنشاء المرتجع بنجاح');
      return createdReturn;
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء إنشاء المرتجع');
      return null;
    }
  }
  
  /**
   * Confirm a return - update inventory and party balance
   */
  async confirmReturn(returnId: string): Promise<boolean> {
    try {
      // Get return details
      const returnData = await ReturnEntity.findById(returnId);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      // Process based on return type
      let success = false;
      if (returnData.return_type === 'sales_return' || returnData.return_type === 'sale') {
        success = await this.returnProcessor.confirmSalesReturn(returnId);
      } else if (returnData.return_type === 'purchase_return' || returnData.return_type === 'purchase') {
        success = await this.returnProcessor.confirmPurchaseReturn(returnId);
      } else {
        toast.error('نوع المرتجع غير صالح');
        return false;
      }
      
      if (success) {
        // Update return status in database
        const { error } = await supabase
          .from('returns')
          .update({ payment_status: 'confirmed' })
          .eq('id', returnId);
        
        if (error) {
          console.error('Error updating return status:', error);
          toast.error('حدث خطأ أثناء تحديث حالة المرتجع');
          return false;
        }
        
        toast.success('تم تأكيد المرتجع بنجاح');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }
  
  /**
   * Cancel a return - revert inventory and party balance changes
   */
  async cancelReturn(returnId: string): Promise<boolean> {
    try {
      // Get return details
      const returnData = await ReturnEntity.findById(returnId);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status !== 'confirmed') {
        toast.info('المرتجع غير مؤكد');
        return true;
      }
      
      // Process based on return type
      let success = false;
      if (returnData.return_type === 'sales_return' || returnData.return_type === 'sale') {
        success = await this.returnProcessor.cancelSalesReturn(returnId);
      } else if (returnData.return_type === 'purchase_return' || returnData.return_type === 'purchase') {
        success = await this.returnProcessor.cancelPurchaseReturn(returnId);
      } else {
        toast.error('نوع المرتجع غير صالح');
        return false;
      }
      
      if (success) {
        // Update return status in database
        const { error } = await supabase
          .from('returns')
          .update({ payment_status: 'cancelled' })
          .eq('id', returnId);
        
        if (error) {
          console.error('Error updating return status:', error);
          toast.error('حدث خطأ أثناء تحديث حالة المرتجع');
          return false;
        }
        
        toast.success('تم إلغاء المرتجع بنجاح');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }
  
  /**
   * Update inventory for return items
   */
  private async updateInventoryForReturnItems(items: ReturnItem[], increase: boolean): Promise<boolean> {
    try {
      for (const item of items) {
        // Convert item_type to appropriate table name
        let tableName: string;
        switch (item.item_type) {
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
            tableName = 'finished_products';
            break;
          default:
            console.error(`Invalid item_type: ${item.item_type}`);
            continue;
        }
        
        // Get current quantity
        const { data, error: fetchError } = await supabase
          .from(tableName)
          .select('quantity')
          .eq('id', item.item_id)
          .single();
        
        if (fetchError) {
          console.error(`Error fetching item ${item.item_id} from ${tableName}:`, fetchError);
          continue;
        }
        
        const currentQuantity = data?.quantity || 0;
        const newQuantity = increase 
          ? currentQuantity + item.quantity 
          : currentQuantity - item.quantity;
        
        // Update quantity
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ quantity: Math.max(0, newQuantity) })
          .eq('id', item.item_id);
        
        if (updateError) {
          console.error(`Error updating item ${item.item_id} in ${tableName}:`, updateError);
          continue;
        }
        
        // Record inventory movement
        await this.recordInventoryMovement(
          item.item_id.toString(),
          tableName,
          increase ? item.quantity : -item.quantity,
          newQuantity
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error updating inventory for return items:', error);
      return false;
    }
  }
  
  /**
   * Record inventory movement
   */
  private async recordInventoryMovement(
    itemId: string,
    itemType: string,
    quantity: number,
    balanceAfter: number
  ): Promise<void> {
    try {
      const movementType = quantity > 0 ? 'in' : 'out';
      const reason = quantity > 0 ? 'return_in' : 'return_out';
      
      await supabase.from('inventory_movements').insert({
        item_id: itemId,
        item_type: itemType,
        movement_type: movementType,
        quantity: quantity,
        balance_after: balanceAfter,
        reason: reason
      });
    } catch (error) {
      console.error('Error recording inventory movement:', error);
    }
  }
}

export default ReturnProcessingService;
