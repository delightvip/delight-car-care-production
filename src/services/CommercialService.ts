import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import PartyService from './PartyService';
import InventoryService from './InventoryService';

export interface Invoice {
  id: string;
  invoice_type: 'sale' | 'purchase';
  party_id: string;
  party_name?: string;
  date: string;
  total_amount: number;
  items: InvoiceItem[];
  status: 'paid' | 'partial' | 'unpaid';
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  notes?: string;
  created_at?: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_id: number;
  item_type: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
  item_name: string;
  quantity: number;
  unit_price: number;
  total?: number;
  created_at?: string;
}

export interface Payment {
  id: string;
  party_id: string;
  party_name?: string;
  date: string;
  amount: number;
  payment_type: 'collection' | 'disbursement';
  method: 'cash' | 'check' | 'bank_transfer' | 'other';
  related_invoice_id?: string;
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  notes?: string;
  created_at?: string;
}

export interface Return {
  id: string;
  invoice_id?: string;
  party_id?: string;
  party_name?: string;
  date: string;
  return_type: 'sales_return' | 'purchase_return';
  amount: number;
  items?: ReturnItem[];
  payment_status: 'draft' | 'confirmed' | 'cancelled';
  notes?: string;
  created_at?: string;
}

export interface ReturnItem {
  id?: string;
  return_id?: string;
  item_id: number;
  item_type: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
  item_name: string;
  quantity: number;
  unit_price: number;
  total?: number;
  created_at?: string;
}

export interface LedgerEntry {
  id: string;
  party_id: string;
  party_name?: string;
  transaction_id?: string;
  transaction_type: string;
  date: string;
  debit: number;
  credit: number;
  balance_after: number;
  created_at?: string;
  notes?: string;
}

class CommercialService {
  private static instance: CommercialService;
  private supabase: SupabaseClient;
  private partyService: PartyService;
  private inventoryService: InventoryService;

