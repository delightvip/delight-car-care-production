
import { Payment } from '@/services/CommercialTypes';
import { PaymentEntity } from './PaymentEntity';
import { PaymentProcessor } from './PaymentProcessor';
import { toast } from "@/components/ui/use-toast";

// الخدمة الرئيسية للدفعات
export class PaymentService {
  private static instance: PaymentService | null = null;
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
    return PaymentEntity.fetchByPartyId(partyId);
  }
  
  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      const payment = await PaymentEntity.create(paymentData);
      
      if (payment) {
        toast({
          title: "نجاح",
          description: "تم تسجيل المعاملة بنجاح",
          variant: "success"
        });
        return payment;
      }
      
      return null;
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل المعاملة",
        variant: "destructive"
      });
      return null;
    }
  }
  
  public async confirmPayment(paymentId: string): Promise<boolean> {
    // استخدام طريقة confirmPayment من paymentProcessor
    return this.paymentProcessor.confirmPayment(paymentId);
  }
  
  public async cancelPayment(paymentId: string): Promise<boolean> {
    // استخدام طريقة cancelPayment من paymentProcessor
    return this.paymentProcessor.cancelPayment(paymentId);
  }
  
  public async updatePayment(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<boolean> {
    return PaymentEntity.update(id, paymentData);
  }
  
  public async deletePayment(id: string): Promise<boolean> {
    return PaymentEntity.delete(id);
  }
}

export default PaymentService;

