
import { supabase } from "@/integrations/supabase/client";
import { Invoice, InvoiceItem } from '@/services/CommercialTypes';
import { toast } from "sonner";
import { format } from 'date-fns';

// خدمة تُعنى بعمليات جلب وإنشاء الفواتير
export class InvoiceEntity {
  // جلب كافة الفواتير
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
  
  // جلب الفواتير حسب الطرف
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
  
  // جلب فاتورة بالمعرف
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
  
  // إنشاء فاتورة جديدة
  public static async create(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      console.log('Creating invoice with data:', invoiceData);
      
      // Format date if it's a Date object
      const formattedDate = typeof invoiceData.date === 'object' ? 
        format(invoiceData.date, 'yyyy-MM-dd') : 
        invoiceData.date;
      
      // Create the invoice record
      const { data: invoiceRecord, error } = await supabase
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
        
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);
        
        if (itemsError) {
          console.error('Error adding invoice items:', itemsError);
          throw itemsError;
        }
        
        console.log('Invoice items added successfully');
      }
      
      // Get party details for response
      const { data: party } = await supabase
        .from('parties')
        .select('name')
        .eq('id', invoiceData.party_id)
        .single();
        
      console.log('Party details:', party);
      
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
  
  // حذف فاتورة
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
      
      toast.success('تم حذف الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('حدث خطأ أثناء حذف الفاتورة');
      return false;
    }
  }
}
