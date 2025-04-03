
import { Payment } from '@/services/commercial/CommercialTypes';
import { PaymentEntity } from './PaymentEntity';
import { PaymentProcessor } from './PaymentProcessor';
import { toast } from 'sonner';

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
        toast.success("تم تسجيل المعاملة بنجاح");
        return payment;
      }
      
      return null;
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error("حدث خطأ أثناء تسجيل المعاملة");
      return null;
    }
  }
  
  public async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      console.log('Starting payment confirmation for:', paymentId);
      
      // استخدام طريقة confirmPayment من paymentProcessor بدون انتظار
      // سيتم تشغيلها في الخلفية وعدم تجميد الواجهة 
      const confirmPromise = this.paymentProcessor.confirmPayment(paymentId);
      
      // عرض رسالة مبدئية للمستخدم
      toast.loading("جاري تأكيد المعاملة...", {
        id: `confirm-payment-${paymentId}`,
      });
      
      // تنفيذ العملية في الخلفية
      confirmPromise.then(result => {
        if (result) {
          console.log('Payment confirmation succeeded for:', paymentId);
          toast.success("تم تأكيد المعاملة بنجاح", {
            id: `confirm-payment-${paymentId}`,
          });
        } else {
          console.log('Payment confirmation failed for:', paymentId);
          toast.error("فشل تأكيد المعاملة", {
            id: `confirm-payment-${paymentId}`,
          });
        }
      }).catch(error => {
        console.error(`Error in confirmPayment(${paymentId}):`, error);
        toast.error("حدث خطأ أثناء تأكيد المعاملة", {
          id: `confirm-payment-${paymentId}`,
        });
      });
      
      // إرجاع true لإخبار الواجهة أن العملية بدأت
      return true;
    } catch (error) {
      console.error(`Error starting confirmPayment(${paymentId}):`, error);
      toast.error("حدث خطأ أثناء بدء عملية تأكيد المعاملة");
      return false;
    }
  }
  
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      console.log('Starting payment cancellation for:', paymentId);
      
      // استخدام طريقة cancelPayment من paymentProcessor بدون انتظار
      const cancelPromise = this.paymentProcessor.cancelPayment(paymentId);
      
      // عرض رسالة مبدئية للمستخدم
      toast.loading("جاري إلغاء المعاملة...", {
        id: `cancel-payment-${paymentId}`,
      });
      
      // تنفيذ العملية في الخلفية
      cancelPromise.then(result => {
        if (result) {
          console.log('Payment cancellation succeeded for:', paymentId);
          toast.success("تم إلغاء المعاملة بنجاح", {
            id: `cancel-payment-${paymentId}`,
          });
        } else {
          console.log('Payment cancellation failed for:', paymentId);
          toast.error("فشل إلغاء المعاملة", {
            id: `cancel-payment-${paymentId}`,
          });
        }
      }).catch(error => {
        console.error(`Error in cancelPayment(${paymentId}):`, error);
        toast.error("حدث خطأ أثناء إلغاء المعاملة", {
          id: `cancel-payment-${paymentId}`,
        });
      });
      
      // إرجاع true لإخبار الواجهة أن العملية بدأت
      return true;
    } catch (error) {
      console.error(`Error starting cancelPayment(${paymentId}):`, error);
      toast.error("حدث خطأ أثناء بدء عملية إلغاء المعاملة");
      return false;
    }
  }
  
  public async updatePayment(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<boolean> {
    return PaymentEntity.update(id, paymentData);
  }
  
  public async deletePayment(id: string): Promise<boolean> {
    return PaymentEntity.delete(id);
  }
}

export default PaymentService;
