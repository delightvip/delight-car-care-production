
import { toast } from "sonner";
import { Return } from "@/types/returns";
import { format } from "date-fns";
import FinancialCommercialBridge from "@/services/financial/FinancialCommercialBridge";
import returnDataService from "./ReturnDataService";
import returnInventoryService from "./ReturnInventoryService";

/**
 * خدمة إدارة المرتجعات
 * تتيح عمليات الإنشاء والتعديل والحذف للمرتجعات مع المحافظة على تحديث المخزون والدفاتر المالية
 */
class ReturnService {
  private static instance: ReturnService;
  private financialBridge: FinancialCommercialBridge;

  private constructor() {
    this.financialBridge = FinancialCommercialBridge.getInstance();
  }

  public static getInstance(): ReturnService {
    if (!ReturnService.instance) {
      ReturnService.instance = new ReturnService();
    }
    return ReturnService.instance;
  }

  /**
   * جلب جميع المرتجعات
   */
  public async getReturns(): Promise<Return[]> {
    return await returnDataService.fetchAllReturns();
  }

  /**
   * جلب مرتجع محدد بواسطة المعرف
   */
  public async getReturnById(id: string): Promise<Return | null> {
    return await returnDataService.fetchReturnById(id);
  }

  /**
   * إنشاء مرتجع جديد
   */
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      // التأكد من تنسيق التاريخ بشكل صحيح
      const formattedDate = typeof returnData.date === 'object' 
        ? format(new Date(returnData.date as any), 'yyyy-MM-dd')
        : returnData.date;

      const returnWithFormattedDate = {
        ...returnData,
        date: formattedDate
      };
      
      const result = await returnDataService.createReturn(returnWithFormattedDate);
      toast.success('تم إنشاء المرتجع بنجاح');
      return result;
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء إنشاء المرتجع');
      return null;
    }
  }

  /**
   * تحديث مرتجع موجود
   */
  public async updateReturn(id: string, returnData: Partial<Return>): Promise<boolean> {
    try {
      // تنسيق التاريخ إذا كان موجودًا
      let formattedData = { ...returnData };
      if (returnData.date && typeof returnData.date === 'object') {
        formattedData.date = format(new Date(returnData.date as any), 'yyyy-MM-dd');
      }
      
      const success = await returnDataService.updateReturn(id, formattedData);
      toast.success('تم تحديث المرتجع بنجاح');
      return success;
    } catch (error) {
      console.error('Error updating return:', error);
      toast.error('حدث خطأ أثناء تحديث المرتجع');
      return false;
    }
  }

  /**
   * تأكيد مرتجع (تحديث المخزون والحسابات)
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      // 1. جلب بيانات المرتجع كاملة
      const returnData = await this.getReturnById(returnId);
      
      if (!returnData || !returnData.items || returnData.items.length === 0) {
        toast.error('لا توجد بيانات كافية لتأكيد المرتجع');
        return false;
      }

      // 2. تحديث حالة المرتجع إلى مؤكد
      await returnDataService.updateReturnStatus(returnId, 'confirmed');

      // 3. تحديث المخزون بناءً على نوع المرتجع
      for (const item of returnData.items) {
        if (returnData.return_type === 'sales_return') {
          // مرتجع مبيعات: إضافة الكميات للمخزون (العميل أعاد البضاعة)
          await returnInventoryService.increaseItemQuantity(
            item.item_type,
            item.item_id,
            item.quantity
          );
        } else {
          // مرتجع مشتريات: خصم الكميات من المخزون (إعادة بضاعة للمورد)
          await returnInventoryService.decreaseItemQuantity(
            item.item_type,
            item.item_id,
            item.quantity
          );
        }
      }

      // 4. تسجيل المعاملة المالية المقابلة
      const note = returnData.return_type === 'sales_return' 
        ? `مرتجع مبيعات من ${returnData.party_name || ''}` 
        : `مرتجع مشتريات إلى ${returnData.party_name || ''}`;

      // استخدام جسر الربط المالي
      await this.financialBridge.handleReturnConfirmation({
        id: returnId,
        return_type: returnData.return_type,
        amount: returnData.amount,
        date: returnData.date,
        party_id: returnData.party_id,
        party_name: returnData.party_name,
        invoice_id: returnData.invoice_id,
        notes: note
      });

      toast.success('تم تأكيد المرتجع وتحديث المخزون والحسابات');
      return true;
    } catch (error) {
      console.error(`Error confirming return ${returnId}:`, error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }

  /**
   * إلغاء مرتجع (عكس تأثيره على المخزون والحسابات)
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      // 1. جلب بيانات المرتجع كاملة
      const returnData = await this.getReturnById(returnId);
      
      if (!returnData) {
        toast.error('لا توجد بيانات كافية لإلغاء المرتجع');
        return false;
      }

      // 2. التحقق من أن المرتجع مؤكد وليس ملغي بالفعل
      if (returnData.payment_status !== 'confirmed') {
        toast.error('لا يمكن إلغاء مرتجع غير مؤكد');
        return false;
      }

      // 3. تحديث حالة المرتجع إلى ملغي
      await returnDataService.updateReturnStatus(returnId, 'cancelled');

      // 4. عكس تأثير المرتجع على المخزون
      if (returnData.items && returnData.items.length > 0) {
        for (const item of returnData.items) {
          if (returnData.return_type === 'sales_return') {
            // إلغاء مرتجع مبيعات: خصم الكميات من المخزون (عكس الإضافة السابقة)
            await returnInventoryService.decreaseItemQuantity(
              item.item_type,
              item.item_id,
              item.quantity
            );
          } else {
            // إلغاء مرتجع مشتريات: إضافة الكميات للمخزون (عكس الخصم السابق)
            await returnInventoryService.increaseItemQuantity(
              item.item_type,
              item.item_id,
              item.quantity
            );
          }
        }
      }

      // 5. عكس المعاملة المالية
      await this.financialBridge.handleReturnCancellation({
        id: returnId,
        return_type: returnData.return_type,
        amount: returnData.amount,
        date: returnData.date,
        party_id: returnData.party_id,
        party_name: returnData.party_name
      });

      toast.success('تم إلغاء المرتجع وعكس تأثيره على المخزون والحسابات');
      return true;
    } catch (error) {
      console.error(`Error cancelling return ${returnId}:`, error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }

  /**
   * حذف مرتجع
   */
  public async deleteReturn(id: string): Promise<boolean> {
    try {
      // 1. التحقق من حالة المرتجع
      const returnData = await this.getReturnById(id);
      
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }

      // 2. لا يمكن حذف مرتجع مؤكد، يجب إلغاؤه أولاً
      if (returnData.payment_status === 'confirmed') {
        toast.error('لا يمكن حذف مرتجع مؤكد. يرجى إلغائه أولاً ثم حذفه');
        return false;
      }

      // 3. حذف المرتجع وأصنافه
      const success = await returnDataService.deleteReturn(id);
      toast.success('تم حذف المرتجع بنجاح');
      return success;
    } catch (error) {
      console.error(`Error deleting return ${id}:`, error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
      return false;
    }
  }

  /**
   * جلب المرتجعات حسب الطرف
   */
  public async getReturnsByParty(partyId: string): Promise<Return[]> {
    return await returnDataService.fetchReturnsByParty(partyId);
  }

  /**
   * جلب المرتجعات حسب الفاتورة
   */
  public async getReturnsByInvoice(invoiceId: string): Promise<Return[]> {
    return await returnDataService.fetchReturnsByInvoice(invoiceId);
  }
}

export default ReturnService;
