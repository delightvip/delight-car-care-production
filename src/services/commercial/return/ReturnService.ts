
import { Return } from '@/services/CommercialTypes';
import { ReturnEntity } from './ReturnEntity';
import ReturnProcessor from './ReturnProcessor';
import { toast } from '@/hooks/use-toast';

// خدمة المرتجعات الرئيسية
export class ReturnService {
  private static instance: ReturnService | null = null;
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
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب المرتجعات",
        variant: "destructive"
      });
      return [];
    }
  }
  
  public async getReturnById(id: string): Promise<Return | null> {
    try {
      const returnData = await ReturnEntity.fetchById(id);
      return returnData;
    } catch (error) {
      console.error(`Error in getReturnById(${id}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب بيانات المرتجع",
        variant: "destructive"
      });
      return null;
    }
  }
  
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      console.log('Creating return:', returnData);
      
      if (!returnData.items || returnData.items.length === 0) {
        toast({
          title: "خطأ",
          description: "يجب إضافة صنف واحد على الأقل إلى المرتجع",
          variant: "destructive"
        });
        return null;
      }
      
      // إنشاء المرتجع في قاعدة البيانات
      const returnRecord = await ReturnEntity.create(returnData);
      
      if (!returnRecord) {
        console.error('Failed to create return');
        toast({
          title: "خطأ",
          description: "فشل إنشاء المرتجع",
          variant: "destructive"
        });
        return null;
      }
      
      console.log('Return created successfully:', returnRecord.id);
      
      // إذا كانت حالة المرتجع هي "confirmed"، قم بتأكيده تلقائياً (بشكل غير متزامن)
      if (returnRecord && returnData.payment_status === 'confirmed') {
        // تجنب تجمد الواجهة باستخدام وعد
        this.processReturnConfirmation(returnRecord.id);
      }
      
      toast({
        title: "نجاح",
        description: "تم إنشاء المرتجع بنجاح",
        variant: "default"
      });
      
      return returnRecord;
    } catch (error) {
      console.error('Error creating return:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء المرتجع",
        variant: "destructive"
      });
      return null;
    }
  }
  
  // معالجة تأكيد المرتجع في الخلفية لمنع تجمد الواجهة
  private processReturnConfirmation(returnId: string): void {
    this.confirmReturn(returnId).then(success => {
      console.log('Auto-confirmation result:', success);
    }).catch(err => {
      console.error('Error in auto-confirmation:', err);
    });
  }
  
  public async updateReturn(id: string, returnData: Partial<Return>): Promise<boolean> {
    try {
      const success = await ReturnEntity.update(id, returnData);
      
      if (success) {
        toast({
          title: "نجاح", 
          description: "تم تحديث المرتجع بنجاح",
          variant: "default"
        });
      } else {
        toast({
          title: "خطأ",
          description: "فشل تحديث المرتجع",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (error) {
      console.error(`Error in updateReturn(${id}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المرتجع",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      console.log('Starting return confirmation for:', returnId);
      
      // استخدام معالج المرتجعات لتنفيذ التأكيد بدون تجميد الواجهة
      const confirmPromise = this.returnProcessor.confirmReturn(returnId);
      
      // عرض رسالة مبدئية للمستخدم
      toast({
        title: "جاري التنفيذ",
        description: "جاري تأكيد المرتجع...",
        variant: "default"
      });
      
      // تنفيذ العملية في الخلفية
      confirmPromise.then(result => {
        if (result) {
          console.log('Return confirmation succeeded for:', returnId);
          toast({
            title: "نجاح",
            description: "تم تأكيد المرتجع بنجاح",
            variant: "default"
          });
        } else {
          console.log('Return confirmation failed for:', returnId);
          toast({
            title: "خطأ",
            description: "فشل تأكيد المرتجع",
            variant: "destructive"
          });
        }
      }).catch(error => {
        console.error(`Error in confirmReturn(${returnId}):`, error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تأكيد المرتجع",
          variant: "destructive"
        });
      });
      
      // إرجاع true لإخبار الواجهة أن العملية بدأت
      return true;
    } catch (error) {
      console.error(`Error starting confirmReturn(${returnId}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء بدء عملية تأكيد المرتجع",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      console.log('Starting return cancellation for:', returnId);
      
      // استخدام معالج المرتجعات لتنفيذ الإلغاء بدون تجميد الواجهة
      const cancelPromise = this.returnProcessor.cancelReturn(returnId);
      
      // عرض رسالة مبدئية للمستخدم
      toast({
        title: "جاري التنفيذ",
        description: "جاري إلغاء المرتجع...",
        variant: "default"
      });
      
      // تنفيذ العملية في الخلفية
      cancelPromise.then(result => {
        if (result) {
          console.log('Return cancellation succeeded for:', returnId);
          toast({
            title: "نجاح",
            description: "تم إلغاء المرتجع بنجاح",
            variant: "default"
          });
        } else {
          console.log('Return cancellation failed for:', returnId);
          toast({
            title: "خطأ",
            description: "فشل إلغاء المرتجع",
            variant: "destructive"
          });
        }
      }).catch(error => {
        console.error(`Error in cancelReturn(${returnId}):`, error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء إلغاء المرتجع",
          variant: "destructive"
        });
      });
      
      // إرجاع true لإخبار الواجهة أن العملية بدأت
      return true;
    } catch (error) {
      console.error(`Error starting cancelReturn(${returnId}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء بدء عملية إلغاء المرتجع",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async deleteReturn(id: string): Promise<boolean> {
    try {
      const success = await ReturnEntity.delete(id);
      
      if (success) {
        toast({
          title: "نجاح",
          description: "تم حذف المرتجع بنجاح",
          variant: "default" 
        });
      } else {
        toast({
          title: "خطأ",
          description: "فشل حذف المرتجع",
          variant: "destructive"
        });
      }
      
      return success;
    } catch (error) {
      console.error(`Error in deleteReturn(${id}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف المرتجع",
        variant: "destructive"
        });
      return false;
    }
  }
}

export default ReturnService;
