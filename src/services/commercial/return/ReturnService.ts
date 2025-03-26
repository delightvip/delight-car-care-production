
import { Return } from '@/services/CommercialTypes';
import { ReturnEntity } from './ReturnEntity';
import { ReturnProcessor } from './ReturnProcessor';
import { toast } from "sonner";

// خدمة المرتجعات الرئيسية
export class ReturnService {
  private static instance: ReturnService;
  private returnProcessor: ReturnProcessor;
  
  private constructor() {
    this.returnProcessor = new ReturnProcessor();
  }
  
  public static getInstance(): ReturnService {
    if (!ReturnService.instance) {
      ReturnService.instance = new ReturnService();
    }
    return ReturnService.instance;
  }
  
  public async getReturns(): Promise<Return[]> {
    try {
      const returns = await ReturnEntity.fetchAll();
      return returns;
    } catch (error) {
      console.error('Error in getReturns:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }
  
  public async getReturnById(id: string): Promise<Return | null> {
    try {
      const returnData = await ReturnEntity.fetchById(id);
      return returnData;
    } catch (error) {
      console.error(`Error in getReturnById(${id}):`, error);
      toast.error('حدث خطأ أثناء جلب بيانات المرتجع');
      return null;
    }
  }
  
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      console.log('Creating return:', returnData);
      
      // إنشاء المرتجع في قاعدة البيانات
      const returnRecord = await ReturnEntity.create(returnData);
      
      if (!returnRecord) {
        console.error('Failed to create return');
        toast.error('فشل إنشاء المرتجع');
        return null;
      }
      
      console.log('Return created successfully:', returnRecord.id);
      
      // إذا كانت حالة المرتجع هي "confirmed"، قم بتأكيده تلقائياً
      if (returnRecord && returnData.payment_status === 'confirmed') {
        // استخدام setTimeout لتجنب تجمد الواجهة
        setTimeout(async () => {
          try {
            console.log('Auto-confirming return:', returnRecord.id);
            await this.confirmReturn(returnRecord.id);
          } catch (err) {
            console.error('Error auto-confirming return:', err);
          }
        }, 100);
      }
      
      toast.success('تم إنشاء المرتجع بنجاح');
      return returnRecord;
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء إنشاء المرتجع');
      return null;
    }
  }
  
  public async updateReturn(id: string, returnData: Partial<Return>): Promise<boolean> {
    try {
      const success = await ReturnEntity.update(id, returnData);
      
      if (success) {
        toast.success('تم تحديث المرتجع بنجاح');
      } else {
        toast.error('فشل تحديث المرتجع');
      }
      
      return success;
    } catch (error) {
      console.error(`Error in updateReturn(${id}):`, error);
      toast.error('حدث خطأ أثناء تحديث المرتجع');
      return false;
    }
  }
  
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      // استخدام وعد يتم حله بعد تأكيد المرتجع
      // هذا يسمح بتنفيذ العملية بشكل غير متزامن
      const confirmPromise = new Promise<boolean>((resolve) => {
        // استخدام setTimeout لتنفيذ عملية التأكيد في الخلفية
        // وتجنب تجمد واجهة المستخدم
        setTimeout(async () => {
          try {
            const result = await this.returnProcessor.confirmReturn(returnId);
            resolve(result);
          } catch (error) {
            console.error(`Error in confirmReturn timeout(${returnId}):`, error);
            resolve(false);
          }
        }, 100);
      });
      
      return confirmPromise;
    } catch (error) {
      console.error(`Error in confirmReturn(${returnId}):`, error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }
  
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      // استخدام وعد يتم حله بعد إلغاء المرتجع
      // هذا يسمح بتنفيذ العملية بشكل غير متزامن
      const cancelPromise = new Promise<boolean>((resolve) => {
        // استخدام setTimeout لتنفيذ عملية الإلغاء في الخلفية
        // وتجنب تجمد واجهة المستخدم
        setTimeout(async () => {
          try {
            const result = await this.returnProcessor.cancelReturn(returnId);
            resolve(result);
          } catch (error) {
            console.error(`Error in cancelReturn timeout(${returnId}):`, error);
            resolve(false);
          }
        }, 100);
      });
      
      return cancelPromise;
    } catch (error) {
      console.error(`Error in cancelReturn(${returnId}):`, error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }
  
  public async deleteReturn(id: string): Promise<boolean> {
    try {
      const success = await ReturnEntity.delete(id);
      
      if (success) {
        toast.success('تم حذف المرتجع بنجاح');
      } else {
        toast.error('فشل حذف المرتجع');
      }
      
      return success;
    } catch (error) {
      console.error(`Error in deleteReturn(${id}):`, error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
      return false;
    }
  }
}

export default ReturnService;
