import { supabase } from "@/integrations/supabase/client";
import { Payment, Invoice, Return, CommercialSummary } from './commercial/CommercialTypes';
import { toast } from "sonner";
import InvoiceService from "./commercial/invoice/InvoiceService";
import PaymentService from "./commercial/payment/PaymentService";
import ReturnService from "./commercial/return/ReturnService";
import LedgerService from "./commercial/ledger/LedgerService";

export { Payment, Invoice, Return, CommercialSummary } from './commercial/CommercialTypes';

class CommercialService {
  private static instance: CommercialService;
  private invoiceService: InvoiceService;
  private paymentService: PaymentService;
  private returnService: ReturnService;
  private ledgerService: LedgerService;
  
  private constructor() {
    this.invoiceService = InvoiceService.getInstance();
    this.paymentService = PaymentService.getInstance();
    this.returnService = ReturnService.getInstance();
    this.ledgerService = LedgerService.getInstance();
  }
  
  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }
  
  // Invoice methods
  async getInvoices(): Promise<Invoice[]> {
    return this.invoiceService.getInvoices();
  }
  
  async getInvoiceById(id: string): Promise<Invoice | null> {
    return this.invoiceService.getInvoiceById(id);
  }
  
  async getInvoicesByParty(partyId: string): Promise<Invoice[]> {
    return this.invoiceService.getInvoicesByParty(partyId);
  }
  
  async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    return this.invoiceService.createInvoice(invoiceData);
  }
  
  async confirmInvoice(id: string): Promise<boolean> {
    return this.invoiceService.confirmInvoice(id);
  }
  
  async cancelInvoice(id: string): Promise<boolean> {
    return this.invoiceService.cancelInvoice(id);
  }
  
  async deleteInvoice(id: string): Promise<boolean> {
    return this.invoiceService.deleteInvoice(id);
  }
  
  // Payment methods
  async getPayments(): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, parties:party_id (name)')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map((payment: any) => ({
        ...payment,
        party_name: payment.parties?.name || 'Unknown'
      })) as Payment[];
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }
  
  async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, parties:party_id (name)')
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map((payment: any) => ({
        ...payment,
        party_name: payment.parties?.name || 'Unknown'
      })) as Payment[];
    } catch (error) {
      console.error(`Error fetching payments for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }
  
  async createPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          party_id: paymentData.party_id,
          payment_type: paymentData.payment_type,
          amount: paymentData.amount,
          date: paymentData.date,
          related_invoice_id: paymentData.related_invoice_id,
          payment_status: paymentData.payment_status || 'draft',
          method: paymentData.method || 'cash',
          notes: paymentData.notes || ''
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // If payment is confirmed and related to an invoice, update invoice status
      if (paymentData.payment_status === 'confirmed' && paymentData.related_invoice_id) {
        await this.invoiceService.updateInvoiceStatusAfterPayment(
          paymentData.related_invoice_id,
          paymentData.amount
        );
      }
      
      toast.success('تم إنشاء الدفعة بنجاح');
      return data as Payment;
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('حدث خطأ أثناء إنشاء الدفعة');
      return null;
    }
  }
  
  async confirmPayment(id: string): Promise<boolean> {
    try {
      // First get payment details to check related invoice
      const payment = await this.paymentService.getPaymentById(id);
      if (!payment) return false;
      
      const { error } = await supabase
        .from('payments')
        .update({
          payment_status: 'confirmed'
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // If payment is related to an invoice, update invoice status
      if (payment.related_invoice_id) {
        await this.invoiceService.updateInvoiceStatusAfterPayment(
          payment.related_invoice_id,
          payment.amount
        );
      }
      
      toast.success('تم تأكيد الدفعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('حدث خطأ أثناء تأكيد الدفعة');
      return false;
    }
  }
  
  async cancelPayment(id: string): Promise<boolean> {
    try {
      // First get payment details to check related invoice
      const payment = await this.paymentService.getPaymentById(id);
      if (!payment) return false;
      
      const { error } = await supabase
        .from('payments')
        .update({
          payment_status: 'cancelled'
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // If payment is related to an invoice, update invoice status
      if (payment.related_invoice_id) {
        await this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(payment.related_invoice_id);
      }
      
      toast.success('تم إلغاء الدفعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error('حدث خطأ أثناء إلغاء الدفعة');
      return false;
    }
  }
  
  async deletePayment(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف الدفعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('حدث خطأ أثناء حذف الدفعة');
      return false;
    }
  }
  
  // Return methods
  async getReturns(): Promise<Return[]> {
    return this.returnService.getReturns();
  }
  
  // Commercial summary methods
  async getCommercialSummary(startDate?: string, endDate?: string): Promise<CommercialSummary> {
    try {
      // Default to last 30 days if no dates provided
      const end = endDate || new Date().toISOString().split('T')[0];
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Get sales invoices
      const { data: salesInvoices, error: salesError } = await supabase
        .from('invoices')
        .select('id, total_amount, party_id, parties:party_id (name)')
        .eq('invoice_type', 'sale')
        .eq('payment_status', 'confirmed')
        .gte('date', start)
        .lte('date', end);
      
      if (salesError) throw salesError;
      
      // Get purchase invoices
      const { data: purchaseInvoices, error: purchaseError } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('invoice_type', 'purchase')
        .eq('payment_status', 'confirmed')
        .gte('date', start)
        .lte('date', end);
      
      if (purchaseError) throw purchaseError;
      
      // Get returns
      const { data: returns, error: returnsError } = await supabase
        .from('returns')
        .select('amount')
        .eq('payment_status', 'confirmed')
        .gte('date', start)
        .lte('date', end);
      
      if (returnsError) throw returnsError;
      
      // Calculate totals
      const totalSales = salesInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
      const totalPurchases = purchaseInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
      const totalReturns = returns.reduce((sum, ret) => sum + ret.amount, 0);
      
      // Get top customers
      const customerMap = new Map();
      salesInvoices.forEach(invoice => {
        const customerId = invoice.party_id;
        const customerName = invoice.parties?.name || 'Unknown';
        const total = invoice.total_amount;
        
        if (customerMap.has(customerId)) {
          const customer = customerMap.get(customerId);
          customer.total += total;
        } else {
          customerMap.set(customerId, { id: customerId, name: customerName, total });
        }
      });
      
      const topCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      
      // Get recent invoices
      const recentInvoices = await this.getInvoices();
      
      // Get top products - would need to join with invoice_items which requires more complex query
      // Simplified version:
      const topProducts = [];
      
      return {
        totalSales,
        totalPurchases,
        totalReturns,
        topCustomers,
        topProducts,
        recentInvoices: recentInvoices.slice(0, 5)
      };
    } catch (error) {
      console.error('Error getting commercial summary:', error);
      toast.error('حدث خطأ أثناء جلب ملخص المبيعات');
      
      return {
        totalSales: 0,
        totalPurchases: 0,
        totalReturns: 0,
        topCustomers: [],
        topProducts: [],
        recentInvoices: []
      };
    }
  }
  
  // Ledger entries
  async getLedgerEntries(partyId: string): Promise<any[]> {
    return this.ledgerService.getLedgerEntriesByParty(partyId);
  }
  
  // Account statement
  async generateAccountStatement(partyId: string, startDate: string, endDate: string): Promise<any> {
    return this.ledgerService.generateAccountStatement(partyId, startDate, endDate);
  }
}

export default CommercialService;
