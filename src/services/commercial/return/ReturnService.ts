
import { Return } from '@/services/CommercialTypes';
import { ReturnEntity } from './ReturnEntity';
import { ReturnProcessor } from './ReturnProcessor';
import { toast } from '@/hooks/use-toast';

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
        this.confirmReturn(returnRecord.id).then(success => {
          console.log('Auto-confirmation result:', success);
        }).catch(err => {
          console.error('Error in auto-confirmation:', err);
        });
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
    console.log('Starting return confirmation for:', returnId);
    
    try {
      // قم بتنفيذ تأكيد المرتجع
      const result = await this.returnProcessor.confirmReturn(returnId);
      
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
      
      return result;
    } catch (error) {
      console.error(`Error in confirmReturn(${returnId}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد المرتجع",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async cancelReturn(returnId: string): Promise<boolean> {
    console.log('Starting return cancellation for:', returnId);
    
    try {
      // قم بتنفيذ إلغاء المرتجع
      const result = await this.returnProcessor.cancelReturn(returnId);
      
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
      
      return result;
    } catch (error) {
      console.error(`Error in cancelReturn(${returnId}):`, error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إلغاء المرتجع",
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
