
import { supabase } from "@/integrations/supabase/client";
import { Return } from "@/services/CommercialTypes";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import { ReturnEntity } from "./ReturnEntity";
import { toast } from "sonner";

interface InventoryItem {
  id: number;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  name: string;
  code: string;
  [key: string]: any;
}

export class ReturnProcessor {
  private inventoryService: InventoryService;
  private partyService: PartyService;

  constructor() {
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
          // التأكد من وجود المنتج والحصول على الكمية الحالية
          const { data: currentItem, error: itemError } = await this.getItemByTypeAndId(
            item.item_type,
            item.item_id
          );
          
          if (itemError) {
            console.error(`Error fetching item ${item.item_id}:`, itemError);
            toast.error(`حدث خطأ أثناء جلب معلومات ${item.item_name}`);
            return false;
          }
          
          if (!currentItem) {
            toast.error(`لم يتم العثور على ${item.item_name} في المخزون`);
            return false;
          }
          
          // زيادة المخزون
          const newQuantity = Number(currentItem.quantity) + Number(item.quantity);
          
          // تحديث المخزون
          const { error: updateError } = await this.updateItemQuantity(
            item.item_type,
            item.item_id,
            newQuantity
          );
          
          if (updateError) {
            console.error(`Error updating ${item.item_name} quantity:`, updateError);
            toast.error(`حدث خطأ أثناء تحديث مخزون ${item.item_name}`);
            return false;
          }
          
          // تسجيل حركة المخزون
          await this.recordInventoryMovement(
            item.item_id,
            item.item_type,
            Number(item.quantity),
            newQuantity,
            'in',
            `مرتجع مبيعات - رقم: ${returnId}`
          );
        }
        
        // تحديث السجلات المالية لمرتجعات المبيعات
        if (returnData.party_id) {
          const result = await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false, // دائن لمرتجعات المبيعات (تقليل دين العميل)
            'مرتجع مبيعات',
            'sales_return',
            returnData.id
          );
          
