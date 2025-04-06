
import { toast } from "sonner";
import { Return } from "@/types/returns";
import ReturnDataService from "./ReturnDataService";
import ReturnInventoryService from "./ReturnInventoryService";
import ReturnValidationService from "./ReturnValidationService";
import FinancialCommercialBridge from "@/services/financial/FinancialCommercialBridge";

/**
 * معالج المرتجعات
 * مسؤول عن عمليات تأكيد وإلغاء وحذف المرتجعات
 */
export class ReturnProcessor {
  private returnDataService: ReturnDataService;
  private returnInventoryService: ReturnInventoryService;
  private returnValidationService: ReturnValidationService;
  private financialBridge: FinancialCommercialBridge;
  
  constructor() {
    this.returnDataService = new ReturnDataService();
    this.returnInventoryService = new ReturnInventoryService();
    this.returnValidationService = new ReturnValidationService();
    this.financialBridge = FinancialCommercialBridge.getInstance();
  }
  
  /**
   * تأكيد مرتجع وتطبيق التأثيرات المرتبطة
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      // 1. التحقق من صحة المرتجع
      const validationResult = await this.returnValidationService.validateBeforeConfirm(returnId);
      if (!validationResult.valid) {
        toast.error(validationResult.message || 'فشل التحقق من صحة المرتجع');
        return false;
      }
      
      // 2. جلب بيانات المرتجع
      const returnData = await this.returnDataService.getReturnById(returnId);
      
      if (!returnData || !returnData.items || returnData.items.length === 0) {
        toast.error('لا توجد بيانات كافية لتأكيد المرتجع');
        return false;
      }
      
      // 3. تحديث حالة المرتجع إلى مؤكد
      await this.returnDataService.updateReturnStatus(returnId, 'confirmed');
      
      // 4. تحديث المخزون
      await this.updateInventory(returnData, 'confirm');
      
      // 5. تسجيل التأثيرات المالية
      await this.financialBridge.handleReturnConfirmation(returnData);
      
      toast.success('تم تأكيد المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error(`Error confirming return ${returnId}:`, error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      
      // محاولة التراجع إذا حدث خطأ
      try {
        await this.returnDataService.updateReturnStatus(returnId, 'draft');
      } catch (err) {
        console.error('Error reverting return status:', err);
      }
      
      return false;
    }
  }
  
  /**
   * إلغاء مرتجع وعكس تأثيراته
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      // 1. التحقق من صحة الإلغاء
      const validationResult = await this.returnValidationService.validateBeforeCancel(returnId);
      if (!validationResult.valid) {
        toast.error(validationResult.message || 'فشل التحقق من صحة إلغاء المرتجع');
        return false;
      }
      
      // 2. جلب بيانات المرتجع
      const returnData = await this.returnDataService.getReturnById(returnId);
      
      if (!returnData) {
        toast.error('لا توجد بيانات كافية لإلغاء المرتجع');
        return false;
      }
      
      // 3. تحديث حالة المرتجع إلى ملغي
      await this.returnDataService.updateReturnStatus(returnId, 'cancelled');
      
      // 4. عكس تأثيرات المخزون
      if (returnData.items && returnData.items.length > 0) {
        await this.updateInventory(returnData, 'cancel');
      }
      
      // 5. إلغاء التأثيرات المالية
      await this.financialBridge.handleReturnCancellation(returnData);
      
      toast.success('تم إلغاء المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error(`Error cancelling return ${returnId}:`, error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      
      // محاولة التراجع إذا حدث خطأ
      try {
        await this.returnDataService.updateReturnStatus(returnId, 'confirmed');
      } catch (err) {
        console.error('Error reverting return status:', err);
      }
      
      return false;
    }
  }
  
  /**
   * حذف مرتجع (فقط إذا كان مسودة)
   */
  public async deleteReturn(returnId: string): Promise<boolean> {
    try {
      // التحقق من حالة المرتجع
      const returnData = await this.returnDataService.getReturnById(returnId);
      
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status !== 'draft') {
        toast.error('لا يمكن حذف المرتجع إلا إذا كان في حالة مسودة');
        return false;
      }
      
      // حذف بنود المرتجع أولاً
      await this.returnDataService.deleteReturnItems(returnId);
      
      // حذف المرتجع نفسه
      await this.returnDataService.deleteReturn(returnId);
      
      toast.success('تم حذف المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error(`Error deleting return ${returnId}:`, error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
      return false;
    }
  }
  
  /**
   * تحديث المخزون بناءً على المرتجع
   */
  private async updateInventory(returnData: Return, action: 'confirm' | 'cancel'): Promise<void> {
    if (!returnData.items || returnData.items.length === 0) {
      return;
    }
    
    for (const item of returnData.items) {
      // تحديد نوع عملية المخزون بناءً على نوع المرتجع والإجراء
      let shouldIncrease = false;
      
      if (returnData.return_type === 'sales_return') {
        // مرتجع مبيعات: عند التأكيد نزيد المخزون، عند الإلغاء ننقص المخزون
        shouldIncrease = (action === 'confirm');
      } else {
        // مرتجع مشتريات: عند التأكيد ننقص المخزون، عند الإلغاء نزيد المخزون
        shouldIncrease = (action === 'cancel');
      }
      
      // تنفيذ عملية المخزون
      const itemId = Number(item.item_id);
      const quantity = Math.abs(Number(item.quantity));
      
      if (isNaN(itemId) || itemId <= 0 || isNaN(quantity) || quantity <= 0) {
        console.error(`Invalid item data: ${JSON.stringify(item)}`);
        continue;
      }
      
      if (shouldIncrease) {
        await this.returnInventoryService.increaseItemQuantity(item.item_type, itemId, quantity);
      } else {
        await this.returnInventoryService.decreaseItemQuantity(item.item_type, itemId, quantity);
      }
    }
  }
}

export default ReturnProcessor;
