
import { supabase } from "@/integrations/supabase/client";
import { Return } from "@/services/CommercialTypes";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import { ReturnEntity } from "./ReturnEntity";
import { toast } from "sonner";

export class ReturnProcessor {
  private inventoryService: InventoryService;
  private partyService: PartyService;

  constructor() {
    // استخدام getInstance بدلاً من الإنشاء المباشر
    this.inventoryService = InventoryService.getInstance();
    this.partyService = PartyService.getInstance();
  }

  /**
   * تأكيد مرتجع، تحديث المخزون والسجلات المالية
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await ReturnEntity.fetchById(returnId);
      if (!returnData) {
        console.error('Return not found');
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status === 'confirmed') {
        console.log('Return already confirmed');
        toast.info('المرتجع مؤكد بالفعل');
        return true;
      }
      
      // تحديث المخزون بناءً على نوع المرتجع
      if (returnData.return_type === 'sales_return') {
        // زيادة المخزون لمرتجعات المبيعات
        for (const item of returnData.items || []) {
          let currentQuantity = 0;
          
          switch (item.item_type) {
            case 'raw_materials':
              const rawMaterial = await this.inventoryService.getRawMaterialById(item.item_id);
              currentQuantity = rawMaterial?.quantity || 0;
              await this.inventoryService.updateRawMaterial(item.item_id, { 
                quantity: currentQuantity + Number(item.quantity) 
              });
              break;
            case 'packaging_materials':
              const packagingMaterial = await this.inventoryService.getPackagingMaterialById(item.item_id);
              currentQuantity = packagingMaterial?.quantity || 0;
              await this.inventoryService.updatePackagingMaterial(item.item_id, { 
                quantity: currentQuantity + Number(item.quantity) 
              });
              break;
            case 'semi_finished_products':
              const semiFinished = await this.inventoryService.getSemiFinishedProductById(item.item_id);
              currentQuantity = semiFinished?.quantity || 0;
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { 
                quantity: currentQuantity + Number(item.quantity) 
              });
              break;
            case 'finished_products':
              const finishedProduct = await this.inventoryService.getFinishedProductById(item.item_id);
              currentQuantity = finishedProduct?.quantity || 0;
              await this.inventoryService.updateFinishedProduct(item.item_id, { 
                quantity: currentQuantity + Number(item.quantity) 
              });
              break;
          }
        }
        
        // تحديث السجلات المالية لمرتجعات المبيعات
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false, // دائن لمرتجعات المبيعات (تقليل دين العميل)
            'مرتجع مبيعات',
            'sales_return',
            returnData.id
          );
        }
      } else if (returnData.return_type === 'purchase_return') {
        // خفض المخزون لمرتجعات المشتريات
        for (const item of returnData.items || []) {
          let currentQuantity = 0;
          
          switch (item.item_type) {
            case 'raw_materials':
              const rawMaterial = await this.inventoryService.getRawMaterialById(item.item_id);
              currentQuantity = rawMaterial?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`كمية المادة ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إرجاعها (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updateRawMaterial(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
            case 'packaging_materials':
              const packagingMaterial = await this.inventoryService.getPackagingMaterialById(item.item_id);
              currentQuantity = packagingMaterial?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`كمية مادة التعبئة ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إرجاعها (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updatePackagingMaterial(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
            case 'semi_finished_products':
              const semiFinished = await this.inventoryService.getSemiFinishedProductById(item.item_id);
              currentQuantity = semiFinished?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`كمية المنتج نصف المصنع ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إرجاعها (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
            case 'finished_products':
              const finishedProduct = await this.inventoryService.getFinishedProductById(item.item_id);
              currentQuantity = finishedProduct?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`كمية المنتج النهائي ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إرجاعها (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updateFinishedProduct(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
          }
        }
        
        // تحديث السجلات المالية لمرتجعات المشتريات
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true, // مدين لمرتجعات المشتريات (زيادة دين المورد)
            'مرتجع مشتريات',
            'purchase_return',
            returnData.id
          );
        }
      }
      
      // تحديث حالة المرتجع إلى مؤكد
      const { error } = await supabase
        .from('returns')
        .update({ payment_status: 'confirmed' })
        .eq('id', returnId);
      
      if (error) throw error;
      
      toast.success('تم تأكيد المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }
  
  /**
   * إلغاء مرتجع، عكس تغييرات المخزون والتغييرات المالية
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await ReturnEntity.fetchById(returnId);
      if (!returnData) {
        console.error('Return not found');
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status !== 'confirmed') {
        console.error('Can only cancel confirmed returns');
        toast.error('يمكن إلغاء المرتجعات المؤكدة فقط');
        return false;
      }
      
      // تحديث المخزون بناءً على نوع المرتجع
      if (returnData.return_type === 'sales_return') {
        // خفض المخزون لمرتجعات المبيعات الملغاة
        for (const item of returnData.items || []) {
          let currentQuantity = 0;
          
          switch (item.item_type) {
            case 'raw_materials':
              const rawMaterial = await this.inventoryService.getRawMaterialById(item.item_id);
              currentQuantity = rawMaterial?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`كمية المادة ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إلغاء إرجاعها (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updateRawMaterial(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
            case 'packaging_materials':
              const packagingMaterial = await this.inventoryService.getPackagingMaterialById(item.item_id);
              currentQuantity = packagingMaterial?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`كمية مادة التعبئة ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إلغاء إرجاعها (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updatePackagingMaterial(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
            case 'semi_finished_products':
              const semiFinished = await this.inventoryService.getSemiFinishedProductById(item.item_id);
              currentQuantity = semiFinished?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`كمية المنتج نصف المصنع ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إلغاء إرجاعها (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
            case 'finished_products':
              const finishedProduct = await this.inventoryService.getFinishedProductById(item.item_id);
              currentQuantity = finishedProduct?.quantity || 0;
              if (currentQuantity < Number(item.quantity)) {
                toast.error(`كمية المنتج النهائي ${item.item_name} في المخزون (${currentQuantity}) أقل من الكمية المطلوب إلغاء إرجاعها (${item.quantity})`);
                return false;
              }
              await this.inventoryService.updateFinishedProduct(item.item_id, { 
                quantity: currentQuantity - Number(item.quantity) 
              });
              break;
          }
        }
        
        // تحديث السجلات المالية لمرتجعات المبيعات الملغاة
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true, // مدين لإلغاء مرتجعات المبيعات (استعادة دين العميل)
            'إلغاء مرتجع مبيعات',
            'cancel_sales_return',
            returnData.id
          );
        }
      } else if (returnData.return_type === 'purchase_return') {
        // زيادة المخزون لمرتجعات المشتريات الملغاة
        for (const item of returnData.items || []) {
          let currentQuantity = 0;
          
          switch (item.item_type) {
            case 'raw_materials':
              const rawMaterial = await this.inventoryService.getRawMaterialById(item.item_id);
              currentQuantity = rawMaterial?.quantity || 0;
              await this.inventoryService.updateRawMaterial(item.item_id, { 
                quantity: currentQuantity + Number(item.quantity) 
              });
              break;
            case 'packaging_materials':
              const packagingMaterial = await this.inventoryService.getPackagingMaterialById(item.item_id);
              currentQuantity = packagingMaterial?.quantity || 0;
              await this.inventoryService.updatePackagingMaterial(item.item_id, { 
                quantity: currentQuantity + Number(item.quantity) 
              });
              break;
            case 'semi_finished_products':
              const semiFinished = await this.inventoryService.getSemiFinishedProductById(item.item_id);
              currentQuantity = semiFinished?.quantity || 0;
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { 
                quantity: currentQuantity + Number(item.quantity) 
              });
              break;
            case 'finished_products':
              const finishedProduct = await this.inventoryService.getFinishedProductById(item.item_id);
              currentQuantity = finishedProduct?.quantity || 0;
              await this.inventoryService.updateFinishedProduct(item.item_id, { 
                quantity: currentQuantity + Number(item.quantity) 
              });
              break;
          }
        }
        
        // تحديث السجلات المالية لمرتجعات المشتريات الملغاة
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false, // دائن لإلغاء مرتجعات المشتريات (استعادة دين المورد)
            'إلغاء مرتجع مشتريات',
            'cancel_purchase_return',
            returnData.id
          );
        }
      }
      
      // تحديث حالة المرتجع إلى ملغى
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
