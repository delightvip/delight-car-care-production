import { supabase } from "@/integrations/supabase/client";
import { ReturnEntity } from "./ReturnEntity";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import { toast } from "sonner";

export class ReturnProcessor {
  private inventoryService: InventoryService;
  private partyService: PartyService;
  
  constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.partyService = PartyService.getInstance();
  }
  
  /**
   * تأكيد مرتجع وتحديث المخزون والسجلات المالية
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await ReturnEntity.fetchReturnById(returnId);
      if (!returnData) {
        toast('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status === 'confirmed') {
        toast('المرتجع مؤكد بالفعل');
        return true;
      }
      
      // تحديث المخزون بناءً على نوع المرتجعات
      if (returnData.return_type === 'sales_return') {
        // في حالة مرتجع المبيعات، نقوم بإعادة المنتجات إلى المخزن
        for (const item of returnData.items || []) {
          try {
            switch (item.item_type) {
              case 'raw_materials':
                const { data: rawMaterial } = await this.supabase
                  .from('raw_materials')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                const newRawQuantity = (rawMaterial?.quantity || 0) + Number(item.quantity);
                await this.inventoryService.updateRawMaterial(item.item_id, { quantity: newRawQuantity });
                break;
              case 'packaging_materials':
                const { data: packagingMaterial } = await this.supabase
                  .from('packaging_materials')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                const newPackagingQuantity = (packagingMaterial?.quantity || 0) + Number(item.quantity);
                await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: newPackagingQuantity });
                break;
              case 'semi_finished_products':
                const { data: semiFinished } = await this.supabase
                  .from('semi_finished_products')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                const newSemiFinishedQuantity = (semiFinished?.quantity || 0) + Number(item.quantity);
                await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: newSemiFinishedQuantity });
                break;
              case 'finished_products':
                const { data: finishedProduct } = await this.supabase
                  .from('finished_products')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                const newFinishedQuantity = (finishedProduct?.quantity || 0) + Number(item.quantity);
                await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: newFinishedQuantity });
                break;
              default:
                toast('نوع عنصر غير معروف');
                return false;
            }
          } catch (itemError) {
            console.error(`Error processing item ${item.item_id}:`, itemError);
            toast('حدث خطأ أثناء معالجة العناصر');
            return false;
          }
        }
        
        // التأثير على حساب العميل
        if (returnData.party_id) {
          try {
            await this.partyService.updatePartyBalance(
              returnData.party_id,
              returnData.amount,
              false, // دائن لمرتجع المبيعات (تخفيض دين العميل)
              'مرتجع مبيعات',
              'sales_return',
              returnData.id
            );
          } catch (partyError) {
            console.error('Error updating party balance:', partyError);
            toast('حدث خطأ أثناء تحديث حساب العميل');
            return false;
          }
        }
      } else if (returnData.return_type === 'purchase_return') {
        // في حالة مرتجع المشتريات، نقوم بخفض المخزون
        for (const item of returnData.items || []) {
          try {
            switch (item.item_type) {
              case 'raw_materials':
                const { data: rawMaterial } = await this.supabase
                  .from('raw_materials')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                if (!rawMaterial) {
                  toast('لم يتم العثور على المادة الخام');
                  return false;
                }
                
                if (rawMaterial.quantity < Number(item.quantity)) {
                  toast('كمية المادة الخام في المخزون غير كافية للمرتجع');
                  return false;
                }
                
                const newRawQuantity = rawMaterial.quantity - Number(item.quantity);
                await this.inventoryService.updateRawMaterial(item.item_id, { quantity: newRawQuantity });
                break;
              case 'packaging_materials':
                const { data: packagingMaterial } = await this.supabase
                  .from('packaging_materials')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                if (!packagingMaterial) {
                  toast('لم يتم العثور على مادة التعبئة');
                  return false;
                }
                
                if (packagingMaterial.quantity < Number(item.quantity)) {
                  toast('كمية مادة التعبئة في المخزون غير كافية للمرتجع');
                  return false;
                }
                
                const newPackagingQuantity = packagingMaterial.quantity - Number(item.quantity);
                await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: newPackagingQuantity });
                break;
              case 'semi_finished_products':
                const { data: semiFinished } = await this.supabase
                  .from('semi_finished_products')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                if (!semiFinished) {
                  toast('لم يتم العثور على المنتج نصف المصنع');
                  return false;
                }
                
                if (semiFinished.quantity < Number(item.quantity)) {
                  toast('كمية المنتج نصف المصنع في المخزون غير كافية للمرتجع');
                  return false;
                }
                
                const newSemiFinishedQuantity = semiFinished.quantity - Number(item.quantity);
                await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: newSemiFinishedQuantity });
                break;
              case 'finished_products':
                const { data: finishedProduct } = await this.supabase
                  .from('finished_products')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                if (!finishedProduct) {
                  toast('لم يتم العثور على المنتج النهائي');
                  return false;
                }
                
                if (finishedProduct.quantity < Number(item.quantity)) {
                  toast('كمية المنتج النهائي في المخزون غير كافية للمرتجع');
                  return false;
                }
                
                const newFinishedQuantity = finishedProduct.quantity - Number(item.quantity);
                await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: newFinishedQuantity });
                break;
              default:
                toast('نوع عنصر غير معروف');
                return false;
            }
          } catch (itemError) {
            console.error(`Error processing item ${item.item_id}:`, itemError);
            toast('حدث خطأ أثناء معالجة العناصر');
            return false;
          }
        }
        
        // التأثير على حساب المورد
        if (returnData.party_id) {
          try {
            await this.partyService.updatePartyBalance(
              returnData.party_id,
              returnData.amount,
              true, // مدين لمرتجع المشتريات (زيادة دين المورد)
              'مرتجع مشتريات',
              'purchase_return',
              returnData.id
            );
          } catch (partyError) {
            console.error('Error updating party balance:', partyError);
            toast('حدث خطأ أثناء تحديث حساب المورد');
            return false;
          }
        }
      } else {
        toast('نوع مرتجع غير معروف');
        return false;
      }
      
      // تحديث حالة المرتجع
      const { error: updateError } = await this.supabase
        .from('returns')
        .update({ payment_status: 'confirmed' })
        .eq('id', returnId);
      
      if (updateError) {
        console.error('Error updating return status:', updateError);
        toast('حدث خطأ أثناء تحديث حالة المرتجع');
        return false;
      }
      
      toast('تم تأكيد المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming return:', error);
      toast('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }
  
  /**
   * إلغاء مرتجع، عكس التغييرات في المخزون والتغييرات المالية
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await ReturnEntity.fetchReturnById(returnId);
      if (!returnData) {
        toast('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status !== 'confirmed') {
        toast('يمكن إلغاء المرتجعات المؤكدة فقط');
        return false;
      }
      
      // تحديث المخزون بناءً على نوع المرتجع
      if (returnData.return_type === 'sales_return') {
        // في حالة مرتجع المبيعات، نقوم بسحب المنتجات من المخزن
        for (const item of returnData.items || []) {
          try {
            switch (item.item_type) {
              case 'raw_materials':
                const { data: rawMaterial } = await this.supabase
                  .from('raw_materials')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                if (!rawMaterial) {
                  toast('لم يتم العثور على المادة الخام');
                  return false;
                }
                
                if (rawMaterial.quantity < Number(item.quantity)) {
                  toast('لا يمكن إلغاء المرتجع بسبب عدم كفاية كمية المادة الخام في المخزون');
                  return false;
                }
                
                const newRawQuantity = rawMaterial.quantity - Number(item.quantity);
                await this.inventoryService.updateRawMaterial(item.item_id, { quantity: newRawQuantity });
                break;
              case 'packaging_materials':
                const { data: packagingMaterial } = await this.supabase
                  .from('packaging_materials')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                if (!packagingMaterial) {
                  toast('لم يتم العثور على مادة التعبئة');
                  return false;
                }
                
                if (packagingMaterial.quantity < Number(item.quantity)) {
                  toast('لا يمكن إلغاء المرتجع بسبب عدم كفاية كمية مادة التعبئة في المخزون');
                  return false;
                }
                
                const newPackagingQuantity = packagingMaterial.quantity - Number(item.quantity);
                await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: newPackagingQuantity });
                break;
              case 'semi_finished_products':
                const { data: semiFinished } = await this.supabase
                  .from('semi_finished_products')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                if (!semiFinished) {
                  toast('لم يتم العثور على المنتج نصف المصنع');
                  return false;
                }
                
                if (semiFinished.quantity < Number(item.quantity)) {
                  toast('لا يمكن إلغاء المرتجع بسبب عدم كفاية كمية المنتج نصف المصنع في المخزون');
                  return false;
                }
                
                const newSemiFinishedQuantity = semiFinished.quantity - Number(item.quantity);
                await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: newSemiFinishedQuantity });
                break;
              case 'finished_products':
                const { data: finishedProduct } = await this.supabase
                  .from('finished_products')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                if (!finishedProduct) {
                  toast('لم يتم العثور على المنتج النهائي');
                  return false;
                }
                
                if (finishedProduct.quantity < Number(item.quantity)) {
                  toast('لا يمكن إلغاء المرتجع بسبب عدم كفاية كمية المنتج النهائي في المخزون');
                  return false;
                }
                
                const newFinishedQuantity = finishedProduct.quantity - Number(item.quantity);
                await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: newFinishedQuantity });
                break;
              default:
                toast('نوع عنصر غير معروف');
                return false;
            }
          } catch (itemError) {
            console.error(`Error processing item ${item.item_id}:`, itemError);
            toast('حدث خطأ أثناء معالجة العناصر');
            return false;
          }
        }
        
        // التأثير على حساب العميل
        if (returnData.party_id) {
          try {
            await this.partyService.updatePartyBalance(
              returnData.party_id,
              returnData.amount,
              true, // مدين لمرتجع المبيعات الملغي (زيادة دين العميل)
              'إلغاء مرتجع مبيعات',
              'cancel_sales_return',
              returnData.id
            );
          } catch (partyError) {
            console.error('Error updating party balance:', partyError);
            toast('حدث خطأ أثناء تحديث حساب العميل');
            return false;
          }
        }
      } else if (returnData.return_type === 'purchase_return') {
        // في حالة مرتجع المشتريات، نقوم بإعادة المنتجات إلى المخزن
        for (const item of returnData.items || []) {
          try {
            switch (item.item_type) {
              case 'raw_materials':
                const { data: rawMaterial } = await this.supabase
                  .from('raw_materials')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                if (!rawMaterial) {
                  toast('لم يتم العثور على المادة الخام');
                  return false;
                }
                
                const newRawQuantity = (rawMaterial.quantity || 0) + Number(item.quantity);
                await this.inventoryService.updateRawMaterial(item.item_id, { quantity: newRawQuantity });
                break;
              case 'packaging_materials':
                const { data: packagingMaterial } = await this.supabase
                  .from('packaging_materials')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                if (!packagingMaterial) {
                  toast('لم يتم العثور على مادة التعبئة');
                  return false;
                }
                
                const newPackagingQuantity = (packagingMaterial.quantity || 0) + Number(item.quantity);
                await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: newPackagingQuantity });
                break;
              case 'semi_finished_products':
                const { data: semiFinished } = await this.supabase
                  .from('semi_finished_products')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                if (!semiFinished) {
                  toast('لم يتم العثور على المنتج نصف المصنع');
                  return false;
                }
                
                const newSemiFinishedQuantity = (semiFinished.quantity || 0) + Number(item.quantity);
                await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: newSemiFinishedQuantity });
                break;
              case 'finished_products':
                const { data: finishedProduct } = await this.supabase
                  .from('finished_products')
                  .select('quantity')
                  .eq('id', item.item_id)
                  .single();
                
                if (!finishedProduct) {
                  toast('لم يتم العثور على المنتج النهائي');
                  return false;
                }
                
                const newFinishedQuantity = (finishedProduct.quantity || 0) + Number(item.quantity);
                await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: newFinishedQuantity });
                break;
              default:
                toast('نوع عنصر غير معروف');
                return false;
            }
          } catch (itemError) {
            console.error(`Error processing item ${item.item_id}:`, itemError);
            toast('حدث خطأ أثناء معالجة العناصر');
            return false;
          }
        }
        
        // التأثير على حساب المورد
        if (returnData.party_id) {
          try {
            await this.partyService.updatePartyBalance(
              returnData.party_id,
              returnData.amount,
              false, // دائن لمرتجع المشتريات الملغي (تخفيض دين المورد)
              'إلغاء مرتجع مشتريات',
              'cancel_purchase_return',
              returnData.id
            );
          } catch (partyError) {
            console.error('Error updating party balance:', partyError);
            toast('حدث خطأ أثناء تحديث حساب المورد');
            return false;
          }
        }
      } else {
        toast('نوع مرتجع غير معروف');
        return false;
      }
      
      // تحديث حالة المرتجع
      const { error: updateError } = await this.supabase
        .from('returns')
        .update({ payment_status: 'cancelled' })
        .eq('id', returnId);
      
      if (updateError) {
        console.error('Error updating return status:', updateError);
        toast('حدث خطأ أثناء تحديث حالة المرتجع');
        return false;
      }
      
      toast('تم إلغاء المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }
}
