
import { supabase } from "@/integrations/supabase/client";
import { Return, ReturnItem } from "@/services/CommercialTypes";
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
      console.log(`Starting return confirmation process for return ID: ${returnId}`);
      
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
      
      // If invoice_id is provided, verify items against the invoice
      if (returnData.invoice_id) {
        console.log(`Verifying items against invoice: ${returnData.invoice_id}`);
        const verificationResult = await this.verifyReturnAgainstInvoice(returnData);
        if (!verificationResult.success) {
          toast.error(verificationResult.message);
          return false;
        }
      }
      
      // تحديث المخزون بناءً على نوع المرتجع
      if (returnData.return_type === 'sales_return') {
        console.log('Processing sales return - increasing inventory');
        
        // زيادة المخزون لمرتجعات المبيعات
        for (const item of returnData.items || []) {
          console.log(`Processing item: ${item.item_name}, ID: ${item.item_id}, Type: ${item.item_type}`);
          
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
          console.log(`Updating quantity for ${item.item_name}: ${currentItem.quantity} + ${item.quantity} = ${newQuantity}`);
          
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
          console.log(`Updating financial records for party: ${returnData.party_id}`);
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
        } else {
          console.warn('No party_id found for sales return');
        }
      } else if (returnData.return_type === 'purchase_return') {
        console.log('Processing purchase return - decreasing inventory');
        
        // خفض المخزون لمرتجعات المشتريات
        for (const item of returnData.items || []) {
          console.log(`Processing item: ${item.item_name}, ID: ${item.item_id}, Type: ${item.item_type}`);
          
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
          console.log(`Updating quantity for ${item.item_name}: ${currentItem.quantity} - ${item.quantity} = ${newQuantity}`);
          
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
          console.log(`Updating financial records for party: ${returnData.party_id}`);
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
        } else {
          console.warn('No party_id found for purchase return');
        }
      }
      
      // تحديث حالة المرتجع إلى مؤكد
      const { error } = await supabase
        .from('returns')
        .update({ payment_status: 'confirmed' })
        .eq('id', returnId);
      
      if (error) {
        console.error('Error updating return status:', error);
        throw error;
      }
      
      console.log('Return successfully confirmed');
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
      console.log(`Starting return cancellation process for return ID: ${returnId}`);
      
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
        console.log('Cancelling sales return - decreasing inventory');
        
        // خفض المخزون لمرتجعات المبيعات الملغاة
        for (const item of returnData.items || []) {
          console.log(`Processing item: ${item.item_name}, ID: ${item.item_id}, Type: ${item.item_type}`);
          
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
          console.log(`Updating quantity for ${item.item_name}: ${currentItem.quantity} - ${item.quantity} = ${newQuantity}`);
          
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
          console.log(`Updating financial records for party: ${returnData.party_id}`);
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
        } else {
          console.warn('No party_id found for sales return cancellation');
        }
      } else if (returnData.return_type === 'purchase_return') {
        console.log('Cancelling purchase return - increasing inventory');
        
        // زيادة المخزون لمرتجعات المشتريات الملغاة
        for (const item of returnData.items || []) {
          console.log(`Processing item: ${item.item_name}, ID: ${item.item_id}, Type: ${item.item_type}`);
          
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
          console.log(`Updating quantity for ${item.item_name}: ${currentItem.quantity} + ${item.quantity} = ${newQuantity}`);
          
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
          console.log(`Updating financial records for party: ${returnData.party_id}`);
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
        } else {
          console.warn('No party_id found for purchase return cancellation');
        }
      }
      
      // تحديث حالة المرتجع إلى ملغى
      const { error } = await supabase
        .from('returns')
        .update({ payment_status: 'cancelled' })
        .eq('id', returnId);
      
      if (error) {
        console.error('Error updating return status:', error);
        throw error;
      }
      
      console.log('Return successfully cancelled');
      toast.success('تم إلغاء المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }

  /**
   * التحقق من أن المرتجع يتناسب مع الفاتورة المرتبطة به
   */
  private async verifyReturnAgainstInvoice(returnData: Return): Promise<{success: boolean, message: string}> {
    try {
      // Get the invoice
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('id', returnData.invoice_id)
        .single();
        
      if (error) {
        console.error('Error fetching invoice:', error);
        return { success: false, message: 'لم يتم العثور على الفاتورة المرتبطة' };
      }
      
      // Check if invoice type matches return type
      if (
        (returnData.return_type === 'sales_return' && invoice.invoice_type !== 'sale') ||
        (returnData.return_type === 'purchase_return' && invoice.invoice_type !== 'purchase')
      ) {
        return { 
          success: false, 
          message: 'نوع الفاتورة لا يتناسب مع نوع المرتجع' 
        };
      }
      
      // Check if party matches
      if (returnData.party_id && invoice.party_id && returnData.party_id !== invoice.party_id) {
        return { 
          success: false, 
          message: 'العميل/المورد في المرتجع لا يتطابق مع العميل/المورد في الفاتورة' 
        };
      }
      
      // If the return doesn't have a party_id but the invoice does, set it
      if (!returnData.party_id && invoice.party_id) {
        const { error: updateError } = await supabase
          .from('returns')
          .update({ party_id: invoice.party_id })
          .eq('id', returnData.id);
          
        if (updateError) {
          console.error('Error updating return party_id:', updateError);
        } else {
          console.log(`Updated return party_id to ${invoice.party_id}`);
        }
      }
      
      // Check if all return items exist in the invoice
      const invoiceItems = invoice.invoice_items || [];
      
      for (const returnItem of returnData.items || []) {
        const matchingInvoiceItem = invoiceItems.find(
          invItem => 
            invItem.item_id.toString() === returnItem.item_id.toString() && 
            invItem.item_type === returnItem.item_type
        );
        
        if (!matchingInvoiceItem) {
          return { 
            success: false, 
            message: `العنصر ${returnItem.item_name} غير موجود في الفاتورة الأصلية` 
          };
        }
        
        // Check if return quantity is not more than invoice quantity
        if (Number(returnItem.quantity) > Number(matchingInvoiceItem.quantity)) {
          return { 
            success: false, 
            message: `كمية ${returnItem.item_name} (${returnItem.quantity}) أكبر من الكمية في الفاتورة الأصلية (${matchingInvoiceItem.quantity})` 
          };
        }
      }
      
      return { success: true, message: 'تم التحقق من المرتجع مقابل الفاتورة بنجاح' };
    } catch (error) {
      console.error('Error verifying return against invoice:', error);
      return { success: false, message: 'حدث خطأ أثناء التحقق من بيانات المرتجع' };
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
    
    // Type assertion to handle dynamic table selection
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
    
    // Type assertion to handle dynamic table selection
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
      console.log(`Recording inventory movement: ${itemType}/${itemId}, quantity: ${quantity}, type: ${movementType}`);
      
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
      
      if (error) {
        console.error('Error recording inventory movement:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error recording inventory movement:', error);
      return false;
    }
  }
}