  private constructor() {
    this.supabase = supabase;
    this.partyService = PartyService.getInstance();
    this.inventoryService = InventoryService.getInstance();
  }
  
  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }
  
  private getTransactionDescription(transaction_type: string): string {
    const descriptions: { [key: string]: string } = {
      'sale_invoice': 'فاتورة مبيعات',
      'purchase_invoice': 'فاتورة مشتريات',
      'payment_received': 'دفعة مستلمة',
      'payment_made': 'دفعة مدفوعة',
      'sales_return': 'مرتجع مبيعات',
      'purchase_return': 'مرتجع مشتريات',
      'opening_balance': 'رصيد افتتاحي',
      'cancel_sale_invoice': 'إلغاء فاتورة مبيعات',
      'cancel_purchase_invoice': 'إلغاء فاتورة مشتريات',
      'cancel_payment_received': 'إلغاء دفعة مستلمة',
      'cancel_payment_made': 'إلغاء دفعة مدفوعة',
      'cancel_sales_return': 'إلغاء مرتجع مبيعات',
      'cancel_purchase_return': 'إلغاء مرتجع مشتريات',
      'invoice_amount_adjustment': 'تعديل قيمة فاتورة',
      'opening_balance_update': 'تعديل الرصيد الافتتاحي'
    };
    
    return descriptions[transaction_type] || transaction_type;
  }
  
  public async getInvoices(): Promise<Invoice[]> {
    try {
      let { data, error } = await this.supabase
        .from('invoices')
        .select(`
          *,
          parties (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const invoicesWithParties = data.map(invoice => ({
        id: invoice.id,
        invoice_type: invoice.invoice_type,
        party_id: invoice.party_id,
        party_name: invoice.parties?.name,
        date: invoice.date,
        total_amount: invoice.total_amount,
        status: invoice.status,
        payment_status: invoice.payment_status || 'draft',
        notes: invoice.notes,
        created_at: invoice.created_at,
        items: []
      }));
      
      return invoicesWithParties;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
    }
  }
  
  public async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const { data: invoice, error: invoiceError } = await this.supabase
        .from('invoices')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', id)
        .single();
      
      if (invoiceError) throw invoiceError;
      
      const { data: items, error: itemsError } = await this.supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id);
      
      if (itemsError) throw itemsError;
      
      return {
        id: invoice.id,
        invoice_type: invoice.invoice_type,
        party_id: invoice.party_id,
        party_name: invoice.parties?.name,
        date: invoice.date,
        total_amount: invoice.total_amount,
        status: invoice.status,
        payment_status: invoice.payment_status || 'draft',
        notes: invoice.notes,
        created_at: invoice.created_at,
        items: items
      };
    } catch (error) {
      console.error(`Error fetching invoice with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات الفاتورة');
      return null;
    }
  }
  
  public async getInvoicesByParty(partyId: string): Promise<Invoice[]> {
    try {
      let { data, error } = await this.supabase
        .from('invoices')
        .select(`
          *,
          parties (name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const invoicesWithItems = await Promise.all(
        data.map(async (invoice) => {
          const { data: items, error: itemsError } = await this.supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoice.id);
          
          if (itemsError) throw itemsError;
          
          return {
            id: invoice.id,
            invoice_type: invoice.invoice_type,
            party_id: invoice.party_id,
            party_name: invoice.parties?.name,
            date: invoice.date,
            total_amount: invoice.total_amount,
            status: invoice.status,
            payment_status: invoice.payment_status || 'draft',
            notes: invoice.notes,
            created_at: invoice.created_at,
            items: items || []
          };
        })
      );
      
      return invoicesWithItems;
    } catch (error) {
      console.error(`Error fetching invoices for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
    }
  }
  
  public async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      const paymentStatus = 'draft';
      
      const { data: invoice, error: invoiceError } = await this.supabase
        .from('invoices')
        .insert({
          invoice_type: invoiceData.invoice_type,
          party_id: invoiceData.party_id,
          date: invoiceData.date,
          total_amount: invoiceData.total_amount,
          status: invoiceData.status,
          payment_status: paymentStatus,
          notes: invoiceData.notes
        })
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;
      
      const invoiceItems = invoiceData.items.map(item => ({
        invoice_id: invoice.id,
        item_id: item.item_id,
        item_type: item.item_type,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price
      }));
      
      const { error: itemsError } = await this.supabase
        .from('invoice_items')
        .insert(invoiceItems);
      
      if (itemsError) throw itemsError;
      
      const party = await this.partyService.getPartyById(invoiceData.party_id);
      
      toast.success('تم إنشاء الفاتورة بنجاح');
      
      return {
        id: invoice.id,
        invoice_type: invoice.invoice_type,
        party_id: invoice.party_id,
        party_name: party?.name,
        date: invoice.date,
        total_amount: invoice.total_amount,
        status: invoice.status,
        payment_status: paymentStatus,
        notes: invoice.notes || '',
        created_at: invoice.created_at,
        items: invoiceData.items.map(item => ({
          ...item,
          invoice_id: invoice.id,
          total: item.quantity * item.unit_price
        }))
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
      return null;
    }
  }
  
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoice.payment_status === 'confirmed') {
        toast.info('الفاتورة مؤكدة بالفعل');
        return true;
      }
      
      if (invoice.invoice_type === 'sale') {
        for (const item of invoice.items) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, -item.quantity);
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, -item.quantity);
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinished(item.item_id, -item.quantity);
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, -item.quantity);
              break;
          }
        }
        
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          true,
          'فاتورة مبيعات',
          'sale_invoice',
          invoice.id
        );
      } else if (invoice.invoice_type === 'purchase') {
        for (const item of invoice.items) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, item.quantity);
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, item.quantity);
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinished(item.item_id, item.quantity);
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, item.quantity);
              break;
          }
        }
        
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          false,
          'فاتورة مشتريات',
          'purchase_invoice',
          invoice.id
        );
      }
      
      const { error } = await this.supabase
        .from('invoices')
        .update({ payment_status: 'confirmed' })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      toast.success('تم تأكيد الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد الفاتورة');
      return false;
    }
  }
  
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoice.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء الفواتير المؤكدة فقط');
        return false;
      }
      
      if (invoice.invoice_type === 'sale') {
        for (const item of invoice.items) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, item.quantity);
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, item.quantity);
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinished(item.item_id, item.quantity);
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, item.quantity);
              break;
          }
        }
        
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          false,
          'إلغاء فاتورة مبيعات',
          'cancel_sale_invoice',
          invoice.id
        );
      } else if (invoice.invoice_type === 'purchase') {
        for (const item of invoice.items) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, -item.quantity);
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, -item.quantity);
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinished(item.item_id, -item.quantity);
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, -item.quantity);
              break;
          }
        }
        
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          true,
          'إلغاء فاتورة مشتريات',
          'cancel_purchase_invoice',
          invoice.id
        );
      }
      
      const { error } = await this.supabase
        .from('invoices')
        .update({ payment_status: 'cancelled' })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      toast.success('تم إلغاء الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast.error('حدث خطأ أثناء إلغاء الفاتورة');
      return false;
    }
  }
  
  public async deleteInvoice(id: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoiceById(id);
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoice.payment_status !== 'draft') {
        toast.error('لا يمكن حذف الفواتير المؤكدة، يمكن إلغاءها فقط');
        return false;
      }
      
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
      const paymentStatus = 'draft';
      
      const { data: payment, error } = await this.supabase
        .from('payments')
        .insert({
          party_id: paymentData.party_id,
          date: paymentData.date,
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
      
      if (payment.payment_type === 'collection') {
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          false,
          'دفعة مستلمة',
          'payment_received',
          payment.id
        );
        
        if (payment.related_invoice_id) {
          await this.updateInvoiceStatusAfterPayment(payment.related_invoice_id, payment.amount);
        }
      } else if (payment.payment_type === 'disbursement') {
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          true,
          'دفعة مدفوعة',
          'payment_made',
          payment.id
        );
        
        if (payment.related_invoice_id) {
          await this.updateInvoiceStatusAfterPayment(payment.related_invoice_id, payment.amount);
        }
      }
      
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
      
      if (payment.payment_type === 'collection') {
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          true,
          'إلغاء دفعة مستلمة',
          'cancel_payment_received',
          payment.id
        );
        
        if (payment.related_invoice_id) {
          await this.reverseInvoiceStatusAfterPaymentCancellation(payment.related_invoice_id, payment.amount);
        }
      } else if (payment.payment_type === 'disbursement') {
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          false,
          'إلغاء دفعة مدفوعة',
          'cancel_payment_made',
          payment.id
        );
        
        if (payment.related_invoice_id) {
          await this.reverseInvoiceStatusAfterPaymentCancellation(payment.related_invoice_id, payment.amount);
        }
      }
      
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
  
  private async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const { data: invoice, error } = await this.supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (error) throw error;
      
      let newStatus = invoice.status;
      
      const { data: payments, error: paymentsError } = await this.supabase
        .from('payments')
        .select('amount, payment_status')
        .eq('related_invoice_id', invoiceId)
        .eq('payment_status', 'confirmed');
      
      if (paymentsError) throw paymentsError;
      
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      
      if (totalPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'unpaid';
      }
      
      await this.supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
    } catch (error) {
      console.error('Error updating invoice status after payment:', error);
    }
  }
  
  private async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const { data: invoice, error } = await this.supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (error) throw error;
      
      let newStatus = invoice.status;
      
      const { data: payments, error: paymentsError } = await this.supabase
        .from('payments')
        .select('amount, payment_status')
        .eq('related_invoice_id', invoiceId)
        .eq('payment_status', 'confirmed');
      
      if (paymentsError) throw paymentsError;
      
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) - paymentAmount;
      
      if (totalPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'unpaid';
      }
      
      await this.supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
    } catch (error) {
      console.error('Error updating invoice status after payment cancellation:', error);
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
      
      const { error } = await this.supabase
        .from('payments')
        .update({
          party_id: paymentData.party_id,
          date: paymentData.date,
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
  
  public async getReturns(): Promise<Return[]> {
    try {
      let { data, error } = await this.supabase
        .from('returns')
        .select(`
          *,
          parties (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const returnsWithParties = data.map(returnItem => ({
        id: returnItem.id,
        invoice_id: returnItem.invoice_id,
        party_id: returnItem.party_id,
        party_name: returnItem.parties?.name,
        date: returnItem.date,
        return_type: returnItem.return_type,
        amount: returnItem.amount,
        payment_status: returnItem.payment_status || 'draft',
        notes: returnItem.notes,
        created_at: returnItem.created_at
      }));
      
      return returnsWithParties;
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }
  
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      const paymentStatus = 'draft';
      
      const { data: returnRecord, error } = await this.supabase
        .from('returns')
        .insert({
          invoice_id: returnData.invoice_id,
          party_id: returnData.party_id,
          date: returnData.date,
          return_type: returnData.return_type,
          amount: returnData.amount,
          payment_status: paymentStatus,
          notes: returnData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (returnData.items && returnData.items.length > 0) {
        const returnItems = returnData.items.map(item => ({
          return_id: returnRecord.id,
          item_id: item.item_id,
          item_type: item.item_type,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price
        }));
        
        const { error: itemsError } = await this.supabase
          .from('return_items')
          .insert(returnItems);
        
        if (itemsError) throw itemsError;
      }
      
      const party = await this.partyService.getPartyById(returnData.party_id || '');
      
      toast.success('تم تسجيل المرتجع بنجاح');
      
      return {
        id: returnRecord.id,
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        party_name: party?.name,
        date: returnRecord.date,
        return_type: returnData.return_type,
        amount: returnRecord.amount,
        payment_status: paymentStatus,
        notes: returnData.notes,
        created_at: returnRecord.created_at,
        items: returnData.items
      };
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء تسجيل المرتجع');
      return null;
    }
  }
  
  public async getReturnById(id: string): Promise<Return | null> {
    try {
      const { data: returnData, error: returnError } = await this.supabase
        .from('returns')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', id)
        .single();
      
      if (returnError) throw returnError;
      
      const { data: items, error: itemsError } = await this.supabase
        .from('return_items')
        .select('*')
        .eq('return_id', id);
      
      if (itemsError) throw itemsError;
      
      return {
        id: returnData.id,
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        party_name: returnData.parties?.name,
        date: returnData.date,
        return_type: returnData.return_type,
        amount: returnData.amount,
        payment_status: returnData.payment_status || 'draft',
        notes: returnData.notes,
        created_at: returnData.created_at,
        items: items || []
      };
    } catch (error) {
      console.error(`Error fetching return with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات المرتجع');
      return null;
    }
  }
  
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status === 'confirmed') {
        toast.info('المرتجع مؤكد بالفعل');
        return true;
      }
      
      if (returnData.return_type === 'sales_return') {
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, item.quantity);
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, item.quantity);
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinished(item.item_id, item.quantity);
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, item.quantity);
              break;
          }
        }
        
        await this.partyService.updatePartyBalance(
          returnData.party_id || '',
          returnData.amount,
          false,
          'مرتجع مبيعات',
          'sales_return',
          returnData.id
        );
      } else if (returnData.return_type === 'purchase_return') {
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, -item.quantity);
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, -item.quantity);
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinished(item.item_id, -item.quantity);
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, -item.quantity);
              break;
          }
        }
        
        await this.partyService.updatePartyBalance(
          returnData.party_id || '',
          returnData.amount,
          true,
          'مرتجع مشتريات',
          'purchase_return',
          returnData.id
        );
      }
      
      const { error } = await this.supabase
        .from('returns')
        .update({ payment_status: 'confirmed' })
        .eq('id', returnId);
      
      if (error) throw error;
      
      toast.success('تم تأكيد المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }
  
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء المرتجعات المؤكدة فقط');
        return false;
      }
      
      if (returnData.return_type === 'sales_return') {
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, -item.quantity);
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, -item.quantity);
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinished(item.item_id, -item.quantity);
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, -item.quantity);
              break;
          }
        }
        
        await this.partyService.updatePartyBalance(
          returnData.party_id || '',
          returnData.amount,
          true,
          'إلغاء مرتجع مبيعات',
          'cancel_sales_return',
          returnData.id
        );
      } else if (returnData.return_type === 'purchase_return') {
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, item.quantity);
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, item.quantity);
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinished(item.item_id, item.quantity);
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, item.quantity);
              break;
          }
        }
        
        await this.partyService.updatePartyBalance(
          returnData.party_id || '',
          returnData.amount,
          false,
          'إلغاء مرتجع مشتريات',
          'cancel_purchase_return',
          returnData.id
        );
      }
      
      const { error } = await this.supabase
        .from('returns')
        .update({ payment_status: 'cancelled' })
        .eq('id', returnId);
      
      if (error) throw error;
      
      toast.success('تم إلغاء المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling return:', error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }
  
  public async deleteReturn(id: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(id);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status !== 'draft') {
        toast.error('لا يمكن حذف المرتجعات المؤكدة، يمكن إلغاءها فقط');
        return false;
      }
      
      const { error: itemsError } = await this.supabase
        .from('return_items')
        .delete()
        .eq('return_id', id);
      
      if (itemsError) throw itemsError;
      
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
  
  public async getLedgerEntries(partyId: string): Promise<LedgerEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('ledger')
        .select(`
          *,
          parties (name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(entry => ({
        id: entry.id,
        party_id: entry.party_id,
        party_name: entry.parties?.name,
        transaction_id: entry.transaction_id,
        transaction_type: entry.transaction_type,
        date: entry.date,
        debit: entry.debit,
        credit: entry.credit,
        balance_after: entry.balance_after,
        created_at: entry.created_at,
        notes: ''
      }));
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      toast.error('حدث خطأ أثناء جلب سجل الحساب');
      return [];
    }
  }
}

export default CommercialService;
