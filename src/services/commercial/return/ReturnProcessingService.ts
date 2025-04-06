
import { toast } from "sonner";
import { Return } from "@/types/returns";
import FinancialCommercialBridge from "@/services/financial/FinancialCommercialBridge";
import ReturnDataService from "./ReturnDataService";
import ReturnInventoryService from "./ReturnInventoryService";
import ReturnValidationService from "./ReturnValidationService";

/**
 * خدمة معالجة المرتجعات
 * مسؤولة عن عمليات تأكيد وإلغاء المرتجعات وتحديث المخزون والحسابات
 */
export class ReturnProcessingService {
  private financialBridge: FinancialCommercialBridge;
  private returnDataService: ReturnDataService;
  private returnInventoryService: ReturnInventoryService;
  private returnValidationService: ReturnValidationService;
  
  constructor() {
    this.financialBridge = FinancialCommercialBridge.getInstance();
    this.returnDataService = new ReturnDataService();
    this.returnInventoryService = new ReturnInventoryService();
    this.returnValidationService = new ReturnValidationService();
  }

  /**
   * تأكيد مرتجع (تحديث المخزون والحسابات)
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      // 1. التحقق من صحة المرتجع قبل التأكيد
      const validationResult = await this.returnValidationService.validateBeforeConfirm(returnId);
      if (!validationResult.valid) {
        toast.error(validationResult.message || 'فشل التحقق من صحة المرتجع');
        return false;
      }

      // 2. جلب بيانات المرتجع كاملة
      const returnData = await this.returnDataService.getReturnById(returnId);
      
      if (!returnData || !returnData.items || returnData.items.length === 0) {
        toast.error('لا توجد بيانات كافية لتأكيد المرتجع');
        return false;
      }

      console.log("Confirming return with data:", returnData);

      // 3. تحديث حالة المرتجع إلى مؤكد
      await this.returnDataService.updateReturnStatus(returnId, 'confirmed');

      // 4. تحديث المخزون بناءً على نوع المرتجع
      try {
        await this.updateInventory(returnData, 'confirm');
      } catch (error) {
        // في حالة حدوث خطأ، نعيد حالة المرتجع إلى مسودة
        await this.returnDataService.updateReturnStatus(returnId, 'draft');
        throw error;
      }

      // 5. تسجيل المعاملة المالية المقابلة
      try {
        await this.recordFinancialTransaction(returnData, 'confirm');
      } catch (error) {
        // في حالة حدوث خطأ، نحاول عكس تأثير المخزون ونعيد حالة المرتجع إلى مسودة
        await this.updateInventory(returnData, 'reverse_confirm');
        await this.returnDataService.updateReturnStatus(returnId, 'draft');
        throw error;
      }

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
      // 1. التحقق من صحة المرتجع قبل الإلغاء
      const validationResult = await this.returnValidationService.validateBeforeCancel(returnId);
      if (!validationResult.valid) {
        toast.error(validationResult.message || 'فشل التحقق من صحة المرتجع');
        return false;
      }

      // 2. جلب بيانات المرتجع كاملة
      const returnData = await this.returnDataService.getReturnById(returnId);
      
      if (!returnData) {
        toast.error('لا توجد بيانات كافية لإلغاء المرتجع');
        return false;
      }

      console.log("Cancelling return with data:", returnData);

      // 3. تحديث حالة المرتجع إلى ملغي
      await this.returnDataService.updateReturnStatus(returnId, 'cancelled');

      // 4. عكس تأثير المرتجع على المخزون
      try {
        await this.updateInventory(returnData, 'cancel');
      } catch (error) {
        // في حالة حدوث خطأ، نعيد حالة المرتجع إلى مؤكد
        await this.returnDataService.updateReturnStatus(returnId, 'confirmed');
        throw error;
      }

      // 5. عكس المعاملة المالية
      try {
        await this.recordFinancialTransaction(returnData, 'cancel');
      } catch (error) {
        // في حالة حدوث خطأ، نحاول عكس تأثير المخزون ونعيد حالة المرتجع إلى مؤكد
        await this.updateInventory(returnData, 'reverse_cancel');
        await this.returnDataService.updateReturnStatus(returnId, 'confirmed');
        throw error;
      }

      toast.success('تم إلغاء المرتجع وعكس تأثيره على المخزون والحسابات');
      return true;
    } catch (error) {
      console.error(`Error cancelling return ${returnId}:`, error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }

  /**
   * تحديث المخزون بناءً على نوع المرتجع والعملية
   * @private
   */
  private async updateInventory(returnData: Return, action: 'confirm' | 'cancel' | 'reverse_confirm' | 'reverse_cancel'): Promise<void> {
    if (!returnData.items || returnData.items.length === 0) {
      console.log("No items to update inventory");
      return;
    }

    console.log(`Processing ${returnData.items.length} items for inventory update`, returnData.items);

    for (const item of returnData.items) {
      // تحديد نوع العملية بناءً على نوع المرتجع والعملية المطلوبة
      let shouldIncrease = false;

      if (returnData.return_type === 'sales_return') {
        // مرتجع مبيعات: عند التأكيد نزيد المخزون، عند الإلغاء ننقص المخزون
        if (action === 'confirm' || action === 'reverse_cancel') {
          shouldIncrease = true;
        }
      } else {
        // مرتجع مشتريات: عند التأكيد ننقص المخزون، عند الإلغاء نزيد المخزون
        if (action === 'cancel' || action === 'reverse_confirm') {
          shouldIncrease = true;
        }
      }

      // تأكد من أن item_id هو رقم
      const itemId = Number(item.item_id);
      // تأكد من أن الكمية هي رقم إيجابي
      const quantity = Math.max(0, Number(item.quantity));

      if (isNaN(itemId) || itemId <= 0) {
        console.error(`Invalid item_id: ${item.item_id}, skipping inventory update`);
        continue;
      }

      if (isNaN(quantity) || quantity <= 0) {
        console.error(`Invalid quantity: ${item.quantity}, skipping inventory update`);
        continue;
      }

      console.log(`${shouldIncrease ? 'Increasing' : 'Decreasing'} inventory for item ${itemId} (${item.item_type}) by ${quantity}`);
      
      try {
        if (shouldIncrease) {
          const result = await this.returnInventoryService.increaseItemQuantity(
            item.item_type,
            itemId,
            quantity
          );
          console.log(`Inventory increase result: ${result ? 'Success' : 'Failed'}`);
        } else {
          const result = await this.returnInventoryService.decreaseItemQuantity(
            item.item_type,
            itemId,
            quantity
          );
          console.log(`Inventory decrease result: ${result ? 'Success' : 'Failed'}`);
        }
      } catch (error) {
        console.error(`Error updating inventory for item ${itemId}:`, error);
        throw new Error(`فشل تحديث المخزون للصنف: ${item.item_name}`);
      }
    }
  }

