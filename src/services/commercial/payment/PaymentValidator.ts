
import { Payment } from '@/services/CommercialTypes';

/**
 * مسؤول عن التحقق من صحة بيانات المدفوعات
 */
class PaymentValidator {
  
  /**
   * التحقق من صحة بيانات الدفعة
   * @param paymentData بيانات الدفعة
   * @throws Error في حالة وجود أخطاء في البيانات
   */
  public validatePaymentData(paymentData: Omit<Payment, 'id' | 'created_at'>): void {
    if (!paymentData.party_id) {
      throw new Error('الطرف التجاري مطلوب');
    }
    
    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('المبلغ يجب أن يكون أكبر من صفر');
    }
    
    if (!paymentData.date) {
      throw new Error('تاريخ المعاملة مطلوب');
    }
    
    if (!paymentData.payment_type || !['collection', 'disbursement'].includes(paymentData.payment_type)) {
      throw new Error('نوع المعاملة غير صالح');
    }
    
    if (!paymentData.method || !['cash', 'check', 'bank_transfer', 'other'].includes(paymentData.method)) {
      throw new Error('طريقة الدفع غير صالحة');
    }
  }
  
  /**
   * التحقق من إمكانية تعديل أو حذف دفعة
   * @param status حالة الدفعة
   * @throws Error في حالة كانت الدفعة غير قابلة للتعديل
   */
  public validatePaymentModifiable(status: string): void {
    if (status !== 'draft') {
      throw new Error('يمكن تعديل المدفوعات في حالة المسودة فقط');
    }
  }
}

export default PaymentValidator;
