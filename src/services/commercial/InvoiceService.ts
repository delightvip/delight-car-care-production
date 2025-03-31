
import BaseCommercialService from './BaseCommercialService';
import { Invoice, InvoiceItem } from './CommercialTypes';
import { toast } from "sonner";
import { format } from 'date-fns';

class InvoiceService extends BaseCommercialService {
  private static instance: InvoiceService;
  
  private constructor() {
    super();
  }
  
  public static getInstance(): InvoiceService {
    if (!InvoiceService.instance) {
      InvoiceService.instance = new InvoiceService();
    }
    return InvoiceService.instance;
  }
  
  public async getInvoices(): Promise<Invoice[]> {
    try {
      // First, get all invoices with basic information
      let { data, error } = await this.supabase
        .from('invoices')
        .select(`
          *,
          parties (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Map the data to our Invoice type
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
        items: [] // Initialize with empty items array
      }));
      
      // For each invoice, get its items
      const invoicesWithItems = await Promise.all(
        invoicesWithParties.map(async (invoice) => {
          const { data: items, error: itemsError } = await this.supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoice.id);
          
          if (itemsError) {
            console.error(`Error fetching items for invoice ${invoice.id}:`, itemsError);
            return invoice;
          }
          
          return {
            ...invoice,
            items: items || []
          };
        })
      );
      
      return invoicesWithItems;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
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
        items: [] // Initialize with empty items array
      }));
      
      // For each invoice, get its items
      const invoicesWithItems = await Promise.all(
        invoicesWithParties.map(async (invoice) => {
          const { data: items, error: itemsError } = await this.supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoice.id);
          
          if (itemsError) {
            console.error(`Error fetching items for invoice ${invoice.id}:`, itemsError);
            return invoice;
          }
          
          return {
            ...invoice,
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
  
  public async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const { data: invoiceData, error: invoiceError } = await this.supabase
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
        id: invoiceData.id,
        invoice_type: invoiceData.invoice_type,
        party_id: invoiceData.party_id,
        party_name: invoiceData.parties?.name,
        date: invoiceData.date,
        total_amount: invoiceData.total_amount,
        status: invoiceData.status,
        payment_status: invoiceData.payment_status || 'draft',
        notes: invoiceData.notes,
        created_at: invoiceData.created_at,
        items: items
      };
    } catch (error) {
      console.error(`Error fetching invoice with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات الفاتورة');
      return null;
    }
  }
  
  public async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      console.log('Creating invoice with data:', invoiceData);
      
      // Format date if it's a Date object
      const formattedDate = typeof invoiceData.date === 'object' ? 
        format(invoiceData.date, 'yyyy-MM-dd') : 
        invoiceData.date;
      
      // Create the invoice record
      const { data: invoiceRecord, error } = await this.supabase
        .from('invoices')
        .insert({
          invoice_type: invoiceData.invoice_type,
          party_id: invoiceData.party_id,
          date: formattedDate,
          total_amount: invoiceData.total_amount,
          status: invoiceData.status || 'unpaid', 
          payment_status: invoiceData.payment_status || 'draft',
          notes: invoiceData.notes
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating invoice record:', error);
        throw error;
      }
      
      console.log('Invoice created successfully:', invoiceRecord);
      
      // If there are items for this invoice, insert them
      if (invoiceData.items && invoiceData.items.length > 0) {
        console.log('Adding invoice items:', invoiceData.items);
        
        const invoiceItems = invoiceData.items.map(item => ({
          invoice_id: invoiceRecord.id,
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
        
        if (itemsError) {
          console.error('Error adding invoice items:', itemsError);
          throw itemsError;
        }
        
        console.log('Invoice items added successfully');
      }
      
      // Get party details for response
      const party = await this.partyService.getPartyById(invoiceData.party_id);
      console.log('Party details:', party);
      
      // If invoice status is not "draft", automatically confirm it
      if (invoiceData.payment_status === 'confirmed') {
        await this.confirmInvoice(invoiceRecord.id);
      }
      
      toast.success('تم إنشاء الفاتورة بنجاح');
      
      return {
        id: invoiceRecord.id,
        invoice_type: invoiceData.invoice_type,
        party_id: invoiceData.party_id,
        party_name: party?.name,
        date: formattedDate,
        total_amount: invoiceData.total_amount,
        status: invoiceRecord.status,
        payment_status: invoiceRecord.payment_status,
        notes: invoiceData.notes,
        created_at: invoiceRecord.created_at,
        items: invoiceData.items
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
      return null;
    }
  }
  
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      console.log('Confirming invoice:', invoiceId);
      
      const invoiceData = await this.getInvoiceById(invoiceId);
      if (!invoiceData) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoiceData.payment_status === 'confirmed') {
        toast.info('الفاتورة مؤكدة بالفعل');
        return true;
      }
      
      // Update inventory based on invoice type
      if (invoiceData.invoice_type === 'sale') {
        // Decrease inventory for sales invoices
        for (const item of invoiceData.items || []) {
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
        
        // Update financial records for sales invoices
        if (invoiceData.party_id) {
          console.log('Updating party balance for sale invoice');
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            true, // debit for sales (increase customer's debt)
            'فاتورة مبيعات',
            'sale_invoice',
            invoiceData.id
          );
        }
      } else if (invoiceData.invoice_type === 'purchase') {
        // Increase inventory for purchase invoices
        for (const item of invoiceData.items || []) {
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
        
        // Update financial records for purchase invoices
        if (invoiceData.party_id) {
          console.log('Updating party balance for purchase invoice');
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            false, // credit for purchases (increase our debt)
            'فاتورة مشتريات',
            'purchase_invoice',
            invoiceData.id
          );
        }
      }
      
      // Update invoice status to confirmed
      const { error } = await this.supabase
        .from('invoices')
        .update({ payment_status: 'confirmed' })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      console.log('Invoice confirmed successfully');
      
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
      const invoiceData = await this.getInvoiceById(invoiceId);
      if (!invoiceData) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoiceData.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء الفواتير المؤكدة فقط');
        return false;
      }
      
      // Update inventory based on invoice type
      if (invoiceData.invoice_type === 'sale') {
        // Increase inventory for cancelled sales invoices
        for (const item of invoiceData.items || []) {
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
        
        // Update financial records for cancelled sales invoices
        if (invoiceData.party_id) {
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            false, // credit for cancelled sales (reduce customer's debt)
            'إلغاء فاتورة مبيعات',
            'cancel_sale_invoice',
            invoiceData.id
          );
        }
      } else if (invoiceData.invoice_type === 'purchase') {
        // Decrease inventory for cancelled purchase invoices
        for (const item of invoiceData.items || []) {
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
        
        // Update financial records for cancelled purchase invoices
        if (invoiceData.party_id) {
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            true, // debit for cancelled purchases (reduce our debt)
            'إلغاء فاتورة مشتريات',
            'cancel_purchase_invoice',
            invoiceData.id
          );
        }
      }
      
      // Update invoice status to cancelled
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
      // Delete invoice items first
      const { error: itemsError } = await this.supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);
      
      if (itemsError) throw itemsError;
      
      // Delete the invoice
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
  
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return;
      }
      
      const remainingAmount = invoice.total_amount - paymentAmount;
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (remainingAmount <= 0) {
        newStatus = 'paid';
      } else if (paymentAmount > 0) {
        newStatus = 'partial';
      }
      
      const { error } = await this.supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
      if (error) {
        console.error('Error updating invoice status:', error);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
      } else {
        toast.success('تم تحديث حالة الفاتورة بنجاح');
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
    }
  }
  
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return;
      }
      
      const remainingAmount = invoice.total_amount + paymentAmount;
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (remainingAmount <= 0) {
        newStatus = 'paid';
      } else if (paymentAmount > 0) {
        newStatus = 'partial';
      }
      
      const { error } = await this.supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);
      
      if (error) {
        console.error('Error updating invoice status:', error);
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
      } else {
        toast.success('تم تحديث حالة الفاتورة بنجاح');
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
    }
  }
}

export default InvoiceService;
