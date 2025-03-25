
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PartyService from "./PartyService";

export interface Invoice {
  id: string;
  party_id?: string;
  party_name?: string;
  date: string | Date;
  invoice_type: 'sale' | 'purchase';
  total_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  notes?: string;
  items?: InvoiceItem[];
  created_at?: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_id?: number;
  item_name: string;
  item_type: 'finished_products' | 'semi_finished_products' | 'packaging_materials' | 'raw_materials';
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Payment {
  id?: string;
  party_id: string;
  party_name?: string;
  date: string | Date;
  amount: number;
  payment_type: 'collection' | 'disbursement';
  method: 'cash' | 'check' | 'bank_transfer' | 'other';
  related_invoice_id?: string;
  notes?: string;
  created_at?: string;
}

export interface Return {
  id: string;
  invoice_id?: string;
  invoice_number?: string;
  date: string;
  return_type: 'sales_return' | 'purchase_return';
  amount: number;
  notes?: string;
  items?: ReturnItem[];
  created_at?: string;
}

export interface ReturnItem {
  id?: string;
  return_id?: string;
  item_id?: number;
  item_name?: string;
  item_type?: 'finished_products' | 'semi_finished_products' | 'packaging_materials' | 'raw_materials';
  quantity?: number;
  unit_price?: number;
  total?: number;
}

export interface LedgerEntry {
  id: string;
  party_id: string;
  party_name: string;
  party_type: 'customer' | 'supplier' | 'other';
  date: string;
  transaction_id: string;
  transaction_type: 'invoice' | 'payment' | 'return';
  debit: number;
  credit: number;
  balance_after: number;
}

class CommercialService {
  private static instance: CommercialService;
  private partyService: PartyService;
  
  private constructor() {
    this.partyService = PartyService.getInstance();
  }
  
  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }
  
  // --- الفواتير ---
  
  // جلب جميع الفواتير
  public async getInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties!inner(name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(invoice => ({
        id: invoice.id,
        party_id: invoice.party_id,
        party_name: invoice.parties.name,
        date: invoice.date,
        invoice_type: invoice.invoice_type,
        total_amount: invoice.total_amount,
        status: invoice.status,
        notes: invoice.notes,
        created_at: invoice.created_at
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
    }
  }
  
  // جلب فاتورة بواسطة المعرف
  public async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties!inner(name),
          invoice_items(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        party_id: data.party_id,
        party_name: data.parties.name,
        date: data.date,
        invoice_type: data.invoice_type,
        total_amount: data.total_amount,
        status: data.status,
        notes: data.notes,
        items: data.invoice_items,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('حدث خطأ أثناء جلب الفاتورة');
      return null;
    }
  }
  
  // جلب فواتير طرف معين
  public async getInvoicesByParty(partyId: string): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties!inner(name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(invoice => ({
        id: invoice.id,
        party_id: invoice.party_id,
        party_name: invoice.parties.name,
        date: invoice.date,
        invoice_type: invoice.invoice_type,
        total_amount: invoice.total_amount,
        status: invoice.status,
        notes: invoice.notes,
        created_at: invoice.created_at
      }));
    } catch (error) {
      console.error('Error fetching invoices for party:', error);
      toast.error('حدث خطأ أثناء جلب الفواتير للطرف المحدد');
      return [];
    }
  }
  
