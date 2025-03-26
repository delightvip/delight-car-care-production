
import { Payment } from '@/services/CommercialTypes';
import { PaymentEntity } from './PaymentEntity';
import { PaymentProcessor } from './PaymentProcessor';
import { toast } from "sonner";

// الخدمة الرئيسية للدفعات
export class PaymentService {
  private static instance: PaymentService;
  private paymentProcessor: PaymentProcessor;
  
  private constructor() {
    this.paymentProcessor = new PaymentProcessor();
  }
  
  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }
  
  public async getPayments(): Promise<Payment[]> {
    return PaymentEntity.fetchAll();
  }
  
  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    return PaymentEntity.fetchByParty(partyId);
  }
  
  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      const payment = await PaymentEntity.create(paymentData);
      
      if (payment) {
        // الحصول على اسم الطرف للإستجابة
        const { data: party } = await supabase
          .from('parties')
          .select('name')
          .eq('id', paymentData.party_id)
          .single();
        
        toast.success('تم تسجيل المعاملة بنجاح');
        
        return {
          ...payment,
          party_name: party?.name
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة');
      return null;
    }
  }
  
  public async confirmPayment(paymentId: string): Promise<boolean> {
    // Call instance method instead of static method
    return this.paymentProcessor.confirmPayment(paymentId);
  }
  
  public async cancelPayment(paymentId: string): Promise<boolean> {
    // Call instance method instead of static method
    return this.paymentProcessor.cancelPayment(paymentId);
  }
  
  public async updatePayment(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<boolean> {
    return PaymentEntity.update(id, paymentData);
  }
  
  public async deletePayment(id: string): Promise<boolean> {
    return PaymentEntity.delete(id);
  }
}

// استيراد ما يلزم
import { supabase } from "@/integrations/supabase/client";

export default PaymentService;
