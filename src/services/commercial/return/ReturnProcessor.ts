
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import { Return } from "../CommercialTypes";

export class ReturnProcessor {
  private partyService: PartyService;
  private inventoryService: InventoryService;
  
  constructor() {
    this.partyService = PartyService.getInstance();
    this.inventoryService = InventoryService.getInstance();
  }
  
  /**
   * Get return details by ID
   */
  async getReturnById(returnId: string): Promise<Return | null> {
    try {
      // Fetch return base data
      const { data: returnData, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('id', returnId)
        .single();
      
      if (error) throw error;
      
      // Fetch return items
      const { data: items, error: itemsError } = await supabase
        .from('return_items')
        .select('*')
        .eq('return_id', returnId);
      
      if (itemsError) throw itemsError;
      
      return {
        ...returnData,
        party_name: returnData.parties?.name,
        return_type: returnData.return_type as any,
        payment_status: returnData.payment_status as any,
        items: items || []
      } as Return;
    } catch (error) {
      console.error(`Error fetching return ${returnId}:`, error);
      return null;
    }
  }

  /**
   * Confirm a sale return
   */
  async confirmSaleReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        console.error('Return not found:', returnId);
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status === 'confirmed') {
        console.log('Return already confirmed:', returnId);
        toast.info('المرتجع مؤكد بالفعل');
        return true;
      }
      
      // Update party balance based on return status
      await this.partyService.updatePartyBalance(
        returnData.party_id, 
        returnData.amount, 
        false // isDebit=false for sale returns (customer's debt decreases)
      );
      
