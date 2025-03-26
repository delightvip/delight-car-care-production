
import { supabase } from "@/integrations/supabase/client";
import { Return } from '@/services/CommercialTypes';
import { toast } from "sonner";
import PartyService from '../../PartyService';
import InventoryService from '../../InventoryService';
import { ReturnEntity } from './ReturnEntity';

// خدمة تُعنى بمعالجة المرتجعات
export class ReturnProcessor {
  private partyService = PartyService.getInstance();
  private inventoryService = InventoryService.getInstance();

  // تأكيد مرتجع
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await ReturnEntity.fetchById(returnId);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status === 'confirmed') {
        toast.info('المرتجع مؤكد بالفعل');
        return true;
      }
      
      console.log('Confirming return:', returnData);
      
      // Update inventory based on return type
      if (returnData.return_type === 'sales_return') {
        console.log("نوع المرتجع: مرتجع مبيعات - تحديث المخزون");
        // Increase inventory for sales returns
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for sales returns
        if (returnData.party_id) {
          console.log("تحديث رصيد العميل:", returnData.party_id);
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false, // credit for sales returns (reduce customer's debt)
            'مرتجع مبيعات',
            'sales_return',
            returnData.id
          );
        }
      } else if (returnData.return_type === 'purchase_return') {
        console.log("نوع المرتجع: مرتجع مشتريات - تحديث المخزون");
        // Decrease inventory for purchase returns
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for purchase returns
        if (returnData.party_id) {
          console.log("تحديث رصيد المورد:", returnData.party_id);
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true, // debit for purchase returns (increase supplier's debt)
            'مرتجع مشتريات',
            'purchase_return',
            returnData.id
          );
        }
      }
      
      // Update return status to confirmed
      const { error } = await supabase
        .from('returns')
        .update({ payment_status: 'confirmed' })
        .eq('id', returnId);
      
      if (error) throw error;
      
      console.log('Return confirmed successfully');
      toast.success('تم تأكيد المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }
  
  // إلغاء مرتجع
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await ReturnEntity.fetchById(returnId);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء المرتجعات المؤكدة فقط');
        return false;
      }
      
      // Update inventory based on return type
      if (returnData.return_type === 'sales_return') {
        // Decrease inventory for cancelled sales returns
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for cancelled sales returns
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true, // debit for cancelled sales returns (restore customer's debt)
            'إلغاء مرتجع مبيعات',
            'cancel_sales_return',
            returnData.id
          );
        }
      } else if (returnData.return_type === 'purchase_return') {
        // Increase inventory for cancelled purchase returns
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for cancelled purchase returns
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false, // credit for cancelled purchase returns (restore supplier's debt)
            'إلغاء مرتجع مشتريات',
            'cancel_purchase_return',
            returnData.id
          );
        }
      }
      
      // Update return status to cancelled
      const { error } = await supabase
        .from('returns')
        .update({ payment_status: 'cancelled' })
        .eq('id', returnId);
      
      if (error) throw error;
      
      toast.success('تم إلغاء المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }
}
