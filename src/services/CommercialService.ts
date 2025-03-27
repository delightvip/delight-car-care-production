
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
      
      // Update inventory based on invoice type
      if (invoice.invoice_type === 'sale') {
        // Decrease inventory for sales
        for (const item of invoice.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for sales
        if (invoice.party_id) {
          await this.partyService.updatePartyBalance(
            invoice.party_id,
            invoice.total_amount,
            true, // debit for sales (increase customer's debt)
            'مبيعات',
            'sale',
            invoice.id
          );
        }
      } else if (invoice.invoice_type === 'purchase') {
        // Increase inventory for purchases
        for (const item of invoice.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for purchases
        if (invoice.party_id) {
          await this.partyService.updatePartyBalance(
            invoice.party_id,
            invoice.total_amount,
            false, // credit for purchases (increase supplier's credit)
            'مشتريات',
            'purchase',
            invoice.id
          );
        }
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
      
      // Update inventory based on invoice type
      if (invoice.invoice_type === 'sale') {
        // Increase inventory for cancelled sales
        for (const item of invoice.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for cancelled sales
        if (invoice.party_id) {
          await this.partyService.updatePartyBalance(
            invoice.party_id,
            invoice.total_amount,
            false, // credit for cancelled sales (decrease customer's debt)
            'إلغاء مبيعات',
            'cancel_sale',
            invoice.id
          );
        }
      } else if (invoice.invoice_type === 'purchase') {
        // Decrease inventory for cancelled purchases
        for (const item of invoice.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for cancelled purchases
        if (invoice.party_id) {
          await this.partyService.updatePartyBalance(
            invoice.party_id,
            invoice.total_amount,
            true, // debit for cancelled purchases (decrease supplier's credit)
            'إلغاء مشتريات',
            'cancel_purchase',
            invoice.id
          );
        }
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
  
  // Returns methods
  public async getReturns(): Promise<Return[]> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties:party_id (name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get items for each return
      const returnsWithItems = await Promise.all(
        (data || []).map(async (returnData) => {
          const { data: items, error: itemsError } = await supabase
            .from('return_items')
            .select('*')
            .eq('return_id', returnData.id);
          
          if (itemsError) throw itemsError;
          
          return {
            ...returnData,
            party_name: returnData.parties?.name,
            items: items || []
          } as Return;
        })
      );
      
      return returnsWithItems;
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }
  
  public async getReturnById(id: string): Promise<Return | null> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      const { data: items, error: itemsError } = await supabase
        .from('return_items')
        .select('*')
        .eq('return_id', id);
      
      if (itemsError) throw itemsError;
      
      return {
        ...data,
        party_name: data.parties?.name,
        items: items || []
      } as Return;
    } catch (error) {
      console.error(`Error fetching return with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب تفاصيل المرتجع');
      return null;
    }
  }
  
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      // Create return record
      const { data, error } = await supabase
        .from('returns')
        .insert({
          return_type: returnData.return_type,
          invoice_id: returnData.invoice_id,
          party_id: returnData.party_id,
          date: returnData.date,
          amount: returnData.amount,
          payment_status: returnData.payment_status || 'draft',
          notes: returnData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create return items
      if (returnData.items && returnData.items.length > 0) {
        const returnItems = returnData.items.map(item => ({
          return_id: data.id,
          item_id: item.item_id,
          item_type: item.item_type,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price
        }));
        
        const { error: itemsError } = await supabase
          .from('return_items')
          .insert(returnItems);
        
        if (itemsError) throw itemsError;
      }
      
      toast.success('تم إنشاء المرتجع بنجاح');
      
      // Get party name for response
      const party = returnData.party_id ? 
        await this.partyService.getPartyById(returnData.party_id) : null;
      
      return {
        ...data,
        party_name: party?.name,
        items: returnData.items
      } as Return;
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء إنشاء المرتجع');
      return null;
    }
  }
  
  public async confirmReturn(id: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(id);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status === 'confirmed') {
        toast.info('المرتجع مؤكد بالفعل');
        return true;
      }
      
      // Update inventory based on return type
      if (returnData.return_type === 'sales_return') {
        // Increase inventory for sales returns
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for sales returns
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false, // credit for sales returns (reduce customer's debt)
            'مرتجع مبيعات',
            'sales_return',
            returnData.id
          );
        }
      } else if (returnData.return_type === 'purchase_return') {
        // Decrease inventory for purchase returns
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for purchase returns
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true, // debit for purchase returns (increase supplier's debt)
            'مرتجع مشتريات',
            'purchase_return',
            returnData.id
          );
        }
      }
      
      // Update return status to confirmed
      const { error } = await supabase
        .from('returns')
        .update({ payment_status: 'confirmed' })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تأكيد المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming return:', error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }
  
  public async cancelReturn(id: string): Promise<boolean> {
    try {
      const returnData = await this.getReturnById(id);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }
      
      if (returnData.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء المرتجعات المؤكدة فقط');
        return false;
      }
      
      // Update inventory based on return type
      if (returnData.return_type === 'sales_return') {
        // Decrease inventory for cancelled sales returns
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for cancelled sales returns
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true, // debit for cancelled sales returns (restore customer's debt)
            'إلغاء مرتجع مبيعات',
            'cancel_sales_return',
            returnData.id
          );
        }
      } else if (returnData.return_type === 'purchase_return') {
        // Increase inventory for cancelled purchase returns
        for (const item of returnData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for cancelled purchase returns
        if (returnData.party_id) {
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false, // credit for cancelled purchase returns (restore supplier's debt)
            'إلغاء مرتجع مشتريات',
            'cancel_purchase_return',
            returnData.id
          );
        }
      }
      
      // Update return status to cancelled
      const { error } = await supabase
        .from('returns')
        .update({ payment_status: 'cancelled' })
        .eq('id', id);
      
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
      // Check if the return is in draft state
      const { data, error: fetchError } = await supabase
        .from('returns')
        .select('payment_status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (data.payment_status !== 'draft') {
        toast.error('يمكن حذف المرتجعات في حالة المسودة فقط');
        return false;
      }
      
      // Delete return items first
      const { error: itemsError } = await supabase
        .from('return_items')
        .delete()
        .eq('return_id', id);
      
      if (itemsError) throw itemsError;
      
      // Delete the return
      const { error } = await supabase
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
        payment_type: payment.payment_type as "collection" | "disbursement"
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
        payment_type: data.payment_type as "collection" | "disbursement"
      };
    } catch (error) {
      console.error(`Error fetching payment with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب تفاصيل المدفوعات');
      return null;
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
}

export default CommercialService;
export type { Return, Invoice, InvoiceItem, Payment, ReturnItem, Party, LedgerEntry } from './CommercialTypes';
