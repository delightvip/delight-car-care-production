
import BaseCommercialService from './BaseCommercialService';
import { Payment } from '../CommercialTypes';
import { toast } from "sonner";
import { format } from 'date-fns';
import InvoiceService from './InvoiceService';

class PaymentService extends BaseCommercialService {
  private static instance: PaymentService;
  private invoiceService: InvoiceService;
  
  private constructor() {
    super();
    this.invoiceService = InvoiceService.getInstance();
  }
  
  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }
  
  public async getPayments(): Promise<Payment[]> {
    try {
      let { data, error } = await this.supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const paymentsWithParties = data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type,
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status || 'draft',
        notes: payment.notes,
        created_at: payment.created_at
      }));
      
      return paymentsWithParties;
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }
  
  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    try {
      let { data, error } = await this.supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const paymentsWithParties = data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type,
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status || 'draft',
        notes: payment.notes,
        created_at: payment.created_at
      }));
      
      return paymentsWithParties;
    } catch (error) {
      console.error(`Error fetching payments for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }
  
  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      // Format date if it's a Date object
      const formattedDate = paymentData.date instanceof Date ? 
        format(paymentData.date, 'yyyy-MM-dd') : 
        paymentData.date;
        
      // Set default payment status to draft
      const paymentStatus = paymentData.payment_status || 'draft';
      
      const { data: payment, error } = await this.supabase
        .from('payments')
        .insert({
          party_id: paymentData.party_id,
          date: formattedDate,
          amount: paymentData.amount,
          payment_type: paymentData.payment_type,
          method: paymentData.method,
          related_invoice_id: paymentData.related_invoice_id,
          payment_status: paymentStatus,
          notes: paymentData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Get party details for response
      const party = await this.partyService.getPartyById(paymentData.party_id);
      
      toast.success('تم تسجيل المعاملة بنجاح');
      
      return {
        id: payment.id,
        party_id: payment.party_id,
        party_name: party?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type,
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        payment_status: paymentStatus,
        notes: payment.notes,
        created_at: payment.created_at
      };
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة');
      return null;
    }
  }
  
  public async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      const { data: payment, error: fetchError } = await this.supabase
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
      const { error } = await this.supabase
        .from('payments')
        .update({ payment_status: 'confirmed' })
        .eq('id', paymentId);
      
      if (error) throw error;
      
      toast.success('تم تأكيد المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('حدث خطأ أثناء تأكيد المعاملة');
      return false;
    }
  }
  
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      const { data: payment, error: fetchError } = await this.supabase
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
      const { error } = await this.supabase
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
  
  public async updatePayment(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<boolean> {
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
      const formattedDate = paymentData.date instanceof Date ? 
        format(paymentData.date, 'yyyy-MM-dd') : 
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

export default PaymentService;
