
import { supabase } from '@/integrations/supabase/client';
import PartyService from '@/services/PartyService';
import InvoiceService from '@/services/commercial/InvoiceService';
import { toast } from 'sonner';

/**
 * خدمة تأكيد وإلغاء عمليات الدفع
 * 
 * مسؤولة عن تحديث حالة الدفع وتأثيرها على رصيد الطرف التجاري
 */
export class PaymentConfirmationService {
  private static instance: PaymentConfirmationService | null = null;
  private partyService: PartyService;
  private invoiceService: InvoiceService;
  
  private constructor() {
    this.partyService = PartyService.getInstance();
    this.invoiceService = InvoiceService.getInstance();
  }
  
  public static getInstance(): PaymentConfirmationService {
    if (!PaymentConfirmationService.instance) {
      PaymentConfirmationService.instance = new PaymentConfirmationService();
    }
    return PaymentConfirmationService.instance;
  }
  
  /**
   * تأكيد عملية دفع
   * @param paymentId معرف عملية الدفع
   * @returns نجاح العملية
   */
  public async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      // جلب بيانات الدفع كاملة
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', paymentId)
        .single();
      
      if (fetchError) {
        console.error(`Error fetching payment ${paymentId}:`, fetchError);
        return false;
      }
      
      // التحقق من أن المعاملة ليست مؤكدة بالفعل
      if (payment.payment_status === 'confirmed') {
        console.log('Payment already confirmed:', paymentId);
        toast.info('المعاملة مؤكدة بالفعل');
        return true;
      }
      
      // تحديث رصيد الطرف بناءً على نوع الدفع
      if (payment.payment_type === 'collection') {
        // تحصيل (العميل يدفع لنا)
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          false, // credit for collections (reduce customer's debt)
          'دفعة مستلمة',
          'payment_received',
          payment.id
        );
        
        // إذا كانت مرتبطة بفاتورة، تحديث حالة الفاتورة
        if (payment.related_invoice_id) {
          await this.invoiceService.updateInvoiceStatusAfterPayment(payment.related_invoice_id, payment.amount);
        }
      } else if (payment.payment_type === 'disbursement') {
        // صرف (نحن ندفع للمورد)
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          true, // debit for disbursements (reduce our debt)
          'دفعة مدفوعة',
          'payment_made',
          payment.id
        );
        
        // إذا كانت مرتبطة بفاتورة، تحديث حالة الفاتورة
        if (payment.related_invoice_id) {
          await this.invoiceService.updateInvoiceStatusAfterPayment(payment.related_invoice_id, payment.amount);
        }
      }
      
      // تحديث حالة الدفع إلى مؤكد
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'confirmed' })
        .eq('id', paymentId);
      
      if (error) {
        console.error(`Error updating payment status ${paymentId}:`, error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      return false;
    }
  }
  
  /**
   * إلغاء عملية دفع
   * @param paymentId معرف عملية الدفع
   * @returns نجاح العملية
   */
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', paymentId)
        .single();
      
      if (fetchError) {
        console.error(`Error fetching payment ${paymentId}:`, fetchError);
        return false;
      }
      
      // التحقق من أن المعاملة مؤكدة سابقاً
      if (payment.payment_status !== 'confirmed') {
        console.log('Cannot cancel unconfirmed payment:', paymentId);
        toast.error('يمكن إلغاء المعاملات المؤكدة فقط');
        return false;
      }
      
      // عكس تأثير تحديث الرصيد بناءً على نوع الدفع
      if (payment.payment_type === 'collection') {
        // إلغاء تحصيل (العميل يدفع لنا)
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          true, // debit for cancelling collections (add back customer's debt)
          'إلغاء دفعة مستلمة',
          'cancel_payment_received',
          payment.id
        );
        
        // إذا كانت مرتبطة بفاتورة، تحديث حالة الفاتورة
        if (payment.related_invoice_id) {
          await this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(payment.related_invoice_id, payment.amount);
        }
      } else if (payment.payment_type === 'disbursement') {
        // إلغاء صرف (نحن ندفع للمورد)
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          false, // credit for cancelling disbursements (add back our debt)
          'إلغاء دفعة مدفوعة',
          'cancel_payment_made',
          payment.id
        );
        
        // إذا كانت مرتبطة بفاتورة، تحديث حالة الفاتورة
        if (payment.related_invoice_id) {
          await this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(payment.related_invoice_id, payment.amount);
        }
      }
      
      // تحديث حالة الدفع إلى ملغية
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'cancelled' })
        .eq('id', paymentId);
      
      if (error) {
        console.error(`Error updating payment status ${paymentId}:`, error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      return false;
    }
  }
}

export default PaymentConfirmationService;
