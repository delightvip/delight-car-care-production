
import BaseCommercialService from './BaseCommercialService';
import { toast } from "sonner";
import InvoiceService from './InvoiceService';
import PaymentConfirmationService from './payment/PaymentConfirmationService';

class PaymentProcessingService extends BaseCommercialService {
  private static instance: PaymentProcessingService;
  private invoiceService: InvoiceService;
  private paymentConfirmationService: PaymentConfirmationService;
  
  private constructor() {
    super();
    this.invoiceService = InvoiceService.getInstance();
    this.paymentConfirmationService = PaymentConfirmationService.getInstance();
  }
  
  public static getInstance(): PaymentProcessingService {
    if (!PaymentProcessingService.instance) {
      PaymentProcessingService.instance = new PaymentProcessingService();
    }
    return PaymentProcessingService.instance;
  }
  
  public async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      // استخدام خدمة تأكيد الدفعات للقيام بالعمل الفعلي
      const success = await this.paymentConfirmationService.confirmPayment(paymentId);
      
      if (success) {
        toast.success('تم تأكيد المعاملة بنجاح');
        return true;
      } else {
        toast.error('حدث خطأ أثناء تأكيد المعاملة');
        return false;
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('حدث خطأ أثناء تأكيد المعاملة');
      return false;
    }
  }
  
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      // استخدام خدمة تأكيد الدفعات للقيام بالعمل الفعلي
      const success = await this.paymentConfirmationService.cancelPayment(paymentId);
      
      if (success) {
        toast.success('تم إلغاء المعاملة بنجاح');
        return true;
      } else {
        toast.error('حدث خطأ أثناء إلغاء المعاملة');
        return false;
      }
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error('حدث خطأ أثناء إلغاء المعاملة');
      return false;
    }
  }
  
  public async updatePayment(id: string, paymentData: Omit<any, 'id' | 'created_at'>): Promise<boolean> {
    try {
      const { data: payment, error: fetchError } = await this.supabase
        .from('payments')
        .select('payment_status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (payment.payment_status !== 'draft') {
        toast.error('يمكن تعديل المدفوعات في حالة المسودة فقط');
        return false;
      }
      
      // Format date if it's a Date object
      const formattedDate = typeof paymentData.date === 'object' ? 
        paymentData.date.toISOString().split('T')[0] : 
        paymentData.date;
        
      const { error } = await this.supabase
        .from('payments')
        .update({
          party_id: paymentData.party_id,
          date: formattedDate,
          amount: paymentData.amount,
          payment_type: paymentData.payment_type,
          method: paymentData.method,
          related_invoice_id: paymentData.related_invoice_id,
          notes: paymentData.notes
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('حدث خطأ أثناء تحديث المعاملة');
      return false;
    }
  }
  
  public async deletePayment(id: string): Promise<boolean> {
    try {
      const { data: payment, error: fetchError } = await this.supabase
        .from('payments')
        .select('payment_status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (payment.payment_status !== 'draft') {
        toast.error('يمكن حذف المدفوعات في حالة المسودة فقط');
        return false;
      }
      
      const { error } = await this.supabase
        .from('payments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('حدث خطأ أثناء حذف المعاملة');
      return false;
    }
  }
}

export default PaymentProcessingService;
