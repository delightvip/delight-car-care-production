import { supabase } from "@/integrations/supabase/client";
import { Payment } from "@/services/CommercialTypes";
import { toast } from "@/components/ui/use-toast";
import PartyService from "@/services/PartyService";
import InventoryService from "@/services/InventoryService";
import { InvoiceService } from "./invoice/InvoiceService";

export class PaymentProcessor {
  private partyService: PartyService;
  private invoiceService: InvoiceService;
  private inventoryService: InventoryService;
  
  constructor() {
    this.partyService = PartyService.getInstance();
    this.inventoryService = InventoryService.getInstance();
    this.invoiceService = InvoiceService.getInstance();
  }
  
  /**
   * تأكيد دفعة، تحديث حالة الفاتورة والسجلات المالية
   */
  public async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      // Get payment details
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (error) {
        console.error('Error fetching payment:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء جلب بيانات الدفعة",
          variant: "destructive"
        });
        return false;
      }
      
      if (payment.payment_status === 'confirmed') {
        console.log('Payment already confirmed:', paymentId);
        toast({
          title: "تنبيه",
          description: "الدفعة مؤكدة بالفعل",
          variant: "default"
        });
        return true;
      }
      
      // Update party balance
      const isDebit = payment.payment_type === 'disbursement';
      const description = payment.payment_type === 'collection' ? 'تحصيل دفعة' : 'صرف دفعة';
      const transactionType = payment.payment_type === 'collection' ? 'payment_collection' : 'payment_disbursement';
      
      const balanceUpdated = await this.partyService.updatePartyBalance(
        payment.party_id,
        payment.amount,
        isDebit,
        description,
        transactionType,
        paymentId
      );
      
      if (!balanceUpdated) {
        console.error('Failed to update party balance for payment:', paymentId);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحديث رصيد الطرف",
          variant: "destructive"
        });
        return false;
      }
      
      // If payment is related to an invoice, update invoice status
      if (payment.related_invoice_id) {
        const invoiceUpdated = await this.updateInvoiceStatus(
          payment.related_invoice_id,
          payment.amount,
          payment.payment_type
        );
        
        if (!invoiceUpdated) {
          console.error('Failed to update invoice status for payment:', paymentId);
          toast({
            title: "تحذير",
            description: "تم تحديث رصيد الطرف ولكن فشل تحديث حالة الفاتورة",
            variant: "destructive"
          });
          // Continue with payment confirmation despite invoice update failure
        }
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
          description: "حدث خطأ أثناء تحديث حالة الدفعة",
          variant: "destructive"
        });
        return false;
      }
      
      console.log('Payment confirmed successfully:', paymentId);
      toast({
        title: "نجاح",
        description: "تم تأكيد الدفعة بنجاح",
        variant: "default"
      });
      
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
   * إلغاء دفعة، عكس تغييرات الفاتورة والتغييرات المالية
   */
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      // Get payment details
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (error) {
        console.error('Error fetching payment:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء جلب بيانات الدفعة",
          variant: "destructive"
        });
        return false;
      }
      
      if (payment.payment_status !== 'confirmed') {
        console.error('Cannot cancel unconfirmed payment:', paymentId, payment.payment_status);
        toast({
          title: "خطأ",
          description: "يمكن إلغاء الدفعات المؤكدة فقط",
          variant: "destructive"
        });
        return false;
      }
      
      // Reverse party balance update
      const isDebit = payment.payment_type === 'collection'; // Opposite of confirmation
      const description = payment.payment_type === 'collection' ? 'إلغاء تحصيل دفعة' : 'إلغاء صرف دفعة';
      const transactionType = payment.payment_type === 'collection' ? 'cancel_payment_collection' : 'cancel_payment_disbursement';
      
      const balanceUpdated = await this.partyService.updatePartyBalance(
        payment.party_id,
        payment.amount,
        isDebit,
        description,
        transactionType,
        paymentId
      );
      
      if (!balanceUpdated) {
        console.error('Failed to reverse party balance for payment:', paymentId);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء عكس تحديث رصيد الطرف",
          variant: "destructive"
        });
        return false;
      }
      
      // If payment is related to an invoice, revert invoice status
      if (payment.related_invoice_id) {
        const invoiceUpdated = await this.revertInvoiceStatus(
          payment.related_invoice_id,
          payment.amount,
          payment.payment_type
        );
        
        if (!invoiceUpdated) {
          console.error('Failed to revert invoice status for payment:', paymentId);
          toast({
            title: "تحذير",
            description: "تم عكس تحديث رصيد الطرف ولكن فشل عكس تحديث حالة الفاتورة",
            variant: "destructive"
          });
          // Continue with payment cancellation despite invoice update failure
        }
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
          description: "حدث خطأ أثناء تحديث حالة الدفعة",
          variant: "destructive"
        });
        return false;
      }
      
      console.log('Payment cancelled successfully:', paymentId);
      toast({
        title: "نجاح",
        description: "تم إلغاء الدفعة بنجاح",
        variant: "default"
      });
      
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
  
  /**
   * تحديث حالة الفاتورة بناءً على الدفعة
   */
  private async updateInvoiceStatus(
    invoiceId: string,
    paymentAmount: number,
    paymentType: string
  ): Promise<boolean> {
    try {
      // Get invoice details
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (error) {
        console.error('Error fetching invoice:', error);
        return false;
      }
      
      // Check if payment type matches invoice type
      const isValidPayment = 
        (paymentType === 'collection' && invoice.invoice_type === 'sale') ||
        (paymentType === 'disbursement' && invoice.invoice_type === 'purchase');
      
      if (!isValidPayment) {
        console.error('Payment type does not match invoice type:', paymentType, invoice.invoice_type);
        return false;
      }
      
      // Get all confirmed payments for this invoice
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('related_invoice_id', invoiceId)
        .eq('payment_status', 'confirmed');
      
      if (paymentsError) {
        console.error('Error fetching payments for invoice:', paymentsError);
        return false;
      }
      
      // Calculate total paid amount
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      // Determine new status
      let newStatus;
      if (totalPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'unpaid';
      }
      
      // Update invoice status
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
      if (updateError) {
        console.error('Error updating invoice status:', updateError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating invoice status:', error);
      return false;
    }
  }
  
  /**
   * عكس تحديث حالة الفاتورة عند إلغاء الدفعة
   */
  private async revertInvoiceStatus(
    invoiceId: string,
    paymentAmount: number,
    paymentType: string
  ): Promise<boolean> {
    try {
      // Get invoice details
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (error) {
        console.error('Error fetching invoice:', error);
        return false;
      }
      
      // Check if payment type matches invoice type
      const isValidPayment = 
        (paymentType === 'collection' && invoice.invoice_type === 'sale') ||
        (paymentType === 'disbursement' && invoice.invoice_type === 'purchase');
      
      if (!isValidPayment) {
        console.error('Payment type does not match invoice type:', paymentType, invoice.invoice_type);
        return false;
      }
      
      // Get all confirmed payments for this invoice (excluding the cancelled one)
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('related_invoice_id', invoiceId)
        .eq('payment_status', 'confirmed')
        .neq('id', paymentType); // Exclude the payment being cancelled
      
      if (paymentsError) {
        console.error('Error fetching payments for invoice:', paymentsError);
        return false;
      }
      
      // Calculate total paid amount
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      // Determine new status
      let newStatus;
      if (totalPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'unpaid';
      }
      
      // Update invoice status
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
      if (updateError) {
        console.error('Error updating invoice status:', updateError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error reverting invoice status:', error);
      return false;
    }
  }
}
