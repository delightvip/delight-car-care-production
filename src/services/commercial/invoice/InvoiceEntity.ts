
import { supabase } from "@/integrations/supabase/client";
import { Invoice } from '@/services/CommercialTypes';
import { toast } from "sonner";

export class InvoiceEntity {
  // Static method to fetch all invoices
  public static async fetchAll(): Promise<Invoice[]> {
    try {
      // First, get all invoices with basic information
      let { data, error } = await supabase
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
        invoice_type: invoice.invoice_type as 'sale' | 'purchase',
        party_id: invoice.party_id,
        party_name: invoice.parties?.name,
        date: invoice.date,
        total_amount: invoice.total_amount,
        status: invoice.status as 'paid' | 'partial' | 'unpaid',
        payment_status: invoice.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: invoice.notes,
        created_at: invoice.created_at,
        items: [] // Initialize with empty items array
      }));
      
      // For each invoice, get its items
      const invoicesWithItems = await Promise.all(
        invoicesWithParties.map(async (invoice) => {
          const { data: items, error: itemsError } = await supabase
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
  
  // Static method to fetch invoices by party
  public static async fetchByParty(partyId: string): Promise<Invoice[]> {
    try {
      let { data, error } = await supabase
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
        invoice_type: invoice.invoice_type as 'sale' | 'purchase',
        party_id: invoice.party_id,
        party_name: invoice.parties?.name,
        date: invoice.date,
        total_amount: invoice.total_amount,
        status: invoice.status as 'paid' | 'partial' | 'unpaid',
        payment_status: invoice.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: invoice.notes,
        created_at: invoice.created_at,
        items: [] // Initialize with empty items array
      }));
      
      // For each invoice, get its items
      const invoicesWithItems = await Promise.all(
        invoicesWithParties.map(async (invoice) => {
          const { data: items, error: itemsError } = await supabase
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
  
  // Static method to fetch a single invoice by ID
  public static async fetchById(id: string): Promise<Invoice | null> {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', id)
        .single();
      
      if (invoiceError) throw invoiceError;
      
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id);
      
      if (itemsError) throw itemsError;
      
      return {
        id: invoiceData.id,
        invoice_type: invoiceData.invoice_type as 'sale' | 'purchase',
        party_id: invoiceData.party_id,
        party_name: invoiceData.parties?.name,
        date: invoiceData.date,
        total_amount: invoiceData.total_amount,
        status: invoiceData.status as 'paid' | 'partial' | 'unpaid',
        payment_status: invoiceData.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: invoiceData.notes,
        created_at: invoiceData.created_at,
        items: items || []
      };
    } catch (error) {
      console.error(`Error fetching invoice with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات الفاتورة');
      return null;
    }
  }
  
  // Method to create a new invoice
  public static async create(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      // Create the invoice record
      const { data: invoiceRecord, error } = await supabase
        .from('invoices')
        .insert({
          invoice_type: invoiceData.invoice_type,
          party_id: invoiceData.party_id,
          date: invoiceData.date,
          total_amount: invoiceData.total_amount,
          status: invoiceData.status,
          payment_status: invoiceData.payment_status,
          notes: invoiceData.notes
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating invoice record:', error);
        throw error;
      }
      
      // If there are items for this invoice, insert them
      if (invoiceData.items && invoiceData.items.length > 0) {
        const invoiceItems = invoiceData.items.map(item => ({
          invoice_id: invoiceRecord.id,
          item_id: item.item_id,
          item_type: item.item_type,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price
        }));
        
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);
        
        if (itemsError) {
          console.error('Error adding invoice items:', itemsError);
          throw itemsError;
        }
      }
      
      return {
        ...invoiceRecord,
        invoice_type: invoiceRecord.invoice_type as 'sale' | 'purchase',
        status: invoiceRecord.status as 'paid' | 'partial' | 'unpaid',
        payment_status: invoiceRecord.payment_status as 'draft' | 'confirmed' | 'cancelled',
        party_name: '', // This will be filled by the service
        items: invoiceData.items || []
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }
  
  // Method to delete an invoice
  public static async delete(id: string): Promise<boolean> {
    try {
      // Delete invoice items first
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);
      
      if (itemsError) throw itemsError;
      
      // Delete the invoice
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }
  
  // Method to update an invoice's payment status
  public static async updatePaymentStatus(id: string, status: 'draft' | 'confirmed' | 'cancelled'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          payment_status: status,
          // Update the updated_at timestamp
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating invoice payment status:', error);
      throw error;
    }
  }
  
  // Method to update an invoice's status based on payment
  public static async updateStatus(id: string, status: 'paid' | 'partial' | 'unpaid'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: status,
          // Update the updated_at timestamp
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }
}
