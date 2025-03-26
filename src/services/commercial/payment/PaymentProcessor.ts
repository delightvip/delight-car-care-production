
import { supabase } from "@/integrations/supabase/client";
import { Payment } from "@/services/CommercialTypes";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import InvoiceService from "../invoice/InvoiceService";
import { PaymentEntity } from "./PaymentEntity";

export class PaymentProcessor {
  private inventoryService: InventoryService;
  private partyService: PartyService;
  private invoiceService: InvoiceService;

  constructor() {
    // Use getInstance() instead of direct instantiation
    this.inventoryService = InventoryService.getInstance();
    this.partyService = PartyService.getInstance();
    this.invoiceService = InvoiceService.getInstance();
  }

  /**
   * Confirm a payment, update party balance and related invoice
   */
  public async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      const payment = await PaymentEntity.fetchById(paymentId);
      
      if (!payment) {
        console.error('Payment not found');
        return false;
      }
      
      if (payment.payment_status === 'confirmed') {
        console.log('Payment already confirmed');
        return true;
      }
      
      // Update party balance based on payment type
      if (payment.payment_type === 'collection') {
        // Collection (customer paying us)
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
          await this.invoiceService.updateInvoiceStatusAfterPayment(payment.related_invoice_id, payment.amount);
        }
      } else if (payment.payment_type === 'disbursement') {
        // Disbursement (we paying supplier)
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
          await this.invoiceService.updateInvoiceStatusAfterPayment(payment.related_invoice_id, payment.amount);
        }
      }
      
      // Update payment status to confirmed
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'confirmed' })
        .eq('id', paymentId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      return false;
    }
  }
  
  /**
   * Cancel a payment, reverse party balance and related invoice updates
   */
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      const payment = await PaymentEntity.fetchById(paymentId);
      
      if (!payment) {
        console.error('Payment not found');
        return false;
      }
      
      if (payment.payment_status !== 'confirmed') {
        console.error('Can only cancel confirmed payments');
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
          await this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(payment.related_invoice_id, payment.amount);
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
          await this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(payment.related_invoice_id, payment.amount);
        }
      }
      
      // Update payment status to cancelled
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'cancelled' })
        .eq('id', paymentId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      return false;
    }
  }
}
