
import { supabase } from "@/integrations/supabase/client";
import InventoryService from '@/services/InventoryService';
import PartyService from '@/services/PartyService';
import { Return, Invoice, Payment, LedgerEntry } from './CommercialTypes';
import { toast } from "sonner";

class CommercialService {
  private static instance: CommercialService;
  private partyService: PartyService;
  private inventoryService: InventoryService;
  
  private constructor() {
    this.partyService = PartyService.getInstance();
    this.inventoryService = InventoryService.getInstance();
  }
  
  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }
  
  // Invoices methods
  public async getInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties:party_id (name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get items for each invoice
      const invoicesWithItems = await Promise.all(
        (data || []).map(async (invoice) => {
          const { data: items, error: itemsError } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoice.id);
          
          if (itemsError) throw itemsError;
          
          return {
            ...invoice,
            party_name: invoice.parties?.name,
            items: items || []
          } as Invoice;
        })
      );
      
      return invoicesWithItems;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
    }
  }
  
  public async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id);
      
      if (itemsError) throw itemsError;
      
      return {
        ...data,
        party_name: data.parties?.name,
        items: items || []
      } as Invoice;
    } catch (error) {
      console.error(`Error fetching invoice with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب تفاصيل الفاتورة');
      return null;
    }
  }
  
  public async createInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      // Create invoice record
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          invoice_type: invoice.invoice_type,
          party_id: invoice.party_id,
          date: invoice.date,
          status: invoice.status,
          payment_status: invoice.payment_status,
          total_amount: invoice.total_amount,
          notes: invoice.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create invoice items
      if (invoice.items && invoice.items.length > 0) {
        const invoiceItems = invoice.items.map(item => ({
          invoice_id: data.id,
          item_id: item.item_id,
          item_name: item.item_name,
          item_type: item.item_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price
        }));
        
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);
        
        if (itemsError) throw itemsError;
      }
      
      toast.success('تم إنشاء الفاتورة بنجاح');
      
      // Get party name for response
      const party = invoice.party_id ? 
        await this.partyService.getPartyById(invoice.party_id) : null;
      
      return {
        ...data,
        party_name: party?.name,
        items: invoice.items
      } as Invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
      return null;
    }
  }
  
  // Add missing methods for invoices
  public async deleteInvoice(id: string): Promise<boolean> {
    try {
      // Check status before deletion
      const { data: invoiceData, error: fetchError } = await supabase
        .from('invoices')
        .select('payment_status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (invoiceData.payment_status !== 'draft') {
        toast.error('يمكن حذف الفواتير في حالة المسودة فقط');
        return false;
      }
      
      // Delete invoice items first
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);
      
      if (itemsError) throw itemsError;
      
      // Delete invoice
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('حدث خطأ أثناء حذف الفاتورة');
      return false;
    }
  }
  
  public async confirmInvoice(id: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoiceById(id);
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoice.payment_status === 'confirmed') {
        toast.info('الفاتورة مؤكدة بالفعل');
        return true;
      }
      
      // Update invoice status
      const { error } = await supabase
        .from('invoices')
        .update({ payment_status: 'confirmed' })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تأكيد الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد الفاتورة');
      return false;
    }
  }
  
  public async cancelInvoice(id: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoiceById(id);
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoice.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء الفواتير المؤكدة فقط');
        return false;
      }
      
      // Update invoice status
      const { error } = await supabase
        .from('invoices')
        .update({ payment_status: 'cancelled' })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم إلغاء الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast.error('حدث خطأ أثناء إلغاء الفاتورة');
      return false;
    }
  }
  
  // Add methods to get invoices by party
  public async getInvoicesByParty(partyId: string): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching invoices by party:', error);
      toast.error('حدث خطأ أثناء جلب فواتير الطرف');
      return [];
    }
  }
  
  // Payments methods
  public async getPayments(): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties:party_id (name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(payment => ({
        ...payment,
        party_name: payment.parties?.name,
        payment_type: payment.payment_type as "collection" | "disbursement",
        payment_status: payment.payment_status as "draft" | "confirmed" | "cancelled"
      }));
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }
  
  public async getPaymentById(id: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        party_name: data.parties?.name,
        payment_type: data.payment_type as "collection" | "disbursement",
        payment_status: data.payment_status as "draft" | "confirmed" | "cancelled"
      };
    } catch (error) {
      console.error(`Error fetching payment with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب تفاصيل المدفوعات');
      return null;
    }
  }
  
  // Add missing payment methods
  public async recordPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          payment_type: payment.payment_type,
          party_id: payment.party_id,
          amount: payment.amount,
          date: payment.date,
          method: payment.method,
          payment_status: payment.payment_status,
          related_invoice_id: payment.related_invoice_id,
          notes: payment.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('تم تسجيل الدفعة بنجاح');
      
      // Get party info
      const party = payment.party_id ? 
        await this.partyService.getPartyById(payment.party_id) : null;
      
      return {
        ...data,
        party_name: party?.name,
        payment_status: data.payment_status as "draft" | "confirmed" | "cancelled"
      };
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
      return null;
    }
  }
  
  public async updatePayment(id: string, payment: Partial<Payment>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payments')
        .update(payment)
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث الدفعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('حدث خطأ أثناء تحديث الدفعة');
      return false;
    }
  }
  
  public async deletePayment(id: string): Promise<boolean> {
    try {
      const { data: paymentData, error: fetchError } = await supabase
        .from('payments')
        .select('payment_status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (paymentData.payment_status !== 'draft') {
        toast.error('يمكن حذف الدفعات في حالة المسودة فقط');
        return false;
      }
      
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
  
  public async confirmPayment(id: string): Promise<boolean> {
    try {
      const payment = await this.getPaymentById(id);
      if (!payment) {
        toast.error('لم يتم العثور على الدفعة');
        return false;
      }
      
      if (payment.payment_status === 'confirmed') {
        toast.info('الدفعة مؤكدة بالفعل');
        return true;
      }
      
      // Update payment status
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'confirmed' })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تأكيد الدفعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('حدث خطأ أثناء تأكيد الدفعة');
      return false;
    }
  }
  
  public async cancelPayment(id: string): Promise<boolean> {
    try {
      const payment = await this.getPaymentById(id);
      if (!payment) {
        toast.error('لم يتم العثور على الدفعة');
        return false;
      }
      
      if (payment.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء الدفعات المؤكدة فقط');
        return false;
      }
      
      // Update payment status
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'cancelled' })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم إلغاء الدفعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error('حدث خطأ أثناء إلغاء الدفعة');
      return false;
    }
  }
  
  // Add payments by party
  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data?.map(payment => ({
        ...payment,
        payment_status: payment.payment_status as "draft" | "confirmed" | "cancelled"
      })) || [];
    } catch (error) {
      console.error('Error fetching payments by party:', error);
      toast.error('حدث خطأ أثناء جلب مدفوعات الطرف');
      return [];
    }
  }
  
  // Ledger methods
  public async getLedgerEntries(partyId: string): Promise<LedgerEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error(`Error fetching ledger entries for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء جلب سجل الحساب');
      return [];
    }
  }
  
  // Add account statement generation method
  public async generateAccountStatement(partyId: string, startDate: string, endDate: string): Promise<LedgerEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error(`Error generating account statement for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء إنشاء كشف الحساب');
      return [];
    }
  }
}

export default CommercialService;
export type { Return, Invoice, InvoiceItem, Payment, ReturnItem, Party, LedgerEntry } from './CommercialTypes';