  // إنشاء فاتورة جديدة
  public async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<string | null> {
    try {
      // 1. التحقق من وجود الطرف
      const party = await this.partyService.getPartyById(invoiceData.party_id!);
      if (!party) throw new Error('الطرف التجاري غير موجود');
      
      // 2. إنشاء سجل الفاتورة
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          party_id: invoiceData.party_id,
          date: invoiceData.date,
          invoice_type: invoiceData.invoice_type,
          total_amount: invoiceData.total_amount || 0,
          status: invoiceData.status,
          notes: invoiceData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const invoiceId = data.id;
      
      // 3. إضافة عناصر الفاتورة
      if (invoiceData.items && invoiceData.items.length > 0) {
        const invoiceItems = invoiceData.items.map(item => ({
          invoice_id: invoiceId,
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
      
      // 4. تحديث رصيد الطرف التجاري
      // إذا كانت فاتورة مبيعات: زيادة مديونية العميل (debit)
      // إذا كانت فاتورة مشتريات: زيادة ما لنا عند المورد (credit)
      const isDebit = invoiceData.invoice_type === 'sale';
      const description = invoiceData.invoice_type === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مشتريات';
      
      await this.partyService.updatePartyBalance(
        invoiceData.party_id!,
        invoiceData.total_amount,
        isDebit,
        description,
        'invoice',
        invoiceId
      );
      
      toast.success('تم إنشاء الفاتورة بنجاح');
      return invoiceId;
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
      return null;
    }
  }
  
  // تحديث حالة الفاتورة
  public async updateInvoiceStatus(invoiceId: string, newStatus: 'paid' | 'partial' | 'unpaid'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
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
  
  // حذف فاتورة
  public async deleteInvoice(invoiceId: string): Promise<boolean> {
    try {
      // 1. الحصول على تفاصيل الفاتورة قبل الحذف
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) throw new Error('الفاتورة غير موجودة');
      
      // 2. حذف عناصر الفاتورة
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId);
      
      if (itemsError) throw itemsError;
      
      // 3. حذف السجل من جدول ledger
      const { error: ledgerError } = await supabase
        .from('ledger')
        .delete()
        .eq('transaction_id', invoiceId)
        .eq('transaction_type', 'invoice');
      
      if (ledgerError) throw ledgerError;
      
      // 4. التحقق من وجود مدفوعات مرتبطة بالفاتورة
      const { data: relatedPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('id')
        .eq('related_invoice_id', invoiceId);
      
      if (paymentsError) throw paymentsError;
      
      if (relatedPayments && relatedPayments.length > 0) {
        toast.error('لا يمكن حذف الفاتورة لوجود مدفوعات مرتبطة بها');
        return false;
      }
      
      // 5. التحقق من وجود مرتجعات مرتبطة بالفاتورة
      const { data: relatedReturns, error: returnsError } = await supabase
        .from('returns')
        .select('id')
        .eq('invoice_id', invoiceId);
      
      if (returnsError) throw returnsError;
      
      if (relatedReturns && relatedReturns.length > 0) {
        toast.error('لا يمكن حذف الفاتورة لوجود مرتجعات مرتبطة بها');
        return false;
      }
      
      // 6. تحديث رصيد الطرف (عكس تأثير الفاتورة)
      // إذا كانت فاتورة مبيعات: تخفيض مديونية العميل (credit)
      // إذا كانت فاتورة مشتريات: تخفيض ما لنا عند المورد (debit)
      const isDebit = invoice.invoice_type === 'purchase';
      const description = `إلغاء ${invoice.invoice_type === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'}`;
      
      await this.partyService.updatePartyBalance(
        invoice.party_id!,
        invoice.total_amount,
        isDebit,
        description,
        'invoice_cancellation'
      );
      
      // 7. حذف الفاتورة
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      toast.success('تم حذف الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('حدث خطأ أثناء حذف الفاتورة');
      return false;
    }
  }
  
  // --- المدفوعات ---
  
  // جلب جميع المدفوعات
  public async getPayments(): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties!inner(name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type,
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        notes: payment.notes,
        created_at: payment.created_at
      }));
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }
  
  // جلب مدفوعات طرف معين
  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties!inner(name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type,
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        notes: payment.notes,
        created_at: payment.created_at
      }));
    } catch (error) {
      console.error('Error fetching payments for party:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات للطرف المحدد');
      return [];
    }
  }
  
  // تسجيل دفعة جديدة
  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<string | null> {
    try {
      // 1. التحقق من وجود الطرف
      const party = await this.partyService.getPartyById(paymentData.party_id);
      if (!party) throw new Error('الطرف التجاري غير موجود');
      
      // 2. التحقق من وجود الفاتورة المرتبطة (إن وجدت)
      if (paymentData.related_invoice_id) {
        const invoice = await this.getInvoiceById(paymentData.related_invoice_id);
        if (!invoice) throw new Error('الفاتورة المرتبطة غير موجودة');
        
        // تحديث حالة الفاتورة
        const totalInvoiceAmount = invoice.total_amount;
        const totalPaidBefore = await this.getTotalPaidForInvoice(invoice.id);
        const newTotalPaid = totalPaidBefore + paymentData.amount;
        
        let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        if (newTotalPaid >= totalInvoiceAmount) {
          newStatus = 'paid';
        } else if (newTotalPaid > 0) {
          newStatus = 'partial';
        }
        
        await this.updateInvoiceStatus(invoice.id, newStatus);
      }
      
      // 3. تسجيل الدفعة
      const { data, error } = await supabase
        .from('payments')
        .insert({
          party_id: paymentData.party_id,
          date: paymentData.date,
          amount: paymentData.amount,
          payment_type: paymentData.payment_type,
          method: paymentData.method,
          related_invoice_id: paymentData.related_invoice_id,
          notes: paymentData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const paymentId = data.id;
      
      // 4. تحديث رصيد الطرف
      // إذا كان نوع الدفعة تحصيل: تخفيض مديونية العميل (credit)
      // إذا كان نوع الدفعة سداد: زيادة ما لنا عند المورد (debit)
      const isDebit = paymentData.payment_type === 'disbursement';
      const description = paymentData.payment_type === 'collection' ? 'تحصيل دفعة' : 'سداد دفعة';
      
      await this.partyService.updatePartyBalance(
        paymentData.party_id,
        paymentData.amount,
        isDebit,
        description,
        'payment',
        paymentId
      );
      
      toast.success(`تم تسجيل ${paymentData.payment_type === 'collection' ? 'التحصيل' : 'السداد'} بنجاح`);
      return paymentId;
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
      return null;
    }
  }
  
  // حساب إجمالي المدفوع لفاتورة معينة
  private async getTotalPaidForInvoice(invoiceId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('related_invoice_id', invoiceId);
      
      if (error) throw error;
      
      return data.reduce((sum, payment) => sum + payment.amount, 0);
    } catch (error) {
      console.error('Error calculating total paid for invoice:', error);
      return 0;
    }
  }
  
  // حذف دفعة
  public async deletePayment(paymentId: string): Promise<boolean> {
    try {
      // 1. الحصول على تفاصيل الدفعة قبل الحذف
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*, parties!inner(name)')
        .eq('id', paymentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // 2. حذف السجل من جدول ledger
      const { error: ledgerError } = await supabase
        .from('ledger')
        .delete()
        .eq('transaction_id', paymentId)
        .eq('transaction_type', 'payment');
      
      if (ledgerError) throw ledgerError;
      
      // 3. تحديث رصيد الطرف (عكس تأثير الدفعة)
      // إذا كان نوع الدفعة تحصيل: زيادة مديونية العميل (debit)
      // إذا كان نوع الدفعة سداد: تخفيض ما لنا عند المورد (credit)
      const isDebit = payment.payment_type === 'collection';
      const description = `إلغاء ${payment.payment_type === 'collection' ? 'تحصيل دفعة' : 'سداد دفعة'}`;
      
      await this.partyService.updatePartyBalance(
        payment.party_id,
        payment.amount,
        isDebit,
        description,
        'payment_cancellation'
      );
      
      // 4. إذا كانت الدفعة مرتبطة بفاتورة، تحديث حالة الفاتورة
      if (payment.related_invoice_id) {
        const invoice = await this.getInvoiceById(payment.related_invoice_id);
        if (invoice) {
          const totalPaidBefore = await this.getTotalPaidForInvoice(invoice.id);
          const newTotalPaid = totalPaidBefore - payment.amount;
          
          let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
          if (newTotalPaid >= invoice.total_amount) {
            newStatus = 'paid';
          } else if (newTotalPaid > 0) {
            newStatus = 'partial';
          }
          
          await this.updateInvoiceStatus(invoice.id, newStatus);
        }
      }
      
      // 5. حذف الدفعة
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);
      
      if (error) throw error;
      
      toast.success('تم حذف الدفعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('حدث خطأ أثناء حذف الدفعة');
      return false;
    }
  }
  
  // تعديل دفعة
  public async updatePayment(paymentId: string, paymentData: Partial<Omit<Payment, 'id' | 'created_at'>>): Promise<boolean> {
    try {
      // 1. الحصول على تفاصيل الدفعة الحالية قبل التعديل
      const { data: currentPayment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // 2. تحديث الدفعة
      const { error } = await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', paymentId);
      
      if (error) throw error;
      
      // 3. إذا تغير المبلغ، يجب تحديث رصيد الطرف
      if (paymentData.amount && paymentData.amount !== currentPayment.amount) {
        // عكس تأثير المبلغ القديم
        const isOldDebit = currentPayment.payment_type === 'disbursement';
        const oldDescription = `تعديل ${currentPayment.payment_type === 'collection' ? 'تحصيل دفعة' : 'سداد دفعة'} (إلغاء)`;
        
        await this.partyService.updatePartyBalance(
          currentPayment.party_id,
          currentPayment.amount,
          !isOldDebit, // عكس التأثير
          oldDescription,
          'payment_edit',
          paymentId
        );
        
        // إضافة تأثير المبلغ الجديد
        const isNewDebit = (paymentData.payment_type || currentPayment.payment_type) === 'disbursement';
        const newDescription = `تعديل ${(paymentData.payment_type || currentPayment.payment_type) === 'collection' ? 'تحصيل دفعة' : 'سداد دفعة'} (إضافة)`;
        
        await this.partyService.updatePartyBalance(
          paymentData.party_id || currentPayment.party_id,
          paymentData.amount,
          isNewDebit,
          newDescription,
          'payment_edit',
          paymentId
        );
      }
      
      // 4. إذا كانت الدفعة مرتبطة بفاتورة، تحديث حالة الفاتورة
      if (currentPayment.related_invoice_id || paymentData.related_invoice_id) {
        const invoiceId = paymentData.related_invoice_id || currentPayment.related_invoice_id;
        if (invoiceId) {
          const invoice = await this.getInvoiceById(invoiceId);
          if (invoice) {
            const totalPaid = await this.getTotalPaidForInvoice(invoice.id);
            
            let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
            if (totalPaid >= invoice.total_amount) {
              newStatus = 'paid';
            } else if (totalPaid > 0) {
              newStatus = 'partial';
            }
            
            await this.updateInvoiceStatus(invoice.id, newStatus);
          }
        }
      }
      
      toast.success('تم تعديل الدفعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('حدث خطأ أثناء تعديل الدفعة');
      return false;
    }
  }
  
  // --- المرتجعات ---
  
  // جلب جميع المرتجعات
  public async getReturns(): Promise<Return[]> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          invoices(id, party_id, parties!inner(name))
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(returnItem => ({
        id: returnItem.id,
        invoice_id: returnItem.invoice_id,
        invoice_number: returnItem.invoice_id, // نستخدم معرف الفاتورة كرقم مرجعي
        date: returnItem.date,
        return_type: returnItem.return_type,
        amount: returnItem.amount,
        notes: returnItem.notes,
        created_at: returnItem.created_at
      }));
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }
  
  // جلب مرتجع بواسطة المعرف
  public async getReturnById(id: string): Promise<Return | null> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          invoices(id, party_id, parties!inner(name))
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        invoice_id: data.invoice_id,
        invoice_number: data.invoice_id, // نستخدم معرف الفاتورة كرقم مرجعي
        date: data.date,
        return_type: data.return_type,
        amount: data.amount,
        notes: data.notes,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error fetching return:', error);
      toast.error('حدث خطأ أثناء جلب المرتجع');
      return null;
    }
  }
  
  // جلب مرتجعات فاتورة معينة
  public async getReturnsByInvoice(invoiceId: string): Promise<Return[]> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(returnItem => ({
        id: returnItem.id,
        invoice_id: returnItem.invoice_id,
        invoice_number: returnItem.invoice_id,
        date: returnItem.date,
        return_type: returnItem.return_type,
        amount: returnItem.amount,
        notes: returnItem.notes,
        created_at: returnItem.created_at
      }));
    } catch (error) {
      console.error('Error fetching returns for invoice:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات للفاتورة المحددة');
      return [];
    }
  }
  
  // تسجيل مرتجع جديد
  public async recordReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<string | null> {
    try {
      let partyId = null;
      
      // 1. إذا كان المرتجع مرتبط بفاتورة، نحصل على بيانات الفاتورة والطرف
      if (returnData.invoice_id) {
        const invoice = await this.getInvoiceById(returnData.invoice_id);
        if (!invoice) throw new Error('الفاتورة غير موجودة');
        
        partyId = invoice.party_id;
        
        // التحقق من نوع المرتجع يتوافق مع نوع الفاتورة
        if ((returnData.return_type === 'sales_return' && invoice.invoice_type !== 'sale') ||
            (returnData.return_type === 'purchase_return' && invoice.invoice_type !== 'purchase')) {
          throw new Error('نوع المرتجع لا يتوافق مع نوع الفاتورة');
        }
      }
      
      // 2. تسجيل المرتجع
      const { data, error } = await supabase
        .from('returns')
        .insert({
          invoice_id: returnData.invoice_id,
          date: returnData.date,
          return_type: returnData.return_type,
          amount: returnData.amount,
          notes: returnData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const returnId = data.id;
      
      // 3. إذا كان المرتجع مرتبط بفاتورة، تحديث رصيد الطرف
      if (partyId) {
        // إذا كان مرتجع مبيعات: تخفيض مديونية العميل (credit)
        // إذا كان مرتجع مشتريات: تخفيض ما لنا عند المورد (debit)
        const isDebit = returnData.return_type === 'purchase_return';
        const description = returnData.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات';
        
        await this.partyService.updatePartyBalance(
          partyId,
          returnData.amount,
          isDebit,
          description,
          'return',
          returnId
        );
      }
      
      toast.success('تم تسجيل المرتجع بنجاح');
      return returnId;
    } catch (error) {
      console.error('Error recording return:', error);
      toast.error('حدث خطأ أثناء تسجيل المرتجع');
      return null;
    }
  }
  
  // حذف مرتجع
  public async deleteReturn(returnId: string): Promise<boolean> {
    try {
      // 1. الحصول على تفاصيل المرتجع قبل الحذف
      const returnData = await this.getReturnById(returnId);
      if (!returnData) throw new Error('المرتجع غير موجود');
      
      // 2. حذف السجل من جدول ledger
      const { error: ledgerError } = await supabase
        .from('ledger')
        .delete()
        .eq('transaction_id', returnId)
        .eq('transaction_type', 'return');
      
      if (ledgerError) throw ledgerError;
      
      // 3. إذا كان المرتجع مرتبط بفاتورة، تحديث رصيد الطرف
      if (returnData.invoice_id) {
        const invoice = await this.getInvoiceById(returnData.invoice_id);
        if (invoice && invoice.party_id) {
          // عكس تأثير المرتجع على رصيد الطرف
          // إذا كان مرتجع مبيعات: زيادة مديونية العميل (debit)
          // إذا كان مرتجع مشتريات: زيادة ما لنا عند المورد (credit)
          const isDebit = returnData.return_type === 'sales_return';
          const description = `إلغاء ${returnData.return_type === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}`;
          
          await this.partyService.updatePartyBalance(
            invoice.party_id,
            returnData.amount,
            isDebit,
            description,
            'return_cancellation'
          );
        }
      }
      
      // 4. حذف المرتجع
      const { error } = await supabase
        .from('returns')
        .delete()
        .eq('id', returnId);
      
      if (error) throw error;
      
      toast.success('تم حذف المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting return:', error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
      return false;
    }
  }
  
  // --- كشوف الحسابات ---
  
  // جلب بيانات كشف الحساب
  public async getLedgerEntries(options?: {
    startDate?: string;
    endDate?: string;
    partyType?: string;
  }): Promise<LedgerEntry[]> {
    try {
      let query = supabase
        .from('ledger')
        .select(`
          *,
          parties!inner(name, type)
        `)
        .order('date', { ascending: false });
      
      if (options?.startDate) {
        query = query.gte('date', options.startDate);
      }
      
      if (options?.endDate) {
        query = query.lte('date', options.endDate);
      }
      
      if (options?.partyType && options.partyType !== 'all') {
        query = query.eq('parties.type', options.partyType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data.map(entry => ({
        id: entry.id,
        party_id: entry.party_id,
        party_name: entry.parties.name,
        party_type: entry.parties.type,
        date: entry.date,
        transaction_id: entry.transaction_id,
        transaction_type: entry.transaction_type,
        debit: entry.debit,
        credit: entry.credit,
        balance_after: entry.balance_after
      }));
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      toast.error('حدث خطأ أثناء جلب بيانات كشف الحساب');
      return [];
    }
  }
}

export default CommercialService;
