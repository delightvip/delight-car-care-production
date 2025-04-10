
import { Payment } from '@/services/commercial/CommercialTypes';
import { PaymentEntity } from './PaymentEntity';
import PaymentProcessor from './PaymentProcessor';
import { toast } from 'sonner';
import FinancialBalanceService from '@/services/financial/FinancialBalanceService';
import PaymentProcessingService from '@/services/commercial/PaymentProcessingService';

// الخدمة الرئيسية للدفعات
export class PaymentService {
  private static instance: PaymentService | null = null;
  private paymentProcessor: PaymentProcessor;
  private financialBalanceService: FinancialBalanceService;
  private paymentProcessingService: PaymentProcessingService;
  
  private constructor() {
    this.paymentProcessor = PaymentProcessor.getInstance();
    this.financialBalanceService = FinancialBalanceService.getInstance();
    this.paymentProcessingService = PaymentProcessingService.getInstance();
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
      
      // الحصول على بيانات الدفع كاملة أولاً
      const payment = await PaymentEntity.fetchById(paymentId);
      
      if (!payment) {
        toast.error("لم يتم العثور على معاملة الدفع");
        return false;
      }
      
      // عرض رسالة مبدئية للمستخدم
      toast.loading("جاري تأكيد المعاملة...", {
        id: `confirm-payment-${paymentId}`,
      });
      
      // معالجة الدفع أولاً - وتأكيد صحة البيانات
      const isValid = await this.paymentProcessor.processPayment({
        id: payment.id,
        amount: payment.amount,
        method: payment.method
      });
      
      if (!isValid) {
        toast.error("فشل تأكيد المعاملة - بيانات الدفع غير صالحة", {
          id: `confirm-payment-${paymentId}`,
        });
        return false;
      }
      
      // بعد التأكد من صحة البيانات، نقوم بتحديث سجلات الطرف والخزينة
      const success = await this.paymentProcessingService.confirmPayment(paymentId);
      
      if (success) {
        // تحديث أرصدة الخزينة بناءً على طريقة الدفع
        const isIncoming = payment.payment_type === 'collection';
        await this.financialBalanceService.updateBalanceByPaymentMethod(
          payment.amount, 
          payment.method, 
          isIncoming, 
          `تأكيد ${isIncoming ? 'تحصيل' : 'دفع'} معاملة ${payment.id}`
        );
        
        console.log('Payment confirmation succeeded for:', paymentId);
        toast.success("تم تأكيد المعاملة بنجاح", {
          id: `confirm-payment-${paymentId}`,
        });
        return true;
      } else {
        console.log('Payment confirmation failed for:', paymentId);
        toast.error("فشل تأكيد المعاملة", {
          id: `confirm-payment-${paymentId}`,
        });
        return false;
      }
    } catch (error) {
      console.error(`Error in confirmPayment(${paymentId}):`, error);
      toast.error("حدث خطأ أثناء تأكيد المعاملة", {
        id: `confirm-payment-${paymentId}`,
      });
      return false;
    }
  }
  
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      console.log('Starting payment cancellation for:', paymentId);
      
      // الحصول على بيانات الدفع كاملة أولاً
      const payment = await PaymentEntity.fetchById(paymentId);
      
      if (!payment) {
        toast.error("لم يتم العثور على معاملة الدفع");
        return false;
      }
      
      // عرض رسالة مبدئية للمستخدم
      toast.loading("جاري إلغاء المعاملة...", {
        id: `cancel-payment-${paymentId}`,
      });
      
      // إلغاء الدفع
      const isValid = await this.paymentProcessor.voidPayment(payment.id);
      
      if (!isValid) {
        toast.error("فشل إلغاء المعاملة", {
          id: `cancel-payment-${paymentId}`,
        });
        return false;
      }
      
      // تنفيذ إلغاء التأثير على الرصيد
      const success = await this.paymentProcessingService.cancelPayment(paymentId);
      
      if (success) {
        // إلغاء تأثير المعاملة على أرصدة الخزينة
        if (payment.payment_status === 'confirmed') {
          const isIncoming = payment.payment_type === 'collection';
          await this.financialBalanceService.updateBalanceByPaymentMethod(
            payment.amount, 
            payment.method, 
            !isIncoming, // عكس التأثير السابق
            `إلغاء ${isIncoming ? 'تحصيل' : 'دفع'} معاملة ${payment.id}`
          );
        }
        
        console.log('Payment cancellation succeeded for:', paymentId);
        toast.success("تم إلغاء المعاملة بنجاح", {
          id: `cancel-payment-${paymentId}`,
        });
        return true;
      } else {
        console.log('Payment cancellation failed for:', paymentId);
        toast.error("فشل إلغاء المعاملة", {
          id: `cancel-payment-${paymentId}`,
        });
        return false;
      }
    } catch (error) {
      console.error(`Error in cancelPayment(${paymentId}):`, error);
      toast.error("حدث خطأ أثناء إلغاء المعاملة", {
        id: `cancel-payment-${paymentId}`,
      });
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
