
import { Payment } from '@/services/CommercialTypes';

/**
 * مدقق بيانات المدفوعات
 */
class PaymentValidator {
  /**
   * التحقق من صحة بيانات الدفعة
   * @param paymentData بيانات الدفعة
   */
  public validatePaymentData(paymentData: Omit<Payment, 'id' | 'created_at'>): void {
    if (!paymentData.party_id) {
      throw new Error('يجب تحديد الطرف');
    }
    
    if (!paymentData.date) {
      throw new Error('يجب تحديد تاريخ المعاملة');
    }
    
    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('يجب أن يكون المبلغ أكبر من صفر');
    }
    
    if (!paymentData.payment_type) {
      throw new Error('يجب تحديد نوع المعاملة');
    }
    
    if (!['collection', 'disbursement'].includes(paymentData.payment_type)) {
      throw new Error('نوع المعاملة غير صحيح');
    }
    
    if (!paymentData.method) {
      throw new Error('يجب تحديد طريقة الدفع');
    }
    
    if (!['cash', 'check', 'bank_transfer', 'other'].includes(paymentData.method)) {
      throw new Error('طريقة الدفع غير صحيحة');
    }
  }
}

export default PaymentValidator;
