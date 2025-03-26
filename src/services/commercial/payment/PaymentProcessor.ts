
import { supabase } from "@/integrations/supabase/client";
import { Payment } from '@/services/CommercialTypes';
import { toast } from "sonner";
import PartyService from '../../PartyService';
import { InvoiceProcessor } from '../invoice/InvoiceProcessor';

// خدمة تُعنى بمعالجة الدفعات المالية (تأكيد وإلغاء)
export class PaymentProcessor {
  private static partyService = PartyService.getInstance();
  private static invoiceProcessor = new InvoiceProcessor();

  // تأكيد دفعة مالية
  public static async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', paymentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (payment.payment_status === 'confirmed') {
        toast.info('المعاملة مؤكدة بالفعل');
        return true;
      }
      
      console.log("تأكيد الدفعة:", payment);
      
      // Update party balance based on payment type
      if (payment.payment_type === 'collection') {
        // Collection (customer paying us)
        console.log("نوع الدفعة: تحصيل - تحديث رصيد العميل");
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          false, // credit for collections (reduce customer's debt)
          'دفعة مستلمة',
          'payment_received',
          payment.id
        );
        
        // If related to an invoice, update the invoice status
        if (payment.related_invoice_id) {
          console.log("تحديث حالة الفاتورة المرتبطة بالدفعة:", payment.related_invoice_id);
          await this.invoiceProcessor.updateInvoiceStatusAfterPayment(payment.related_invoice_id, payment.amount);
        }
      } else if (payment.payment_type === 'disbursement') {
        // Disbursement (we paying supplier)
        console.log("نوع الدفعة: صرف - تحديث رصيد المورد");
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          true, // debit for disbursements (reduce our debt)
          'دفعة مدفوعة',
          'payment_made',
          payment.id
        );
        
        // If related to an invoice, update the invoice status
        if (payment.related_invoice_id) {
          console.log("تحديث حالة الفاتورة المرتبطة بالدفعة:", payment.related_invoice_id);
          await this.invoiceProcessor.updateInvoiceStatusAfterPayment(payment.related_invoice_id, payment.amount);
        }
      }
      
      // Update payment status to confirmed
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'confirmed' })
        .eq('id', paymentId);
      
      if (error) throw error;
      
      console.log("تم تأكيد الدفعة بنجاح");
      toast.success('تم تأكيد المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('حدث خطأ أثناء تأكيد المعاملة');
      return false;
    }
  }
  
  // إلغاء دفعة مالية
  public static async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', paymentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (payment.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء المعاملات المؤكدة فقط');
        return false;
      }
      
      // Reverse party balance update based on payment type
      if (payment.payment_type === 'collection') {
        // Reverse collection (customer paying us)
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          true, // debit for cancelling collections (add back customer's debt)
          'إلغاء دفعة مستلمة',
          'cancel_payment_received',
          payment.id
        );
        
        // If related to an invoice, update the invoice status
        if (payment.related_invoice_id) {
          await this.invoiceProcessor.reverseInvoiceStatusAfterPaymentCancellation(payment.related_invoice_id, payment.amount);
        }
      } else if (payment.payment_type === 'disbursement') {
        // Reverse disbursement (we paying supplier)
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          false, // credit for cancelling disbursements (add back our debt)
          'إلغاء دفعة مدفوعة',
          'cancel_payment_made',
          payment.id
        );
        
        // If related to an invoice, update the invoice status
        if (payment.related_invoice_id) {
          await this.invoiceProcessor.reverseInvoiceStatusAfterPaymentCancellation(payment.related_invoice_id, payment.amount);
        }
      }
      
      // Update payment status to cancelled
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'cancelled' })
        .eq('id', paymentId);
      
      if (error) throw error;
      
      toast.success('تم إلغاء المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error('حدث خطأ أثناء إلغاء المعاملة');
      return false;
    }
  }
}
