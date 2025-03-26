import { supabase } from "@/integrations/supabase/client";
import { Invoice, InvoiceItem } from "@/services/CommercialTypes";

export class InvoiceEntity {
  /**
   * Fetch all invoices with their related data
   */
  static async fetchAll(): Promise<Invoice[]> {
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
      
      // Correctly map the status type
      return data.map(invoice => ({
        id: invoice.id,
        invoice_type: invoice.invoice_type as "sale" | "purchase",
        party_id: invoice.party_id,
        party_name: invoice.parties?.name,
        date: invoice.date,
        total_amount: invoice.total_amount,
        status: this.mapStatusType(invoice.status),
        payment_status: invoice.payment_status as "draft" | "confirmed" | "cancelled",
        notes: invoice.notes,
        created_at: invoice.created_at,
        items: []  // Initialize with empty items
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }
  
  /**
   * Fetch invoices by party
   */
  static async fetchByParty(partyId: string): Promise<Invoice[]> {
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
      
      // Correctly map the status type
      return data.map(invoice => ({
        id: invoice.id,
        invoice_type: invoice.invoice_type as "sale" | "purchase",
        party_id: invoice.party_id,
        party_name: invoice.parties?.name,
        date: invoice.date,
        total_amount: invoice.total_amount,
        status: this.mapStatusType(invoice.status),
        payment_status: invoice.payment_status as "draft" | "confirmed" | "cancelled",
        notes: invoice.notes,
        created_at: invoice.created_at,
        items: []  // Initialize with empty items
      }));
    } catch (error) {
      console.error(`Error fetching invoices for party ${partyId}:`, error);
      return [];
    }
  }
  
  /**
   * Fetch a specific invoice by ID with its related data
   */
  static async fetchById(id: string): Promise<Invoice | null> {
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
      
      // Map invoice items to the correct type
      const typedItems = items ? items.map(item => ({
        id: item.id,
        invoice_id: item.invoice_id,
        item_id: item.item_id,
        item_type: item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        created_at: item.created_at
      })) : [];
      
      return {
        id: invoiceData.id,
        invoice_type: invoiceData.invoice_type as "sale" | "purchase",
        party_id: invoiceData.party_id,
        party_name: invoiceData.parties?.name,
        date: invoiceData.date,
        total_amount: invoiceData.total_amount,
        status: invoiceData.status as "paid" | "partial" | "unpaid",
        payment_status: invoiceData.payment_status as "draft" | "confirmed" | "cancelled",
        notes: invoiceData.notes,
        created_at: invoiceData.created_at,
        items: typedItems
      };
    } catch (error) {
      console.error(`Error fetching invoice with id ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Create a new invoice with its items
   */
  static async create(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      // Create the invoice record
      const { data: invoiceRecord, error } = await supabase
        .from('invoices')
        .insert({
          party_id: invoiceData.party_id,
          date: invoiceData.date,
          invoice_type: invoiceData.invoice_type,
          payment_status: invoiceData.payment_status || 'draft',
          status: this.mapStatusType(invoiceData.status),
          notes: invoiceData.notes,
          total_amount: invoiceData.total_amount || 0
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // If there are items for this invoice, insert them
      if (invoiceData.items && invoiceData.items.length > 0) {
        const invoiceItems = invoiceData.items.map(item => ({
          invoice_id: invoiceRecord.id,
          item_id: item.item_id,
          item_type: item.item_type,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price
        }));
        
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);
        
        if (itemsError) throw itemsError;
      }
      
      return {
        ...invoiceRecord,
        invoice_type: invoiceRecord.invoice_type as "sale" | "purchase",
        status: invoiceRecord.status as "paid" | "partial" | "unpaid",
        payment_status: invoiceRecord.payment_status as "draft" | "confirmed" | "cancelled",
        party_name: invoiceData.party_name,
        items: invoiceData.items
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      return null;
    }
  }
  
  /**
   * Update an existing invoice
   */
  static async update(id: string, invoiceData: Partial<Invoice>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          invoice_type: invoiceData.invoice_type,
          party_id: invoiceData.party_id,
          date: invoiceData.date,
          total_amount: invoiceData.total_amount,
          status: invoiceData.status,
          payment_status: invoiceData.payment_status,
          notes: invoiceData.notes
        })
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating invoice:', error);
      return false;
    }
  }
  
  /**
   * Delete an invoice and its items
   */
  static async delete(id: string): Promise<boolean> {
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
      return false;
    }
  }
  
  // Helper method to map status types
  private static mapStatusType(status: string): "draft" | "pending" | "paid" | "partially_paid" | "cancelled" | "overdue" {
    switch (status) {
      case 'unpaid':
        return 'pending';
      case 'partial':
        return 'partially_paid';
      case 'paid':
        return 'paid';
      case 'cancelled':
        return 'cancelled';
      case 'overdue':
        return 'overdue';
      default:
        return 'draft';
    }
  }
}