      // Update inventory - increase stock for returned items
      for (const item of returnData.items) {
        if (item.item_type === 'raw_materials') {
          await this.inventoryService.updateRawMaterial(item.item_id, { quantity: item.quantity });
        } else if (item.item_type === 'packaging_materials') {
          await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: item.quantity });
        } else if (item.item_type === 'semi_finished_products') {
          await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: item.quantity });
        } else if (item.item_type === 'finished_products') {
          await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: item.quantity });
        }
      }
      
      // Update return status
      const { error: statusError } = await supabase
        .from('returns')
        .update({
          payment_status: 'confirmed'
        })
        .eq('id', returnId);
      
      if (statusError) {
        console.error('Error updating return status:', statusError);
        toast.error('حدث خطأ أثناء تحديث حالة المرتجع');
        return false;
      }
      
      toast.success('تم تأكيد المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming sale return:', error);
      toast.error('حدث خطأ أثناء تأكيد مرتجع البيع');
      return false;
    }
  }

  /**
   * Cancel a sale return
   */
  async cancelSaleReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        console.error('Return not found:', returnId);
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status !== 'confirmed') {
        console.log('Return is not confirmed:', returnId);
        toast.info('المرتجع ليس مؤكداً');
        return true;
      }
      
      // Update party balance based on return status
      await this.partyService.updatePartyBalance(
        returnData.party_id, 
        returnData.amount, 
        true // isDebit=true to reverse the sale return (customer's debt increases)
      );
      
      // Update inventory - decrease stock for returned items (reversal)
      for (const item of returnData.items) {
        if (item.item_type === 'raw_materials') {
          await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -item.quantity });
        } else if (item.item_type === 'packaging_materials') {
          await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -item.quantity });
        } else if (item.item_type === 'semi_finished_products') {
          await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -item.quantity });
        } else if (item.item_type === 'finished_products') {
          await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -item.quantity });
        }
      }
      
      // Update return status
      const { error: statusError } = await supabase
        .from('returns')
        .update({
          payment_status: 'cancelled'
        })
        .eq('id', returnId);
      
      if (statusError) {
        console.error('Error updating return status:', statusError);
        toast.error('حدث خطأ أثناء تحديث حالة المرتجع');
        return false;
      }
      
      toast.success('تم إلغاء المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling sale return:', error);
      toast.error('حدث خطأ أثناء إلغاء مرتجع البيع');
      return false;
    }
  }

  /**
   * Confirm a purchase return
   */
  async confirmPurchaseReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        console.error('Return not found:', returnId);
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status === 'confirmed') {
        console.log('Return already confirmed:', returnId);
        toast.info('المرتجع مؤكد بالفعل');
        return true;
      }
      
      // Update party balance based on return status
      await this.partyService.updatePartyBalance(
        returnData.party_id, 
        returnData.amount, 
        true // isDebit=true for purchase returns (our debt to supplier decreases)
      );
      
      // Update inventory - decrease stock for returned items
      for (const item of returnData.items) {
        if (item.item_type === 'raw_materials') {
          await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -item.quantity });
        } else if (item.item_type === 'packaging_materials') {
          await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -item.quantity });
        } else if (item.item_type === 'semi_finished_products') {
          await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -item.quantity });
        } else if (item.item_type === 'finished_products') {
          await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -item.quantity });
        }
      }
      
      // Update return status
      const { error: statusError } = await supabase
        .from('returns')
        .update({
          payment_status: 'confirmed'
        })
        .eq('id', returnId);
      
      if (statusError) {
        console.error('Error updating return status:', statusError);
        toast.error('حدث خطأ أثناء تحديث حالة المرتجع');
        return false;
      }
      
      toast.success('تم تأكيد المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming purchase return:', error);
      toast.error('حدث خطأ أثناء تأكيد مرتجع الشراء');
      return false;
    }
  }

  /**
   * Cancel a purchase return
   */
  async cancelPurchaseReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        console.error('Return not found:', returnId);
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status !== 'confirmed') {
        console.log('Return is not confirmed:', returnId);
        toast.info('المرتجع ليس مؤكداً');
        return true;
      }
      
      // Update party balance based on return status
      await this.partyService.updatePartyBalance(
        returnData.party_id, 
        returnData.amount, 
        false // isDebit=false to reverse the purchase return (our debt to supplier increases)
      );
      
      // Update inventory - increase stock for returned items (reversal)
      for (const item of returnData.items) {
        if (item.item_type === 'raw_materials') {
          await this.inventoryService.updateRawMaterial(item.item_id, { quantity: item.quantity });
        } else if (item.item_type === 'packaging_materials') {
          await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: item.quantity });
        } else if (item.item_type === 'semi_finished_products') {
          await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: item.quantity });
        } else if (item.item_type === 'finished_products') {
          await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: item.quantity });
        }
      }
      
      // Update return status
      const { error: statusError } = await supabase
        .from('returns')
        .update({
          payment_status: 'cancelled'
        })
        .eq('id', returnId);
      
      if (statusError) {
        console.error('Error updating return status:', statusError);
        toast.error('حدث خطأ أثناء تحديث حالة المرتجع');
        return false;
      }
      
      toast.success('تم إلغاء المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling purchase return:', error);
      toast.error('حدث خطأ أثناء إلغاء مرتجع الشراء');
      return false;
    }
  }

  /**
   * Confirm a return of any type
   */
  async confirmReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        console.error('Return not found:', returnId);
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.return_type === 'sale' || returnData.return_type === 'sales_return') {
        return await this.confirmSaleReturn(returnId);
      } else if (returnData.return_type === 'purchase' || returnData.return_type === 'purchase_return') {
        return await this.confirmPurchaseReturn(returnId);
      } else {
        toast.error('نوع المرتجع غير معروف');
        return false;
      }
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }

  /**
   * Cancel a return of any type
   */
  async cancelReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        console.error('Return not found:', returnId);
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.return_type === 'sale' || returnData.return_type === 'sales_return') {
        return await this.cancelSaleReturn(returnId);
      } else if (returnData.return_type === 'purchase' || returnData.return_type === 'purchase_return') {
        return await this.cancelPurchaseReturn(returnId);
      } else {
        toast.error('نوع المرتجع غير معروف');
        return false;
      }
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }
}
