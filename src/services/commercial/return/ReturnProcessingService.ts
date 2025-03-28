
import { toast } from "sonner";
import { Return } from "@/types/returns";
import FinancialCommercialBridge from "@/services/financial/FinancialCommercialBridge";
import returnDataService from "./ReturnDataService";
import returnInventoryService from "./ReturnInventoryService";
import ReturnService from "./ReturnService";

/**
 * خدمة معالجة المرتجعات
 * مسؤولة عن عمليات تأكيد وإلغاء المرتجعات وتحديث المخزون والحسابات
 */
export class ReturnProcessingService {
  private financialBridge: FinancialCommercialBridge;
  
  constructor() {
    this.financialBridge = FinancialCommercialBridge.getInstance();
  }

  /**
   * تأكيد مرتجع (تحديث المخزون والحسابات)
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      // 1. جلب بيانات المرتجع كاملة
      const returnData = await returnDataService.fetchReturnById(returnId);
      
      if (!returnData || !returnData.items || returnData.items.length === 0) {
        toast.error('لا توجد بيانات كافية لتأكيد المرتجع');
        return false;
      }

      console.log("Confirming return with data:", returnData);

      // 2. تحديث حالة المرتجع إلى مؤكد
      await returnDataService.updateReturnStatus(returnId, 'confirmed');

      // 3. تحديث المخزون بناءً على نوع المرتجع
      for (const item of returnData.items) {
        if (returnData.return_type === 'sales_return') {
          // مرتجع مبيعات: إضافة الكميات للمخزون (العميل أعاد البضاعة)
          console.log(`Increasing inventory for item ${item.item_id} (${item.item_type}) by ${item.quantity}`);
          await returnInventoryService.increaseItemQuantity(
            item.item_type,
            item.item_id,
            item.quantity
          );
        } else {
          // مرتجع مشتريات: خصم الكميات من المخزون (إعادة بضاعة للمورد)
          console.log(`Decreasing inventory for item ${item.item_id} (${item.item_type}) by ${item.quantity}`);
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
      const returnData = await returnDataService.fetchReturnById(returnId);
      
      if (!returnData) {
        toast.error('لا توجد بيانات كافية لإلغاء المرتجع');
        return false;
      }

      console.log("Cancelling return with data:", returnData);

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
            console.log(`Decreasing inventory for item ${item.item_id} (${item.item_type}) by ${item.quantity}`);
            await returnInventoryService.decreaseItemQuantity(
              item.item_type,
              item.item_id,
              item.quantity
            );
          } else {
            // إلغاء مرتجع مشتريات: إضافة الكميات للمخزون (عكس الخصم السابق)
            console.log(`Increasing inventory for item ${item.item_id} (${item.item_type}) by ${item.quantity}`);
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
}
