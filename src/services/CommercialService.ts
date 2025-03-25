import { createClient, PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

export interface Invoice {
  id: string;
  party_id?: string;
  party_name?: string;
  date: string | Date;
  invoice_type: 'sale' | 'purchase';
  total_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  notes?: string;
  created_at: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_id?: number;
  item_name: string;
  item_type: 'finished_products' | 'packaging_materials' | 'semi_finished_products' | 'raw_materials';
  quantity: number;
  unit_price: number;
  total?: number;
  created_at?: string;
}

export interface Payment {
  id: string;
  payment_type: 'collection' | 'disbursement';
  party_id: string;
  party_name?: string;
  method: string;
  amount: number;
  related_invoice_id?: string;
  date: string | Date;
  notes?: string;
  created_at?: string;
}

export interface ReturnItem {
  item_id: number;
  item_type: 'finished_products' | 'packaging_materials' | 'semi_finished_products' | 'raw_materials';
  item_name: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

export interface Return {
  id: string;
  return_type: "sales_return" | "purchase_return";
  invoice_id?: string;
  date: string;
  amount: number;
  notes?: string;
  created_at?: string;
  items?: ReturnItem[];
}

export interface LedgerEntry {
  id: string;
  party_id: string;
  party_name?: string;
  party_type: 'customer' | 'supplier' | 'other';
  date: string;
  transaction_id: string;
  transaction_type: string;
  debit: number;
  credit: number;
  balance_after: number;
}

class CommercialService {
  private static instance: CommercialService;
  private supabase: SupabaseClient;

  private constructor() {
    this.supabase = supabase;
  }

  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }

  public async getInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select(`
          *,
          parties!invoices_party_id_fkey (name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      return data.map(invoice => ({
        id: invoice.id,
        party_id: invoice.party_id,
        party_name: invoice.parties?.name,
        date: invoice.date,
        invoice_type: invoice.invoice_type as 'sale' | 'purchase',
        total_amount: invoice.total_amount || 0,
        status: invoice.status as 'paid' | 'partial' | 'unpaid',
        notes: invoice.notes || '',
        created_at: invoice.created_at
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
    }
  }

  public async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select(`
          *,
          parties!invoices_party_id_fkey (name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        party_id: data.party_id,
        party_name: data.parties?.name,
        date: data.date,
        invoice_type: data.invoice_type as 'sale' | 'purchase',
        total_amount: data.total_amount || 0,
        status: data.status as 'paid' | 'partial' | 'unpaid',
        notes: data.notes || '',
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الفاتورة');
      return null;
    }
  }

  public async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    try {
      const { data, error } = await this.supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        invoice_id: item.invoice_id,
        item_id: item.item_id,
        item_name: item.item_name,
        item_type: item.item_type as 'finished_products' | 'packaging_materials' | 'semi_finished_products' | 'raw_materials',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total || item.quantity * item.unit_price,
        created_at: item.created_at
      }));
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      toast.error('حدث خطأ أثناء جلب عناصر الفاتورة');
      return [];
    }
  }

  public async getInvoicesByParty(partyId: string): Promise<Invoice[]> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select(`
          *,
          parties!invoices_party_id_fkey (name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });

      if (error) throw error;

      return data.map(invoice => ({
        id: invoice.id,
        party_id: invoice.party_id,
        party_name: invoice.parties?.name,
        date: invoice.date,
        invoice_type: invoice.invoice_type as 'sale' | 'purchase',
        total_amount: invoice.total_amount || 0,
        status: invoice.status as 'paid' | 'partial' | 'unpaid',
        notes: invoice.notes || '',
        created_at: invoice.created_at
      }));
    } catch (error) {
      console.error('Error fetching invoices by party:', error);
      toast.error('حدث خطأ أثناء جلب فواتير الطرف التجاري');
      return [];
    }
  }

  public async createInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      const dateStr = typeof invoice.date === 'string' ? 
        invoice.date : 
        invoice.date.toISOString().split('T')[0];

      const { data: invoiceData, error: invoiceError } = await this.supabase
        .from('invoices')
        .insert({
          party_id: invoice.party_id,
          date: dateStr,
          invoice_type: invoice.invoice_type,
          status: invoice.status,
          notes: invoice.notes
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      if (invoice.items && invoice.items.length > 0) {
        const invoiceItems = invoice.items.map(item => ({
          invoice_id: invoiceData.id,
          item_id: item.item_id,
          item_name: item.item_name,
          item_type: item.item_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price
        }));
        
        const { error: itemsError } = await this.supabase
          .from('invoice_items')
          .insert(invoiceItems);
        
        if (itemsError) throw itemsError;
      }

      if (invoice.party_id) {
        const partyService = (await import('./PartyService')).default.getInstance();
        const isDebit = invoice.invoice_type === 'sale';

        await partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          isDebit,
          isDebit ? 'فاتورة مبيعات' : 'فاتورة مشتريات',
          isDebit ? 'sale_invoice' : 'purchase_invoice',
          invoiceData.id
        );
      }

      toast.success('تم إنشاء الفاتورة بنجاح');
      return this.getInvoiceById(invoiceData.id);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
      return null;
    }
  }

  public async updateInvoice(id: string, invoiceData: Partial<Omit<Invoice, 'id' | 'created_at'>>): Promise<boolean> {
    try {
      const dateStr = typeof invoiceData.date === 'string' ? 
        invoiceData.date : 
        invoiceData.date?.toISOString().split('T')[0];
      
      const { error } = await this.supabase
        .from('invoices')
        .update({
          party_id: invoiceData.party_id,
          date: dateStr,
          invoice_type: invoiceData.invoice_type,
          status: invoiceData.status,
          notes: invoiceData.notes,
          total_amount: invoiceData.total_amount
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

  public async deleteInvoice(id: string): Promise<boolean> {
    try {
      const { error: itemsError } = await this.supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);
      
      if (itemsError) throw itemsError;
      
      const { error } = await this.supabase
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

  public async updateInvoiceStatus(invoiceId: string, status: 'paid' | 'partial' | 'unpaid'): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('invoices')
        .update({ status: status })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      toast.success('تم تحديث حالة الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
      return false;
    }
  }

  public async updateInvoicePaymentStatus(invoiceId: string): Promise<void> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) throw new Error('الفاتورة غير موجودة');
      
      const totalAmount = invoice.total_amount;
      
      const { data: payments, error: paymentsError } = await this.supabase
        .from('payments')
        .select('amount')
        .eq('related_invoice_id', invoiceId);
      
      if (paymentsError) throw paymentsError;
      
      const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (totalPayments >= totalAmount) {
        newStatus = 'paid';
      } else if (totalPayments > 0) {
        newStatus = 'partial';
      }
      
      await this.updateInvoiceStatus(invoiceId, newStatus);
    } catch (error) {
      console.error('Error updating invoice payment status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة دفع الفاتورة');
    }
  }

  public async getPayments(): Promise<Payment[]> {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select(`
          *,
          parties!payments_party_id_fkey (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        notes: payment.notes || '',
        created_at: payment.created_at
      }));
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }

  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .select(`
          *,
          parties!payments_party_id_fkey (name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        notes: payment.notes || '',
        created_at: payment.created_at
      }));
    } catch (error) {
      console.error('Error fetching payments by party:', error);
      toast.error('حدث خطأ أثناء جلب مدفوعات الطرف التجاري');
      return [];
    }
  }

  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at' | 'party_name'>): Promise<Payment | null> {
    try {
      const dateStr = typeof paymentData.date === 'string' ? 
        paymentData.date : 
        paymentData.date.toISOString().split('T')[0];
      
      const { data: payment, error: paymentError } = await this.supabase
        .from('payments')
        .insert({
          party_id: paymentData.party_id,
          date: dateStr,
          amount: paymentData.amount,
          payment_type: paymentData.payment_type,
          method: paymentData.method,
          related_invoice_id: paymentData.related_invoice_id,
          notes: paymentData.notes
        })
        .select()
        .single();
      
      if (paymentError) throw paymentError;
      
      const partyService = (await import('./PartyService')).default.getInstance();
      const isDebit = paymentData.payment_type === 'disbursement';
      
      await partyService.updatePartyBalance(
        paymentData.party_id,
        paymentData.amount,
        isDebit,
        isDebit ? 'دفعة مسددة' : 'دفعة مستلمة',
        isDebit ? 'payment_made' : 'payment_received',
        payment.id
      );
      
      if (paymentData.related_invoice_id) {
        await this.updateInvoicePaymentStatus(paymentData.related_invoice_id);
      }
      
      toast.success(`تم تسجيل ${paymentData.payment_type === 'collection' ? 'التحصيل' : 'السداد'} بنجاح`);
      
      const typedPayment: Payment = {
        id: payment.id,
        party_id: payment.party_id,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        notes: payment.notes,
        created_at: payment.created_at
      };
      
      return typedPayment;
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
      return null;
    }
  }

  public async updatePayment(id: string, paymentData: Partial<Omit<Payment, 'id' | 'created_at' | 'party_name'>>): Promise<boolean> {
    try {
      const dateStr = typeof paymentData.date === 'string' ? 
        paymentData.date : 
        paymentData.date?.toISOString().split('T')[0];
      
      const { error } = await this.supabase
        .from('payments')
        .update({
          party_id: paymentData.party_id,
          date: dateStr,
          amount: paymentData.amount,
          payment_type: paymentData.payment_type,
          method: paymentData.method,
          related_invoice_id: paymentData.related_invoice_id,
          notes: paymentData.notes
        })
        .eq('id', id);
      
      if (error) throw error;
      
      if (paymentData.related_invoice_id) {
        await this.updateInvoicePaymentStatus(paymentData.related_invoice_id);
      }
      
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
      const { error } = await this.supabase
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

  public async getReturns(): Promise<Return[]> {
    try {
      const { data, error } = await this.supabase
        .from('returns')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(ret => ({
        id: ret.id,
        invoice_id: ret.invoice_id,
        invoice_number: ret.invoice_id,
        date: ret.date,
        return_type: ret.return_type as 'sales_return' | 'purchase_return',
        amount: ret.amount,
        notes: ret.notes || '',
        created_at: ret.created_at
      }));
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }

  public async getReturnsByInvoice(invoiceId: string): Promise<Return[]> {
    try {
      const { data, error } = await this.supabase
        .from('returns')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(ret => ({
        id: ret.id,
        invoice_id: ret.invoice_id,
        invoice_number: ret.invoice_id,
        date: ret.date,
        return_type: ret.return_type as 'sales_return' | 'purchase_return',
        amount: ret.amount,
        notes: ret.notes || '',
        created_at: ret.created_at
      }));
    } catch (error) {
      console.error('Error fetching returns by invoice:', error);
      toast.error('حدث خطأ أثناء جلب مرتجعات الفاتورة');
      return [];
    }
  }

  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      const dateStr = typeof returnData.date === 'string' ? 
        returnData.date : 
        new Date(returnData.date).toISOString().split('T')[0];

      const { data: returnRecord, error: returnError } = await this.supabase
        .from('returns')
        .insert({
          invoice_id: returnData.invoice_id,
          date: dateStr,
          return_type: returnData.return_type,
          amount: returnData.amount,
          notes: returnData.notes
        })
        .select()
        .single();
      
      if (returnError) throw returnError;
      
      if (returnData.invoice_id) {
        const { data: invoice, error: invoiceError } = await this.supabase
          .from('invoices')
          .select('party_id, invoice_type')
          .eq('id', returnData.invoice_id)
          .single();
        
        if (invoiceError) throw invoiceError;
        
        if (invoice && invoice.party_id) {
          const partyService = (await import('./PartyService')).default.getInstance();
          
          const isDebit = returnData.return_type === 'purchase_return';
          
          await partyService.updatePartyBalance(
            invoice.party_id,
            returnData.amount,
            isDebit,
            returnData.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات',
            returnData.return_type,
            returnRecord.id
          );
        }
      }
      
      const typedReturn: Return = {
        id: returnRecord.id,
        invoice_id: returnRecord.invoice_id,
        date: returnRecord.date,
        return_type: returnRecord.return_type as 'sales_return' | 'purchase_return',
        amount: returnRecord.amount,
        notes: returnRecord.notes,
        created_at: returnRecord.created_at,
        items: returnData.items
      };
      
      toast.success('تم تسجيل المرتجع بنجاح');
      return typedReturn;
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء تسجيل المرتجع');
      return null;
    }
  }

  public async recordReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    return this.createReturn(returnData);
  }

  public async updateReturn(id: string, returnData: Partial<Omit<Return, 'id' | 'created_at'>>): Promise<boolean> {
    try {
      const dateStr = typeof returnData.date === 'string' ? 
        returnData.date : 
        returnData.date ? new Date(returnData.date).toISOString().split('T')[0] : undefined;
      
      const { error } = await this.supabase
        .from('returns')
        .update({
          invoice_id: returnData.invoice_id,
          date: dateStr,
          return_type: returnData.return_type,
          amount: returnData.amount,
          notes: returnData.notes
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating return:', error);
      toast.error('حدث خطأ أثناء تحديث المرتجع');
      return false;
    }
  }

  public async deleteReturn(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('returns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
      return false;
    }
  }

  public async getLedgerEntries(filters: any = {}): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('ledger')
        .select(`
          *,
          parties!ledger_party_id_fkey (name, type)
        `)
        .eq('party_id', filters.party_id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(entry => ({
        id: entry.id,
        party_id: entry.party_id,
        party_name: entry.parties?.name,
        party_type: entry.parties?.type as 'customer' | 'supplier' | 'other',
        date: entry.date,
        transaction_id: entry.transaction_id,
        transaction_type: entry.transaction_type,
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        balance_after: entry.balance_after
      }));
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      toast.error('حدث خطأ أثناء جلب سجل القيود اليومية');
      return [];
    }
  }
}

export default CommercialService;
