
import { supabase } from "@/integrations/supabase/client";
import { Return, ReturnItem } from '@/services/CommercialTypes';
import { toast } from "sonner";
import { format } from 'date-fns';

// خدمة تُعنى بعمليات جلب وإنشاء المرتجعات
export class ReturnEntity {
  // جلب كافة المرتجعات
  public static async fetchAll(): Promise<Return[]> {
    try {
      // Get all returns with party details
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
        return_type: returnData.return_type,
        amount: returnData.amount,
        payment_status: returnData.payment_status || 'draft',
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
          
          return {
            ...returnData,
            items: items || []
          };
        })
      );
      
      return returnsWithItems;
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }
  
  // جلب مرتجع بالمعرف
  public static async fetchById(id: string): Promise<Return | null> {
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
      
      return {
        id: returnData.id,
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        party_name: returnData.parties?.name,
        date: returnData.date,
        return_type: returnData.return_type,
        amount: returnData.amount,
        payment_status: returnData.payment_status || 'draft',
        notes: returnData.notes,
        created_at: returnData.created_at,
        items: items || []
      };
    } catch (error) {
      console.error(`Error fetching return with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات المرتجع');
      return null;
    }
  }
  
  // إنشاء مرتجع جديد
  public static async create(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      console.log('Creating return with data:', returnData);
      
      // Format date if it's a Date object
      const formattedDate = typeof returnData.date === 'object' ? 
        format(returnData.date, 'yyyy-MM-dd') : 
        returnData.date;
      
      // Create the return record
      const { data: returnRecord, error } = await supabase
        .from('returns')
        .insert({
          invoice_id: returnData.invoice_id,
          party_id: returnData.party_id,
          date: formattedDate,
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
      
      // Get party details for response
      const { data: party } = await supabase
        .from('parties')
        .select('name')
        .eq('id', returnData.party_id)
        .single();
      
      console.log('Return created successfully:', returnRecord);
      
      return {
        id: returnRecord.id,
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        party_name: party?.name,
        date: formattedDate,
        return_type: returnData.return_type,
        amount: returnData.amount,
        payment_status: returnRecord.payment_status,
        notes: returnData.notes,
        created_at: returnRecord.created_at,
        items: returnData.items
      };
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء إنشاء المرتجع');
      return null;
    }
  }
  
  // تحديث مرتجع
  public static async update(id: string, returnData: Partial<Return>): Promise<boolean> {
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
      
      toast.success('تم تحديث المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating return:', error);
      toast.error('حدث خطأ أثناء تحديث المرتجع');
      return false;
    }
  }
  
  // حذف مرتجع
  public static async delete(id: string): Promise<boolean> {
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
}