  /**
   * تسجيل المعاملة المالية
   * @private
   */
  private async recordFinancialTransaction(returnData: Return, action: 'confirm' | 'cancel'): Promise<void> {
    // 1. إعداد بيانات المعاملة المالية
    const note = returnData.return_type === 'sales_return' 
      ? `مرتجع مبيعات من ${returnData.party_name || ''}` 
      : `مرتجع مشتريات إلى ${returnData.party_name || ''}`;

    // 2. تحديد نوع المعاملة بناءً على الإجراء
    const transactionData = (action === 'confirm')
      ? {
          id: returnData.id,
          return_type: returnData.return_type,
          amount: returnData.amount,
          date: returnData.date,
          party_id: returnData.party_id,
          party_name: returnData.party_name,
          invoice_id: returnData.invoice_id,
          notes: note
        }
      : {
          id: returnData.id,
          return_type: returnData.return_type,
          amount: returnData.amount,
          date: returnData.date,
          party_id: returnData.party_id,
          party_name: returnData.party_name
        };

    // 3. استخدام جسر الربط المالي
    if (action === 'confirm') {
      await this.financialBridge.handleReturnConfirmation(transactionData);
    } else {
      await this.financialBridge.handleReturnCancellation(transactionData);
    }
  }
}

export default ReturnProcessingService;
