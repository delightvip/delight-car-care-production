
import { supabase } from "@/integrations/supabase/client";

/**
 * خدمة التحقق من صحة المرتجعات
 * مسؤولة عن التحقق من صحة عمليات المرتجعات قبل تنفيذها
 */
export class ReturnValidationService {
  /**
   * التحقق من صحة المرتجع قبل التأكيد
   */
  public async validateBeforeConfirm(returnId: string): Promise<{ valid: boolean; message?: string }> {
    try {
      // التحقق من وجود المرتجع
      const { data: returnData, error } = await supabase
        .from('returns')
        .select('payment_status, amount')
        .eq('id', returnId)
        .single();
      
      if (error) {
        return { valid: false, message: 'لم يتم العثور على المرتجع' };
      }
      
      // التحقق من حالة المرتجع
      if (returnData.payment_status !== 'draft') {
        return { valid: false, message: 'لا يمكن تأكيد المرتجع إلا إذا كان في حالة مسودة' };
      }
      
      // التحقق من قيمة المرتجع
      if (!returnData.amount || returnData.amount <= 0) {
        return { valid: false, message: 'قيمة المرتجع يجب أن تكون أكبر من صفر' };
      }
      
      // التحقق من وجود بنود للمرتجع
      const { data: items, error: itemsError } = await supabase
        .from('return_items')
        .select('id')
        .eq('return_id', returnId);
      
      if (itemsError) {
        return { valid: false, message: 'حدث خطأ أثناء التحقق من بنود المرتجع' };
      }
      
      if (!items || items.length === 0) {
        return { valid: false, message: 'لا يمكن تأكيد مرتجع بدون بنود' };
      }
      
      return { valid: true };
    } catch (error) {
      console.error(`Error validating return ${returnId} before confirmation:`, error);
      return { valid: false, message: 'حدث خطأ أثناء التحقق من صحة المرتجع' };
    }
  }
  
  /**
   * التحقق من صحة إلغاء المرتجع
   */
  public async validateBeforeCancel(returnId: string): Promise<{ valid: boolean; message?: string }> {
    try {
      // التحقق من وجود المرتجع
      const { data: returnData, error } = await supabase
        .from('returns')
        .select('payment_status')
        .eq('id', returnId)
        .single();
      
      if (error) {
        return { valid: false, message: 'لم يتم العثور على المرتجع' };
      }
      
      // التحقق من حالة المرتجع
      if (returnData.payment_status !== 'confirmed') {
        return { valid: false, message: 'لا يمكن إلغاء المرتجع إلا إذا كان في حالة مؤكد' };
      }
      
      return { valid: true };
    } catch (error) {
      console.error(`Error validating return ${returnId} before cancellation:`, error);
      return { valid: false, message: 'حدث خطأ أثناء التحقق من صحة إلغاء المرتجع' };
    }
  }
}

export default ReturnValidationService;
