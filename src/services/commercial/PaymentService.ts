
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
      
      // Make sure to properly type the data
      const typedData = data as any[];
      
      const paymentsWithParties = typedData.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        method: payment.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        related_invoice_id: payment.related_invoice_id,
        payment_status: (payment.payment_status || 'draft') as 'draft' | 'confirmed' | 'cancelled',
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
      
      // Make sure to properly type the data
      const typedData = data as any[];
      
      const paymentsWithParties = typedData.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        method: payment.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        payment_status: (payment.payment_status || 'draft') as 'draft' | 'confirmed' | 'cancelled',
        related_invoice_id: payment.related_invoice_id,
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
      const formattedDate = typeof paymentData.date === 'object' ? 
        format(paymentData.date, 'yyyy-MM-dd') : 
        paymentData.date;
        
      // Set default payment status to draft
      const paymentStatus = paymentData.payment_status || 'draft' as 'draft' | 'confirmed' | 'cancelled';
      
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
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        method: payment.method as 'cash' | 'check' | 'bank_transfer' | 'other',
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
  
  // Add methods needed for CommercialService
  public async confirmPayment(paymentId: string): Promise<boolean> {
    // Placeholder implementation
    console.log(`Confirming payment: ${paymentId}`);
    return true;
  }

  public async cancelPayment(paymentId: string): Promise<boolean> {
    // Placeholder implementation
    console.log(`Cancelling payment: ${paymentId}`);
    return true;
  }

  public async updatePayment(id: string, paymentData: Partial<Payment>): Promise<boolean> {
    // Placeholder implementation
    console.log(`Updating payment: ${id}`);
    return true;
  }

  public async deletePayment(id: string): Promise<boolean> {
    // Placeholder implementation
    console.log(`Deleting payment: ${id}`);
    return true;
  }
}

export default PaymentService;
