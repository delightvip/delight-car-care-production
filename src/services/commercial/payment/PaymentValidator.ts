
import { Payment } from '@/services/CommercialTypes';
import { toast } from "sonner";

/**
 * صنف للتحقق من صحة بيانات المدفوعات
 */
class PaymentValidator {
  /**
   * التحقق من صحة بيانات الدفعة
   * @param paymentData بيانات الدفعة
   */
  public validatePaymentData(paymentData: Omit<Payment, 'id' | 'created_at'>): boolean {
    if (!paymentData.party_id) {
      toast.error('يجب تحديد الطرف');
      throw new Error('يجب تحديد الطرف');
    }

    if (!paymentData.date) {
      toast.error('يجب تحديد تاريخ المعاملة');
      throw new Error('يجب تحديد تاريخ المعاملة');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      toast.error('يجب أن يكون المبلغ أكبر من صفر');
      throw new Error('يجب أن يكون المبلغ أكبر من صفر');
    }

    if (!paymentData.payment_type) {
      toast.error('يجب تحديد نوع المعاملة');
      throw new Error('يجب تحديد نوع المعاملة');
    }

    if (!paymentData.method) {
      toast.error('يجب تحديد طريقة الدفع');
      throw new Error('يجب تحديد طريقة الدفع');
    }

    return true;
  }
}

export default PaymentValidator;
