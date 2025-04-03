
import { supabase } from "@/integrations/supabase/client";
import { Invoice, InvoiceItem } from "@/services/commercial/CommercialTypes";
import { InvoiceProcessor } from "./InvoiceProcessor";
import { toast } from "sonner";

export class InvoiceEntity {
  private static invoiceProcessor = new InvoiceProcessor();
  
  /**
   * Find all invoices
   */
  static async findAll(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties:party_id (name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch items for all invoices
      const invoiceIds = data.map(invoice => invoice.id);
      const { data: allItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .in('invoice_id', invoiceIds);
      
      if (itemsError) throw itemsError;
      
      // Map items to their respective invoices
      const invoicesWithItems = data.map(invoice => {
        const items = allItems.filter(item => item.invoice_id === invoice.id);
        return {
          ...invoice,
          party_name: invoice.parties ? invoice.parties.name : 'Unknown',
          items: items || []
        };
      });
      
      return invoicesWithItems as Invoice[];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
    }
  }
  
  /**
   * Find invoices by party ID
   */
  static async findByParty(partyId: string): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('party_id', partyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch items for all invoices
      const invoiceIds = data.map(invoice => invoice.id);
      const { data: allItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .in('invoice_id', invoiceIds);
      
      if (itemsError) throw itemsError;
      
      // Map items to their respective invoices
      const invoicesWithItems = data.map(invoice => {
        const items = allItems.filter(item => item.invoice_id === invoice.id);
        return {
          ...invoice,
          party_name: invoice.parties ? invoice.parties.name : 'Unknown',
          items: items || []
        };
      });
      
      return invoicesWithItems as Invoice[];
    } catch (error) {
      console.error('Error fetching invoices by party:', error);
      toast.error('حدث خطأ أثناء جلب فواتير الطرف');
      return [];
    }
  }
  
  /**
   * Find invoice by ID
   */
  static async findById(id: string): Promise<Invoice | null> {
    try {
      const { data: invoice, error } = await supabase
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
        ...invoice,
        party_name: invoice.parties ? invoice.parties.name : 'Unknown',
        items: items || [],
      } as Invoice;
    } catch (error) {
      console.error('Error fetching invoice by ID:', error);
      toast.error('حدث خطأ أثناء جلب تفاصيل الفاتورة');
      return null;
    }
  }
  
  /**
   * Create a new invoice
   */
  static async create(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      // Insert invoice
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          party_id: invoiceData.party_id,
          invoice_type: invoiceData.invoice_type,
          payment_status: invoiceData.payment_status || 'draft',
          status: invoiceData.status || 'unpaid',
          date: invoiceData.date,
          total_amount: invoiceData.total_amount,
          notes: invoiceData.notes || '',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Insert invoice items
      if (invoice && invoiceData.items && invoiceData.items.length > 0) {
        const formattedItems = invoiceData.items.map((item) => ({
          invoice_id: invoice.id,
          item_id: item.item_id,
          item_name: item.item_name,
          item_type: item.item_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        }));
        
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(formattedItems);
        
        if (itemsError) throw itemsError;
      }
      
      // Return the created invoice with items
      return this.findById(invoice.id);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
      return null;
    }
  }
  
  /**
   * Update an invoice
   */
  static async update(id: string, invoiceData: Partial<Invoice>): Promise<Invoice | null> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          party_id: invoiceData.party_id,
          invoice_type: invoiceData.invoice_type,
          payment_status: invoiceData.payment_status,
          status: invoiceData.status,
          date: invoiceData.date,
          total_amount: invoiceData.total_amount,
          notes: invoiceData.notes,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update items if provided
      if (invoiceData.items) {
        // Delete existing items
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id);
        
        // Insert new items
        const formattedItems = invoiceData.items.map((item) => ({
          invoice_id: id,
          item_id: item.item_id,
          item_name: item.item_name,
          item_type: item.item_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        }));
        
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(formattedItems);
        
        if (itemsError) throw itemsError;
      }
      
      return this.findById(id);
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('حدث خطأ أثناء تحديث الفاتورة');
      return null;
    }
  }
  
  /**
   * Delete an invoice
   */
  static async delete(id: string): Promise<boolean> {
    try {
      // Delete invoice items first (due to foreign key constraints)
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);
      
      if (itemsError) throw itemsError;
      
      // Then delete the invoice
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
  
  /**
   * Confirm an invoice
   */
  static async confirmInvoice(invoiceId: string): Promise<boolean> {
    return InvoiceEntity.invoiceProcessor.confirmInvoice(invoiceId);
  }
}