          if (!result) {
            toast.error('حدث خطأ أثناء تحديث حساب العميل');
            return false;
          }
        }
      } else if (returnData.return_type === 'purchase_return') {
        // خفض المخزون لمرتجعات المشتريات
        for (const item of returnData.items || []) {
          // التأكد من وجود المنتج والحصول على الكمية الحالية
          const { data: currentItem, error: itemError } = await this.getItemByTypeAndId(
            item.item_type,
            item.item_id
          );
          
          if (itemError) {
            console.error(`Error fetching item ${item.item_id}:`, itemError);
            toast.error(`حدث خطأ أثناء جلب معلومات ${item.item_name}`);
            return false;
          }
          
          if (!currentItem) {
            toast.error(`لم يتم العثور على ${item.item_name} في المخزون`);
            return false;
          }
          
          // التحقق من وجود كمية كافية للإرجاع
          if (Number(currentItem.quantity) < Number(item.quantity)) {
            toast.error(`كمية ${item.item_name} في المخزون (${currentItem.quantity}) أقل من الكمية المطلوب إرجاعها (${item.quantity})`);
            return false;
          }
          
          // خفض المخزون
          const newQuantity = Number(currentItem.quantity) - Number(item.quantity);
          
          // تحديث المخزون
          const { error: updateError } = await this.updateItemQuantity(
            item.item_type,
            item.item_id,
            newQuantity
          );
          
          if (updateError) {
            console.error(`Error updating ${item.item_name} quantity:`, updateError);
            toast.error(`حدث خطأ أثناء تحديث مخزون ${item.item_name}`);
            return false;
          }
          
          // تسجيل حركة المخزون
          await this.recordInventoryMovement(
            item.item_id,
            item.item_type,
            -Number(item.quantity),
            newQuantity,
            'out',
            `مرتجع مشتريات - رقم: ${returnId}`
          );
        }
        
        // تحديث السجلات المالية لمرتجعات المشتريات
        if (returnData.party_id) {
          const result = await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true, // مدين لمرتجعات المشتريات (زيادة دين المورد)
            'مرتجع مشتريات',
            'purchase_return',
            returnData.id
          );
          
          if (!result) {
            toast.error('حدث خطأ أثناء تحديث حساب المورد');
            return false;
          }
        }
      }
      
      // تحديث حالة المرتجع إلى مؤكد
      const { error } = await supabase
        .from('returns')
        .update({ payment_status: 'confirmed' })
        .eq('id', returnId);
      
      if (error) throw error;
      
      // استخدام setTimeout لتجنب تعليق واجهة المستخدم
      setTimeout(() => {
        toast.success('تم تأكيد المرتجع بنجاح');
      }, 100);
      
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
          // التأكد من وجود المنتج والحصول على الكمية الحالية
          const { data: currentItem, error: itemError } = await this.getItemByTypeAndId(
            item.item_type,
            item.item_id
          );
          
          if (itemError) {
            console.error(`Error fetching item ${item.item_id}:`, itemError);
            toast.error(`حدث خطأ أثناء جلب معلومات ${item.item_name}`);
            return false;
          }
          
          if (!currentItem) {
            toast.error(`لم يتم العثور على ${item.item_name} في المخزون`);
            return false;
          }
          
          // التحقق من وجود كمية كافية للإلغاء
          if (Number(currentItem.quantity) < Number(item.quantity)) {
            toast.error(`كمية ${item.item_name} في المخزون (${currentItem.quantity}) أقل من الكمية المطلوب إلغاء إرجاعها (${item.quantity})`);
            return false;
          }
          
          // خفض المخزون
          const newQuantity = Number(currentItem.quantity) - Number(item.quantity);
          
          // تحديث المخزون
          const { error: updateError } = await this.updateItemQuantity(
            item.item_type,
            item.item_id,
            newQuantity
          );
          
          if (updateError) {
            console.error(`Error updating ${item.item_name} quantity:`, updateError);
            toast.error(`حدث خطأ أثناء تحديث مخزون ${item.item_name}`);
            return false;
          }
          
          // تسجيل حركة المخزون
          await this.recordInventoryMovement(
            item.item_id,
            item.item_type,
            -Number(item.quantity),
            newQuantity,
            'out',
            `إلغاء مرتجع مبيعات - رقم: ${returnId}`
          );
        }
        
        // تحديث السجلات المالية لمرتجعات المبيعات الملغاة
        if (returnData.party_id) {
          const result = await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true, // مدين لإلغاء مرتجعات المبيعات (استعادة دين العميل)
            'إلغاء مرتجع مبيعات',
            'cancel_sales_return',
            returnData.id
          );
          
          if (!result) {
            toast.error('حدث خطأ أثناء تحديث حساب العميل');
            return false;
          }
        }
      } else if (returnData.return_type === 'purchase_return') {
        // زيادة المخزون لمرتجعات المشتريات الملغاة
        for (const item of returnData.items || []) {
          // التأكد من وجود المنتج والحصول على الكمية الحالية
          const { data: currentItem, error: itemError } = await this.getItemByTypeAndId(
            item.item_type,
            item.item_id
          );
          
          if (itemError) {
            console.error(`Error fetching item ${item.item_id}:`, itemError);
            toast.error(`حدث خطأ أثناء جلب معلومات ${item.item_name}`);
            return false;
          }
          
          if (!currentItem) {
            toast.error(`لم يتم العثور على ${item.item_name} في المخزون`);
            return false;
          }
          
          // زيادة المخزون
          const newQuantity = Number(currentItem.quantity) + Number(item.quantity);
          
          // تحديث المخزون
          const { error: updateError } = await this.updateItemQuantity(
            item.item_type,
            item.item_id,
            newQuantity
          );
          
          if (updateError) {
            console.error(`Error updating ${item.item_name} quantity:`, updateError);
            toast.error(`حدث خطأ أثناء تحديث مخزون ${item.item_name}`);
            return false;
          }
          
          // تسجيل حركة المخزون
          await this.recordInventoryMovement(
            item.item_id,
            item.item_type,
            Number(item.quantity),
            newQuantity,
            'in',
            `إلغاء مرتجع مشتريات - رقم: ${returnId}`
          );
        }
        
        // تحديث السجلات المالية لمرتجعات المشتريات الملغاة
        if (returnData.party_id) {
          const result = await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false, // دائن لإلغاء مرتجعات المشتريات (استعادة دين المورد)
            'إلغاء مرتجع مشتريات',
            'cancel_purchase_return',
            returnData.id
          );
          
          if (!result) {
            toast.error('حدث خطأ أثناء تحديث حساب المورد');
            return false;
          }
        }
      }
      
      // تحديث حالة المرتجع إلى ملغى
      const { error } = await supabase
        .from('returns')
        .update({ payment_status: 'cancelled' })
        .eq('id', returnId);
      
      if (error) throw error;
      
      // استخدام setTimeout لتجنب تعليق واجهة المستخدم
      setTimeout(() => {
        toast.success('تم إلغاء المرتجع بنجاح');
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }
  
  /**
   * الحصول على عنصر المخزون حسب النوع والمعرف
   */
  private async getItemByTypeAndId(itemType: string, itemId: string | number) {
    let tableName = '';
    
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
        tableName = 'finished_products';
        break;
      default:
        return { data: null, error: new Error('نوع المنتج غير معروف') };
    }
    
    // Use type assertion to avoid TS error with dynamic table names
    return await supabase
      .from(tableName as any)
      .select('*')
      .eq('id', itemId)
      .single();
  }
  
  /**
   * تحديث كمية العنصر في المخزون
   */
  private async updateItemQuantity(itemType: string, itemId: string | number, newQuantity: number) {
    let tableName = '';
    
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
        tableName = 'finished_products';
        break;
      default:
        return { error: new Error('نوع المنتج غير معروف') };
    }
    
    // Use type assertion to avoid TS error with dynamic table names
    return await supabase
      .from(tableName as any)
      .update({ quantity: newQuantity })
      .eq('id', itemId);
  }
  
  /**
   * تسجيل حركة مخزون
   */
  private async recordInventoryMovement(
    itemId: string | number, 
    itemType: string, 
    quantity: number, 
    balanceAfter: number, 
    movementType: 'in' | 'out' | 'adjustment', 
    reason: string
  ) {
    try {
      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          item_id: itemId.toString(),
          item_type: itemType,
          quantity: quantity,
          balance_after: balanceAfter,
          movement_type: movementType,
          reason: reason
        });
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error recording inventory movement:', error);
      return false;
    }
  }
}
