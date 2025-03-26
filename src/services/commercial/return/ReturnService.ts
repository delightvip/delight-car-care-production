
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
    return ReturnEntity.fetchAll();
  }
  
  public async getReturnById(id: string): Promise<Return | null> {
    return ReturnEntity.fetchById(id);
  }
  
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      const returnRecord = await ReturnEntity.create(returnData);
      
      // If return status is not "draft", automatically confirm it
      if (returnRecord && returnData.payment_status === 'confirmed') {
        await this.confirmReturn(returnRecord.id);
        
        // Refresh the return data after confirmation
        return this.getReturnById(returnRecord.id);
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
    return ReturnEntity.update(id, returnData);
  }
  
  public async confirmReturn(returnId: string): Promise<boolean> {
    return this.returnProcessor.confirmReturn(returnId);
  }
  
  public async cancelReturn(returnId: string): Promise<boolean> {
    return this.returnProcessor.cancelReturn(returnId);
  }
  
  public async deleteReturn(id: string): Promise<boolean> {
    return ReturnEntity.delete(id);
  }
}

export default ReturnService;
