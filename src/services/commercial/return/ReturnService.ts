
import { Return } from "@/types/returns";
import ReturnDataService from "./ReturnDataService";
import ReturnProcessor from "./ReturnProcessor";
import { toast } from "sonner";

/**
 * خدمة المرتجعات الرئيسية
 * نقطة الاتصال الوحيدة مع باقي النظام للتعامل مع المرتجعات
 */
class ReturnService {
  private static instance: ReturnService;
  private returnDataService: ReturnDataService;
  private returnProcessor: ReturnProcessor;
  
  private constructor() {
    this.returnDataService = new ReturnDataService();
    this.returnProcessor = new ReturnProcessor();
  }
  
  public static getInstance(): ReturnService {
    if (!ReturnService.instance) {
      ReturnService.instance = new ReturnService();
    }
    return ReturnService.instance;
  }
  
  /**
   * الحصول على جميع المرتجعات
   */
  public async getReturns(): Promise<Return[]> {
    return this.returnDataService.getReturns();
  }
  
  /**
   * الحصول على مرتجع محدد
   */
  public async getReturnById(id: string): Promise<Return | null> {
    return this.returnDataService.getReturnById(id);
  }
  
  /**
   * إنشاء مرتجع جديد
   */
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      const result = await this.returnDataService.createReturn(returnData);
      
      if (result) {
        toast.success('تم إنشاء المرتجع بنجاح');
      }
      
      return result;
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء إنشاء المرتجع');
      return null;
    }
  }
  
  /**
   * تأكيد مرتجع
   */
  public async confirmReturn(id: string): Promise<boolean> {
    return this.returnProcessor.confirmReturn(id);
  }
  
  /**
   * إلغاء مرتجع
   */
  public async cancelReturn(id: string): Promise<boolean> {
    return this.returnProcessor.cancelReturn(id);
  }
  
  /**
   * حذف مرتجع
   */
  public async deleteReturn(id: string): Promise<boolean> {
    return this.returnProcessor.deleteReturn(id);
  }
}

export default ReturnService;
