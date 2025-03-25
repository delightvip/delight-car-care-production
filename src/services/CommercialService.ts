
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryService from "./InventoryService";

export interface Invoice {
  id: string;
  invoice_type: 'sale' | 'purchase';
  party_id: string;
  party_name?: string;
  date: string;
  total_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  notes?: string;
  created_at: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_id: number;
  item_type: 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products';
  item_name: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

export interface Payment {
  id?: string;
  party_id: string;
  party_name?: string;
  payment_type: 'collection' | 'disbursement';
  amount: number;
  date: string;
  related_invoice_id?: string;
  method: string;
  notes?: string;
  created_at?: string;
}

export interface Return {
  id?: string;
  return_type: 'sales_return' | 'purchase_return';
  invoice_id?: string;
  invoice_number?: string;
  amount: number;
  date: string;
  notes?: string;
  created_at?: string;
  items?: ReturnItem[];
}

export interface ReturnItem {
  id?: string;
  return_id?: string;
  item_id: number;
  item_type: 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products';
  item_name: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

class CommercialService {
  private static instance: CommercialService;
  private inventoryService: InventoryService;
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
  }
  
  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }
  
  public async getInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties(name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const invoices = await Promise.all(data.map(async (invoice) => {
        const { data: items, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoice.id);
        
        if (itemsError) throw itemsError;
        
        return {
          id: invoice.id,
          invoice_type: invoice.invoice_type as 'sale' | 'purchase',
          party_id: invoice.party_id,
          party_name: invoice.parties?.name,
          date: invoice.date,
          total_amount: invoice.total_amount,
          status: invoice.status as 'paid' | 'partial' | 'unpaid',
          notes: invoice.notes,
          created_at: invoice.created_at,
          items: items.map(item => ({
            id: item.id,
            invoice_id: item.invoice_id,
            item_id: item.item_id,
            item_type: item.item_type as 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products',
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total
          }))
        };
      }));
      
      return invoices;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
    }
  }
  
  public async getInvoicesByType(type: 'sale' | 'purchase'): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties(name)
        `)
        .eq('invoice_type', type)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const invoices = await Promise.all(data.map(async (invoice) => {
        const { data: items, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoice.id);
        
        if (itemsError) throw itemsError;
        
        return {
          id: invoice.id,
          invoice_type: invoice.invoice_type as 'sale' | 'purchase',
          party_id: invoice.party_id,
          party_name: invoice.parties?.name,
          date: invoice.date,
          total_amount: invoice.total_amount,
          status: invoice.status as 'paid' | 'partial' | 'unpaid',
          notes: invoice.notes,
          created_at: invoice.created_at,
          items: items.map(item => ({
            id: item.id,
            invoice_id: item.invoice_id,
            item_id: item.item_id,
            item_type: item.item_type as 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products',
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total
          }))
        };
      }));
      
      return invoices;
    } catch (error) {
      console.error(`Error fetching ${type} invoices:`, error);
      toast.error(`حدث خطأ أثناء جلب فواتير ${type === 'sale' ? 'المبيعات' : 'المشتريات'}`);
      return [];
    }
  }
  
  public async createInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          invoice_type: invoice.invoice_type,
          party_id: invoice.party_id,
          date: invoice.date,
          status: invoice.status,
          notes: invoice.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const itemsToInsert = invoice.items.map(item => ({
        invoice_id: data.id,
        item_id: item.item_id,
        item_type: item.item_type,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);
      
      if (itemsError) throw itemsError;
      
      if (invoice.invoice_type === 'sale') {
        await this.updateInventoryForSale(invoice.items);
      } else if (invoice.invoice_type === 'purchase') {
        await this.updateInventoryForPurchase(invoice.items);
      }
      
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          party_id: invoice.party_id,
          transaction_type: invoice.invoice_type === 'sale' ? 'sale_invoice' : 'purchase_invoice',
          transaction_id: data.id,
          debit: invoice.invoice_type === 'purchase' ? invoice.total_amount : 0,
          credit: invoice.invoice_type === 'sale' ? invoice.total_amount : 0,
          balance_after: 0,
          date: invoice.date
        });
      
      if (ledgerError) throw ledgerError;
      
      toast.success(`تم إنشاء فاتورة ${invoice.invoice_type === 'sale' ? 'بيع' : 'شراء'} بنجاح`);
      
      return this.getInvoiceById(data.id);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
      return null;
    }
  }
  
  public async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties(name)
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
        id: data.id,
        invoice_type: data.invoice_type as 'sale' | 'purchase',
        party_id: data.party_id,
        party_name: data.parties?.name,
        date: data.date,
        total_amount: data.total_amount,
        status: data.status as 'paid' | 'partial' | 'unpaid',
        notes: data.notes,
        created_at: data.created_at,
        items: items.map(item => ({
          id: item.id,
          invoice_id: item.invoice_id,
          item_id: item.item_id,
          item_type: item.item_type as 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products',
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        }))
      };
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الفاتورة');
      return null;
    }
  }
  
  private async updateInventoryForSale(items: InvoiceItem[]): Promise<void> {
    try {
      for (const item of items) {
        const tableName = item.item_type;
        
        const { data: currentItem, error: fetchError } = await supabase
          .from(tableName)
          .select('quantity, id, name')
          .eq('id', item.item_id)
          .single();
        
        if (fetchError) {
          console.error(`Error fetching item from ${tableName}:`, fetchError);
          continue;
        }
        
        if (currentItem.quantity < item.quantity) {
          toast.warning(`لا تتوفر كمية كافية من ${currentItem.name} في المخزون`);
          continue;
        }
        
        const newQuantity = currentItem.quantity - item.quantity;
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ quantity: newQuantity })
          .eq('id', item.item_id);
        
        if (updateError) {
          console.error(`Error updating inventory for ${tableName}:`, updateError);
          continue;
        }
        
        await this.recordInventoryMovement('out', item.item_type, item.item_name, item.quantity, 'بيع بموجب فاتورة');
      }
    } catch (error) {
      console.error('Error updating inventory for sale:', error);
    }
  }
  
  private async updateInventoryForPurchase(items: InvoiceItem[]): Promise<void> {
    try {
      for (const item of items) {
        const tableName = item.item_type;
        
        const { data: currentItem, error: fetchError } = await supabase
          .from(tableName)
          .select('quantity, id, unit_cost')
          .eq('id', item.item_id)
          .single();
        
        if (fetchError) {
          console.error(`Error fetching item from ${tableName}:`, fetchError);
          continue;
        }
        
        const currentValue = currentItem.quantity * (currentItem.unit_cost || 0);
        const newValue = item.quantity * item.unit_price;
        const newTotal = currentItem.quantity + item.quantity;
        const newUnitCost = newTotal > 0 ? (currentValue + newValue) / newTotal : item.unit_price;
        
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ 
            quantity: newTotal,
            unit_cost: newUnitCost
          })
          .eq('id', item.item_id);
        
        if (updateError) {
          console.error(`Error updating inventory for ${tableName}:`, updateError);
          continue;
        }
        
        await this.recordInventoryMovement('in', item.item_type, item.item_name, item.quantity, 'شراء بموجب فاتورة');
      }
    } catch (error) {
      console.error('Error updating inventory for purchase:', error);
    }
  }
  
  public async recordPayment(payment: Payment): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          party_id: payment.party_id,
          payment_type: payment.payment_type,
          amount: payment.amount,
          date: payment.date,
          related_invoice_id: payment.related_invoice_id,
          method: payment.method,
          notes: payment.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (payment.related_invoice_id) {
        await this.updateInvoiceStatusAfterPayment(payment.related_invoice_id);
      }
      
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          party_id: payment.party_id,
          transaction_type: payment.payment_type === 'collection' ? 'payment_received' : 'payment_made',
          transaction_id: data.id,
          debit: payment.payment_type === 'disbursement' ? payment.amount : 0,
          credit: payment.payment_type === 'collection' ? payment.amount : 0,
          balance_after: 0,
          date: payment.date
        });
      
      if (ledgerError) throw ledgerError;
      
      toast.success(`تم تسجيل ${payment.payment_type === 'collection' ? 'تحصيل' : 'دفع'} بنجاح`);
      
      return {
        ...data,
        party_name: payment.party_name,
        payment_type: data.payment_type as 'collection' | 'disbursement'
      };
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
      return null;
    }
  }
  
  private async updateInvoiceStatusAfterPayment(invoiceId: string): Promise<void> {
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('total_amount, id')
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) throw invoiceError;
      
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('related_invoice_id', invoiceId);
      
      if (paymentsError) throw paymentsError;
      
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (totalPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      }
      
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating invoice status after payment:', error);
    }
  }
  
  public async recordReturn(returnObj: Return): Promise<Return | null> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .insert({
          return_type: returnObj.return_type,
          invoice_id: returnObj.invoice_id,
          amount: returnObj.amount,
          date: returnObj.date,
          notes: returnObj.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (returnObj.items && returnObj.items.length > 0) {
        if (returnObj.return_type === 'sales_return') {
          await this.updateInventoryForSalesReturn(returnObj.items);
        } else {
          await this.updateInventoryForPurchaseReturn(returnObj.items);
        }
      }
      
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          party_id: null,
          transaction_type: returnObj.return_type === 'sales_return' ? 'sales_return' : 'purchase_return',
          transaction_id: data.id,
          debit: returnObj.return_type === 'sales_return' ? returnObj.amount : 0,
          credit: returnObj.return_type === 'purchase_return' ? returnObj.amount : 0,
          balance_after: 0,
          date: returnObj.date
        });
      
      if (ledgerError) throw ledgerError;
      
      toast.success(`تم تسجيل مرتجع ${returnObj.return_type === 'sales_return' ? 'مبيعات' : 'مشتريات'} بنجاح`);
      
      return {
        ...data,
        return_type: data.return_type as 'sales_return' | 'purchase_return'
      };
    } catch (error) {
      console.error('Error recording return:', error);
      toast.error('حدث خطأ أثناء تسجيل المرتجع');
      return null;
    }
  }
  
  private async updateInventoryForSalesReturn(items: ReturnItem[]): Promise<void> {
    try {
      for (const item of items) {
        const tableName = item.item_type;
        
        const { data: currentItem, error: fetchError } = await supabase
          .from(tableName)
          .select('quantity, id')
          .eq('id', item.item_id)
          .single();
        
        if (fetchError) {
          console.error(`Error fetching item from ${tableName}:`, fetchError);
          continue;
        }
        
        const newQuantity = currentItem.quantity + item.quantity;
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ quantity: newQuantity })
          .eq('id', item.item_id);
        
        if (updateError) {
          console.error(`Error updating inventory for ${tableName}:`, updateError);
          continue;
        }
        
        await this.recordInventoryMovement('return_in', item.item_type, item.item_name, item.quantity, 'مرتجع مبيعات');
      }
    } catch (error) {
      console.error('Error updating inventory for sales return:', error);
    }
  }
  
  private async updateInventoryForPurchaseReturn(items: ReturnItem[]): Promise<void> {
    try {
      for (const item of items) {
        const tableName = item.item_type;
        
        const { data: currentItem, error: fetchError } = await supabase
          .from(tableName)
          .select('quantity, id')
          .eq('id', item.item_id)
          .single();
        
        if (fetchError) {
          console.error(`Error fetching item from ${tableName}:`, fetchError);
          continue;
        }
        
        if (currentItem.quantity < item.quantity) {
          toast.warning(`لا تتوفر كمية كافية من ${item.item_name} في المخزون للإرجاع`);
          continue;
        }
        
        const newQuantity = currentItem.quantity - item.quantity;
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ quantity: newQuantity })
          .eq('id', item.item_id);
        
        if (updateError) {
          console.error(`Error updating inventory for ${tableName}:`, updateError);
          continue;
        }
        
        await this.recordInventoryMovement('return_out', item.item_type, item.item_name, item.quantity, 'مرتجع مشتريات');
      }
    } catch (error) {
      console.error('Error updating inventory for purchase return:', error);
    }
  }
  
  private async recordInventoryMovement(type: string, category: string, itemName: string, quantity: number, note: string): Promise<void> {
    try {
      await this.inventoryService.recordItemMovement({
        type,
        category,
        itemName,
        quantity,
        date: new Date(),
        note
      });
    } catch (error) {
      console.error('Error recording inventory movement:', error);
    }
  }
  
  public async getLedgerEntries(filters: {
    startDate?: string;
    endDate?: string;
    partyType?: string;
  } = {}) {
    try {
      let query = supabase
        .from('ledger')
        .select(`
          *,
          party:party_id (name, type)
        `)
        .order('date', { ascending: false });

      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }

      if (filters.partyType) {
        query = query.eq('party.type', filters.partyType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching ledger entries:", error);
        throw error;
      }

      return data.map(entry => ({
        ...entry,
        party_name: entry.party?.name || 'غير معروف',
        party_type: entry.party?.type || 'غير معروف'
      }));
    } catch (error) {
      console.error("Error in getLedgerEntries:", error);
      throw error;
    }
  }
  
  public async getPayments(): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties(name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties?.name,
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        amount: payment.amount,
        date: payment.date,
        related_invoice_id: payment.related_invoice_id,
        method: payment.method,
        notes: payment.notes,
        created_at: payment.created_at
      }));
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }
  
  public async getReturns(): Promise<Return[]> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          invoices(id, party_id, parties(name))
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(returnItem => ({
        id: returnItem.id,
        return_type: returnItem.return_type as 'sales_return' | 'purchase_return',
        invoice_id: returnItem.invoice_id,
        invoice_number: returnItem.invoice_id,
        amount: returnItem.amount,
        date: returnItem.date,
        notes: returnItem.notes,
        created_at: returnItem.created_at
      }));
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }
}

export default CommercialService;
