
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
      console.log('Starting payment confirmation process:', paymentId);
      
      // استخدام خدمة تأكيد الدفعات للقيام بالعمل الفعلي
      const success = await this.paymentConfirmationService.confirmPayment(paymentId);
      
      if (success) {
        console.log('Payment confirmation completed successfully:', paymentId);
        return true;
      } else {
        console.error('Payment confirmation failed with error from service:', paymentId);
        return false;
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      return false;
    }
  }
  
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      console.log('Starting payment cancellation process:', paymentId);
      
      // استخدام خدمة تأكيد الدفعات للقيام بالعمل الفعلي
      const success = await this.paymentConfirmationService.cancelPayment(paymentId);
      
      if (success) {
        console.log('Payment cancellation completed successfully:', paymentId);
        return true;
      } else {
        console.error('Payment cancellation failed with error from service:', paymentId);
        return false;
      }
    } catch (error) {
      console.error('Error cancelling payment:', error);
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
      
      if (fetchError) {
        console.error('Error fetching payment data:', fetchError);
        throw fetchError;
      }
      
      if (payment.payment_status !== 'draft') {
        console.warn('Cannot update non-draft payment:', id);
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
      
      if (error) {
        console.error('Error updating payment:', error);
        throw error;
      }
      
      console.log('Payment updated successfully:', id);
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
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
      
      if (fetchError) {
        console.error('Error fetching payment data for deletion:', fetchError);
        throw fetchError;
      }
      
      if (payment.payment_status !== 'draft') {
        console.warn('Cannot delete non-draft payment:', id);
        return false;
      }
      
      const { error } = await this.supabase
        .from('payments')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting payment:', error);
        throw error;
      }
      
      console.log('Payment deleted successfully:', id);
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      return false;
    }
  }
}

export default PaymentProcessingService;
