
import { supabase } from "@/integrations/supabase/client";
import { Return, ReturnItem } from "@/services/CommercialTypes";

export class ReturnEntity {
  /**
   * Fetch all returns with their related data
   */
  static async fetchAll(): Promise<Return[]> {
    try {
      let { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties:party_id (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Map the data to our Return type with party name
      const returnsWithParties = data.map(returnData => ({
        id: returnData.id,
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        party_name: returnData.parties?.name,
        date: returnData.date,
        return_type: returnData.return_type as "sales_return" | "purchase_return",
        amount: returnData.amount,
        payment_status: returnData.payment_status as "draft" | "confirmed" | "cancelled",
        notes: returnData.notes,
        created_at: returnData.created_at,
        items: [] // Initialize with empty items array
      }));
      
      // For each return, get its items
      const returnsWithItems = await Promise.all(
        returnsWithParties.map(async (returnData) => {
          const { data: items, error: itemsError } = await supabase
            .from('return_items')
            .select('*')
            .eq('return_id', returnData.id);
          
          if (itemsError) {
            console.error(`Error fetching items for return ${returnData.id}:`, itemsError);
            return returnData;
          }
          
          // Map return items to the correct type
          const typedItems = items ? items.map(item => ({
            id: item.id,
            return_id: item.return_id,
            item_id: item.item_id,
            item_type: item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total
          })) : [];
          
          return {
            ...returnData,
            items: typedItems
          };
        })
      );
      
      return returnsWithItems;
    } catch (error) {
      console.error('Error fetching returns:', error);
      return [];
    }
  }
  
  /**
   * Fetch a specific return by ID with its related data
   */
  static async fetchById(id: string): Promise<Return | null> {
    try {
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('id', id)
        .single();
      
      if (returnError) throw returnError;
      
      const { data: items, error: itemsError } = await supabase
        .from('return_items')
        .select('*')
        .eq('return_id', id);
      
      if (itemsError) throw itemsError;
      
      // Map return items to the correct type
      const typedItems = items ? items.map(item => ({
        id: item.id,
        return_id: item.return_id,
        item_id: item.item_id,
        item_type: item.item_type as 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products',
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        created_at: item.created_at || returnData.created_at // Ensure created_at is present
      })) : [];
      
      return {
        id: returnData.id,
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        party_name: returnData.parties?.name,
        date: returnData.date,
        return_type: returnData.return_type as "sales_return" | "purchase_return",
        amount: returnData.amount,
        payment_status: returnData.payment_status as "draft" | "confirmed" | "cancelled",
        notes: returnData.notes,
        created_at: returnData.created_at,
        items: typedItems
      };
    } catch (error) {
      console.error(`Error fetching return with id ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Create a new return with its items
   */
  static async create(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      // Create the return record
      const { data: returnRecord, error } = await supabase
        .from('returns')
        .insert({
          invoice_id: returnData.invoice_id,
          party_id: returnData.party_id,
          date: returnData.date,
          return_type: returnData.return_type,
          amount: returnData.amount,
          payment_status: returnData.payment_status || 'draft',
          notes: returnData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // If there are items for this return, insert them
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
        
        const { error: itemsError } = await supabase
          .from('return_items')
          .insert(returnItems);
        
        if (itemsError) throw itemsError;
      }
      
      return {
        id: returnRecord.id,
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        party_name: returnData.party_name,
        date: returnData.date,
        return_type: returnData.return_type as "sales_return" | "purchase_return",
        amount: returnData.amount,
        payment_status: returnRecord.payment_status as "draft" | "confirmed" | "cancelled",
        notes: returnData.notes,
        created_at: returnRecord.created_at,
        items: returnData.items.map(item => ({
          ...item,
          id: '', // These will be generated by the database
          return_id: returnRecord.id,
          created_at: returnRecord.created_at // Ensure created_at is present
        }))
      };
    } catch (error) {
      console.error('Error creating return:', error);
      return null;
    }
  }
  
  /**
   * Update an existing return
   */
  static async update(id: string, returnData: Partial<Return>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('returns')
        .update({
          invoice_id: returnData.invoice_id,
          party_id: returnData.party_id,
          date: returnData.date,
          return_type: returnData.return_type,
          amount: returnData.amount,
          payment_status: returnData.payment_status,
          notes: returnData.notes
        })
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating return:', error);
      return false;
    }
  }
  
  /**
   * Delete a return and its items
   */
  static async delete(id: string): Promise<boolean> {
    try {
      // Delete return items first (cascade should handle this, but just to be safe)
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
      
      return true;
    } catch (error) {
      console.error('Error deleting return:', error);
      return false;
    }
  }
}
