
import BaseCommercialService from './BaseCommercialService';
import { Invoice, InvoiceItem } from '../CommercialTypes';
import { toast } from "sonner";

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
        items: []
      }));
      
      return invoicesWithParties;
    } catch (error) {
      console.error(`Error fetching invoices for party ${partyId}:`, error);
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
  
  public async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      // Set default payment status to draft if not provided
      const paymentStatus = invoiceData.payment_status || 'draft';
      
      // First insert the invoice
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
      
      // Then insert all the invoice items
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
      
      // Get the party name for the response
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
      // Get the invoice with items
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      // Check if the invoice is already confirmed
      if (invoice.payment_status === 'confirmed') {
        toast.info('الفاتورة مؤكدة بالفعل');
        return true;
      }
      
      // Update inventory based on invoice type
      if (invoice.invoice_type === 'sale') {
        // Decrease inventory for sales
        for (const item of invoice.items) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
              break;
          }
        }
        
        // Update customer financial records for sales
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          true, // debit for sales (customer owes money)
          'فاتورة مبيعات',
          'sale_invoice',
          invoice.id
        );
      } else if (invoice.invoice_type === 'purchase') {
        // Increase inventory for purchases
        for (const item of invoice.items) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
              break;
          }
        }
        
        // Update supplier financial records for purchases
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          false, // credit for purchases (we owe money)
          'فاتورة مشتريات',
          'purchase_invoice',
          invoice.id
        );
      }
      
      // Update invoice status to confirmed
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
  
  private async getNewQuantity(itemType: string, itemId: number, quantityChange: number): Promise<number> {
    try {
      let currentQuantity = 0;
      
      switch (itemType) {
        case 'raw_materials':
          const { data: rawMaterial } = await this.supabase
            .from('raw_materials')
            .select('quantity')
            .eq('id', itemId)
            .single();
          currentQuantity = rawMaterial?.quantity || 0;
          break;
        case 'packaging_materials':
          const { data: packagingMaterial } = await this.supabase
            .from('packaging_materials')
            .select('quantity')
            .eq('id', itemId)
            .single();
          currentQuantity = packagingMaterial?.quantity || 0;
          break;
        case 'semi_finished_products':
          const { data: semiFinishedProduct } = await this.supabase
            .from('semi_finished_products')
            .select('quantity')
            .eq('id', itemId)
            .single();
          currentQuantity = semiFinishedProduct?.quantity || 0;
          break;
        case 'finished_products':
          const { data: finishedProduct } = await this.supabase
            .from('finished_products')
            .select('quantity')
            .eq('id', itemId)
            .single();
          currentQuantity = finishedProduct?.quantity || 0;
          break;
      }
      
      return currentQuantity + quantityChange;
    } catch (error) {
      console.error('Error getting current quantity:', error);
      throw error;
    }
  }
  
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      // Get the invoice with items
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      // Only confirmed invoices can be cancelled
      if (invoice.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء الفواتير المؤكدة فقط');
        return false;
      }
      
      // Reverse inventory updates based on invoice type
      if (invoice.invoice_type === 'sale') {
        // Increase inventory for cancelled sales
        for (const item of invoice.items) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, item.quantity) });
              break;
          }
        }
        
        // Update customer financial records for cancelled sales
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          false, // credit for cancelled sales (reverse the debit)
          'إلغاء فاتورة مبيعات',
          'cancel_sale_invoice',
          invoice.id
        );
      } else if (invoice.invoice_type === 'purchase') {
        // Decrease inventory for cancelled purchases
        for (const item of invoice.items) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: this.getNewQuantity(item.item_type, item.item_id, -item.quantity) });
              break;
          }
        }
        
        // Update supplier financial records for cancelled purchases
        await this.partyService.updatePartyBalance(
          invoice.party_id,
          invoice.total_amount,
          true, // debit for cancelled purchases (reverse the credit)
          'إلغاء فاتورة مشتريات',
          'cancel_purchase_invoice',
          invoice.id
        );
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
      const invoice = await this.getInvoiceById(id);
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      // Only draft invoices can be deleted
      if (invoice.payment_status !== 'draft') {
        toast.error('لا يمكن حذف الفواتير المؤكدة، يمكن إلغاءها فقط');
        return false;
      }
      
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
  
  private async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const { data: invoice, error } = await this.supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (error) throw error;
      
      let newStatus = invoice.status;
      
      // Calculate how much has been paid including this payment
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
      
      // Calculate how much has been paid after cancelling this payment
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
}

export default InvoiceService;
