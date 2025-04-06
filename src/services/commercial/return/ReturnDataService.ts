
import { supabase } from "@/integrations/supabase/client";
import { Return, ReturnItem } from "@/types/returns";

/**
 * خدمة بيانات المرتجعات
 * مسؤولة عن عمليات قراءة وكتابة بيانات المرتجعات في قاعدة البيانات
 */
export class ReturnDataService {
  /**
   * الحصول على جميع المرتجعات
   */
  public async getReturns(): Promise<Return[]> {
    try {
      // جلب المرتجعات مع اسم الطرف
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // تنسيق البيانات
      return data.map(item => ({
        id: item.id,
        date: item.date,
        return_type: item.return_type,
        invoice_id: item.invoice_id,
        party_id: item.party_id,
        party_name: item.parties?.name,
        amount: item.amount,
        payment_status: item.payment_status,
        notes: item.notes,
        created_at: item.created_at
      }));
    } catch (error) {
      console.error('Error fetching returns:', error);
      return [];
    }
  }
  
  /**
   * الحصول على مرتجع محدد مع بنوده
   */
  public async getReturnById(id: string): Promise<Return | null> {
    try {
      // جلب بيانات المرتجع
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // جلب بنود المرتجع
      const { data: items, error: itemsError } = await supabase
        .from('return_items')
        .select('*')
        .eq('return_id', id);
      
      if (itemsError) throw itemsError;
      
      // تنسيق البيانات
      return {
        id: data.id,
        date: data.date,
        return_type: data.return_type,
        invoice_id: data.invoice_id,
        party_id: data.party_id,
        party_name: data.parties?.name,
        amount: data.amount,
        payment_status: data.payment_status,
        notes: data.notes,
        created_at: data.created_at,
        items: items as ReturnItem[]
      };
    } catch (error) {
      console.error(`Error fetching return ${id}:`, error);
      return null;
    }
  }
  
  /**
   * إنشاء مرتجع جديد
   */
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      // إنشاء المرتجع
      const { data, error } = await supabase
        .from('returns')
        .insert({
          date: returnData.date,
          return_type: returnData.return_type,
          invoice_id: returnData.invoice_id,
          party_id: returnData.party_id,
          amount: returnData.amount,
          payment_status: returnData.payment_status || 'draft',
          notes: returnData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // إنشاء بنود المرتجع
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
      
      // إرجاع البيانات
      return {
        ...data,
        items: returnData.items
      } as Return;
    } catch (error) {
      console.error('Error creating return:', error);
      return null;
    }
  }
  
  /**
   * تحديث حالة المرتجع
   */
  public async updateReturnStatus(id: string, status: 'draft' | 'confirmed' | 'cancelled'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('returns')
        .update({ payment_status: status })
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error(`Error updating return status for ${id}:`, error);
      return false;
    }
  }
  
  /**
   * حذف بنود المرتجع
   */
  public async deleteReturnItems(returnId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('return_items')
        .delete()
        .eq('return_id', returnId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error(`Error deleting return items for ${returnId}:`, error);
      return false;
    }
  }
  
  /**
   * حذف المرتجع
   */
  public async deleteReturn(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('returns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error(`Error deleting return ${id}:`, error);
      return false;
    }
  }
}

export default ReturnDataService;
