import { supabase } from "@/integrations/supabase/client";
import PartyService from '@/services/PartyService';
import { Payment } from '@/services/commercial/CommercialTypes';
import InvoiceService from '../invoice/InvoiceService';
import { toast } from "@/hooks/use-toast";

export class PaymentProcessor {
  private partyService: PartyService;
  private invoiceService: InvoiceService;
  
  constructor() {
    this.partyService = PartyService.getInstance();
    this.invoiceService = InvoiceService.getInstance();
  }
  
  /**
   * Confirm a payment and update related invoice and party balances.
   */
  public async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      console.log('Confirming payment:', paymentId);
      
      // Fetch payment details
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (paymentError) {
        console.error('Error fetching payment:', paymentError);
        toast({
          title: "خطأ",
          description: "فشل جلب بيانات الدفعة",
          variant: "destructive"
        });
        return false;
      }
      
      if (!payment) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على الدفعة",
          variant: "destructive"
        });
        return false;
      }
      
      if (payment.payment_status === 'confirmed') {
        toast({
          title: "معلومة",
          description: "الدفعة مؤكدة بالفعل",
          variant: "default"
        });
        return true;
      }
      
      // Update party balance
      const amount = Number(payment.amount);
      const isCollection = payment.payment_type === 'collection';
      
      await this.partyService.updatePartyBalance(
        payment.party_id,
        amount,
        !isCollection, // Debit if disbursement, credit if collection
        isCollection ? 'تحصيل دفعة' : 'صرف دفعة',
        isCollection ? 'payment_collection' : 'payment_disbursement',
        payment.id
      );
      
      // Update invoice status if related_invoice_id is present
      if (payment.related_invoice_id) {
        await this.invoiceService.updateInvoiceStatusAfterPayment(payment.related_invoice_id, amount);
      }
      
      // Update payment status to confirmed
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_status: 'confirmed' })
        .eq('id', paymentId);
      
      if (updateError) {
        console.error('Error updating payment status:', updateError);
        
        toast({
          title: "خطأ",
          description: "فشل تحديث حالة الدفعة",
          variant: "destructive"
        });
        return false;
      }
      
      console.log('Payment confirmed successfully:', paymentId);
      
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد الدفعة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  /**
   * Cancel a payment and reverse related invoice and party balances.
   */
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      console.log('Cancelling payment:', paymentId);
      
      // Fetch payment details
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (paymentError) {
        console.error('Error fetching payment:', paymentError);
        toast({
          title: "خطأ",
          description: "فشل جلب بيانات الدفعة",
          variant: "destructive"
        });
        return false;
      }
      
      if (!payment) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على الدفعة",
          variant: "destructive"
        });
        return false;
      }
      
      if (payment.payment_status !== 'confirmed') {
        toast({
          title: "خطأ",
          description: "لا يمكن إلغاء دفعة غير مؤكدة",
          variant: "destructive"
        });
        return false;
      }
      
      // Reverse party balance update
      const amount = Number(payment.amount);
      const isCollection = payment.payment_type === 'collection';
      
      await this.partyService.updatePartyBalance(
        payment.party_id,
        amount,
        isCollection, // Credit if disbursement, debit if collection
        isCollection ? 'إلغاء تحصيل دفعة' : 'إلغاء صرف دفعة',
        isCollection ? 'cancel_payment_collection' : 'cancel_payment_disbursement',
        payment.id
      );
      
      // Reverse invoice status update if related_invoice_id is present
      if (payment.related_invoice_id) {
        await this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(payment.related_invoice_id, amount);
      }
      
      // Update payment status to cancelled
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_status: 'cancelled' })
        .eq('id', paymentId);
      
      if (updateError) {
        console.error('Error updating payment status:', updateError);
        toast({
          title: "خطأ",
          description: "فشل تحديث حالة الدفعة",
          variant: "destructive"
        });
        return false;
      }
      
      console.log('Payment cancelled successfully:', paymentId);
      
      return true;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إلغاء الدفعة",
        variant: "destructive"
      });
      return false;
    }
  }
}
