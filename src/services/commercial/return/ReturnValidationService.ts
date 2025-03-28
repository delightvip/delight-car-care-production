
import { toast } from "sonner";
import { Return, ReturnItem, ReturnFormValues } from "@/types/returns";
import { supabase } from "@/integrations/supabase/client";

/**
 * خدمة التحقق من صحة بيانات المرتجعات
 */
export class ReturnValidationService {
  /**
   * التحقق من صحة بيانات نموذج المرتجع
   */
  public async validateReturnForm(formData: ReturnFormValues): Promise<{ valid: boolean; message?: string }> {
    try {
      // التحقق من بيانات الفاتورة
      if (!formData.invoice_id) {
        return { valid: false, message: "يجب اختيار فاتورة مرتبطة بالمرتجع" };
      }

      // التحقق من وجود أصناف محددة
      const selectedItems = formData.items.filter(item => item.selected && item.quantity > 0);
      if (selectedItems.length === 0) {
        return { valid: false, message: "يجب اختيار صنف واحد على الأقل وتحديد كمية له" };
      }

      // التحقق من صحة الكميات المرتجعة
      for (const item of selectedItems) {
        if (item.quantity > item.max_quantity) {
          return { 
            valid: false, 
            message: `الكمية المرتجعة للصنف ${item.item_name} تتجاوز الكمية المسموح بها (${item.max_quantity})` 
          };
        }
      }

      // التحقق من وجود الفاتورة
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id')
        .eq('id', formData.invoice_id)
        .single();

      if (invoiceError || !invoice) {
        return { valid: false, message: "الفاتورة المحددة غير موجودة" };
      }

      return { valid: true };
    } catch (error) {
      console.error("Error validating return form:", error);
      return { valid: false, message: "حدث خطأ أثناء التحقق من صحة البيانات" };
    }
  }

  /**
   * التحقق من المرتجع قبل التأكيد
   */
  public async validateBeforeConfirm(returnId: string): Promise<{ valid: boolean; message?: string }> {
    try {
      // جلب بيانات المرتجع
      const { data: returnData, error } = await supabase
        .from('returns')
        .select(`
          *,
          return_items:id (*)
        `)
        .eq('id', returnId)
        .single();

      if (error || !returnData) {
        return { valid: false, message: "لم يتم العثور على المرتجع" };
      }

      // التحقق من حالة المرتجع
      if (returnData.payment_status !== 'draft') {
        return { 
          valid: false, 
          message: `لا يمكن تأكيد المرتجع لأن حالته الحالية ${returnData.payment_status}` 
        };
      }

      // التحقق من وجود أصناف
      if (!returnData.return_items || returnData.return_items.length === 0) {
        return { valid: false, message: "لا توجد أصناف في المرتجع" };
      }

      // التحقق من توفر الكميات في المخزون في حالة مرتجع المشتريات
      if (returnData.return_type === 'purchase_return') {
        for (const item of returnData.return_items) {
          // جلب الكمية المتوفرة في المخزون
          const { data: inventoryItem, error: inventoryError } = await this.getInventoryItemQuantity(
            item.item_type,
            item.item_id
          );

          if (inventoryError || !inventoryItem) {
            return { 
              valid: false, 
              message: `الصنف ${item.item_name} غير موجود في المخزون` 
            };
          }

          if (inventoryItem.quantity < item.quantity) {
            return { 
              valid: false, 
              message: `الكمية المتوفرة من الصنف ${item.item_name} (${inventoryItem.quantity}) أقل من الكمية المطلوبة للإرجاع (${item.quantity})` 
            };
          }
        }
      }

      return { valid: true };
    } catch (error) {
      console.error("Error validating return before confirm:", error);
      return { valid: false, message: "حدث خطأ أثناء التحقق من صحة المرتجع" };
    }
  }

  /**
   * التحقق من المرتجع قبل الإلغاء
   */
  public async validateBeforeCancel(returnId: string): Promise<{ valid: boolean; message?: string }> {
    try {
      // جلب بيانات المرتجع
      const { data: returnData, error } = await supabase
        .from('returns')
        .select('payment_status')
        .eq('id', returnId)
        .single();

      if (error || !returnData) {
        return { valid: false, message: "لم يتم العثور على المرتجع" };
      }

      // التحقق من حالة المرتجع
      if (returnData.payment_status !== 'confirmed') {
        return { 
          valid: false, 
          message: "يمكن إلغاء المرتجعات المؤكدة فقط" 
        };
      }

      return { valid: true };
    } catch (error) {
      console.error("Error validating return before cancel:", error);
      return { valid: false, message: "حدث خطأ أثناء التحقق من صحة المرتجع" };
    }
  }

  /**
   * التحقق من المرتجع قبل الحذف
   */
  public async validateBeforeDelete(returnId: string): Promise<{ valid: boolean; message?: string }> {
    try {
      // جلب بيانات المرتجع
      const { data: returnData, error } = await supabase
        .from('returns')
        .select('payment_status')
        .eq('id', returnId)
        .single();

      if (error || !returnData) {
        return { valid: false, message: "لم يتم العثور على المرتجع" };
      }

      // التحقق من حالة المرتجع
      if (returnData.payment_status !== 'draft') {
        return { 
          valid: false, 
          message: "يمكن حذف المرتجعات في حالة المسودة فقط" 
        };
      }

      return { valid: true };
    } catch (error) {
      console.error("Error validating return before delete:", error);
      return { valid: false, message: "حدث خطأ أثناء التحقق من صحة المرتجع" };
    }
  }

  /**
   * الحصول على كمية الصنف في المخزون
   * @private
   */
  private async getInventoryItemQuantity(
    itemType: string, 
    itemId: number
  ): Promise<{ data?: { quantity: number }; error?: Error }> {
    try {
      let table = '';
      
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
          return { error: new Error(`Invalid item type: ${itemType}`) };
      }
      
      const { data, error } = await supabase
        .from(table)
        .select('quantity')
        .eq('id', itemId)
        .single();
        
      if (error) {
        return { error };
      }
      
      return { data };
    } catch (error) {
      console.error(`Error getting inventory item quantity:`, error);
      return { error: error as Error };
    }
  }
}

export default new ReturnValidationService();
