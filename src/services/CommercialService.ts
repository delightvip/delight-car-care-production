import { supabase } from '@/integrations/supabase/client';
import { Invoice, InvoiceItem, Payment, Return, ReturnItem, LedgerEntry } from './CommercialTypes';
import { toast } from 'sonner';

class CommercialService {
  private static instance: CommercialService;

  private constructor() {}

  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }

  async getParties() {
    return PartyService.getInstance().getParties();
  }

  async getInvoicesByParty(partyId: string) {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching invoices by party:', error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
    }
  }

  async getPaymentsByParty(partyId: string) {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching payments by party:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }

  async getLedgerEntries(partyId: string, startDate?: string, endDate?: string) {
    return this.ledgerService.getLedgerEntries(partyId, startDate, endDate);
  }

  async generateAccountStatement(startDate: string, endDate: string, partyType: string) {
    try {
      const ledgerService = LedgerService.getInstance();
      const statements = await ledgerService.generateAccountStatement(startDate, endDate, partyType);
      return {
        statements
      };
    } catch (error) {
      console.error('Error generating account statement:', error);
      toast.error('حدث خطأ أثناء إنشاء كشف الحساب');
      return {
        statements: []
      };
    }
  }

  async getInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Transform data to match Invoice type
      return (data || []).map(invoice => ({
        id: invoice.id,
        invoice_type: invoice.invoice_type as 'sale' | 'purchase',
        party_id: invoice.party_id,
        date: invoice.date,
        total_amount: invoice.total_amount,
        status: invoice.status as 'paid' | 'partial' | 'unpaid',
        payment_status: invoice.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: invoice.notes,
        created_at: invoice.created_at,
        // Transform invoice_items to items
        items: (invoice.invoice_items || []).map((item: any): InvoiceItem => ({
          id: item.id,
          invoice_id: item.invoice_id,
          item_id: item.item_id,
          item_type: item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          created_at: item.created_at
        }))
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
    }
  }

  async getPayments(): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Transform data to match Payment type
      return (data || []).map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        method: payment.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: payment.notes,
        created_at: payment.created_at
      }));
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }

  async getReturns(): Promise<Return[]> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('*, return_items(*)')
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Transform data to match Return type
      return (data || []).map(returnData => ({
        id: returnData.id,
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        date: returnData.date,
        return_type: returnData.return_type as 'sales_return' | 'purchase_return',
        amount: returnData.amount,
        payment_status: returnData.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: returnData.notes,
        created_at: returnData.created_at,
        items: (returnData.return_items || []).map((item: any) => ({
          id: item.id,
          return_id: item.return_id,
          item_id: item.item_id,
          item_type: item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          created_at: item.created_at
        }))
      }));
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Transform data to match Invoice type
      return {
        id: data.id,
        invoice_type: data.invoice_type as 'sale' | 'purchase',
        party_id: data.party_id,
        date: data.date,
        total_amount: data.total_amount,
        status: data.status as 'paid' | 'partial' | 'unpaid',
        payment_status: data.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: data.notes,
        created_at: data.created_at,
        // Transform invoice_items to items
        items: (data.invoice_items || []).map((item: any): InvoiceItem => ({
          id: item.id,
          invoice_id: item.invoice_id,
          item_id: item.item_id,
          item_type: item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          created_at: item.created_at
        }))
      };
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  }

  async addInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_type: invoice.invoice_type,
          party_id: invoice.party_id,
          date: invoice.date,
          total_amount: invoice.total_amount,
          status: invoice.status,
          payment_status: invoice.payment_status,
          notes: invoice.notes
        })
        .select('*')
        .single();

      if (invoiceError) throw invoiceError;

      // Add invoice items
      const itemsToAdd = invoice.items.map(item => ({
        invoice_id: invoiceData.id,
        item_id: item.item_id,
        item_type: item.item_type,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price
      }));

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToAdd)
        .select('*');

      if (itemsError) throw itemsError;

      toast.success('تمت إضافة الفاتورة بنجاح');

      return {
        id: invoiceData.id,
        invoice_type: invoiceData.invoice_type as 'sale' | 'purchase',
        party_id: invoiceData.party_id,
        date: invoiceData.date,
        total_amount: invoiceData.total_amount,
        status: invoiceData.status as 'paid' | 'partial' | 'unpaid',
        payment_status: invoiceData.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: invoiceData.notes,
        created_at: invoiceData.created_at,
        items: itemsData.map(item => ({
          id: item.id,
          invoice_id: item.invoice_id,
          item_id: item.item_id,
          item_type: item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          created_at: item.created_at
        }))
      };
    } catch (error) {
      console.error('Error adding invoice:', error);
      toast.error('حدث خطأ أثناء إضافة الفاتورة');
      return null;
    }
  }

  async updateInvoice(id: string, invoice: Partial<Invoice>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          invoice_type: invoice.invoice_type,
          party_id: invoice.party_id,
          date: invoice.date,
          total_amount: invoice.total_amount,
          status: invoice.status,
          payment_status: invoice.payment_status,
          notes: invoice.notes
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('تم تحديث الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('حدث خطأ أثناء تحديث الفاتورة');
      return false;
    }
  }

  async deleteInvoice(id: string): Promise<boolean> {
    try {
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
}

export default CommercialService;
