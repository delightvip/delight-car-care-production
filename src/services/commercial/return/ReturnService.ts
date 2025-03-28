
import { toast } from "sonner";
import { Return } from "@/types/returns";
import { format } from "date-fns";
import FinancialCommercialBridge from "@/services/financial/FinancialCommercialBridge";
import returnDataService from "./ReturnDataService";
import returnInventoryService from "./ReturnInventoryService";
import { ReturnProcessingService } from "./ReturnProcessingService";

/**
 * خدمة إدارة المرتجعات
 * تتيح عمليات الإنشاء والتعديل والحذف للمرتجعات مع المحافظة على تحديث المخزون والدفاتر المالية
 */
class ReturnService {
  private static instance: ReturnService;
  private financialBridge: FinancialCommercialBridge;
  private processingService: ReturnProcessingService;

  private constructor() {
    this.financialBridge = FinancialCommercialBridge.getInstance();
    this.processingService = new ReturnProcessingService();
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
      console.log("Creating return with data:", returnData);
      
      // التأكد من تنسيق التاريخ بشكل صحيح
      const formattedDate = typeof returnData.date === 'object' 
        ? format(new Date(returnData.date as any), 'yyyy-MM-dd')
        : returnData.date;

      const returnWithFormattedDate = {
        ...returnData,
        date: formattedDate
      };
      
      // التحقق من وجود أصناف مختارة وصالحة
      if (!returnWithFormattedDate.items || returnWithFormattedDate.items.length === 0) {
        toast.error('يجب إضافة صنف واحد على الأقل للمرتجع');
        return null;
      }

      const result = await returnDataService.createReturn(returnWithFormattedDate);
      
      if (result) {
        toast.success('تم إنشاء المرتجع بنجاح');
        return result;
      } else {
        toast.error('حدث خطأ أثناء إنشاء المرتجع');
        return null;
      }
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
    return this.processingService.confirmReturn(returnId);
  }

  /**
   * إلغاء مرتجع (عكس تأثيره على المخزون والحسابات)
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    return this.processingService.cancelReturn(returnId);
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
