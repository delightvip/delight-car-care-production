
import { supabase } from "@/integrations/supabase/client";
import { Return, ReturnItem } from "@/types/returns";
import { toast } from "sonner";

/**
 * خدمة التعامل مع قاعدة البيانات للمرتجعات
 */
export class ReturnDataService {
  /**
   * جلب جميع المرتجعات
   */
  public async fetchAllReturns(): Promise<Return[]> {
    try {
      // استعلام جلب المرتجعات مع أسماء الأطراف
      let { data: returns, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties:party_id (name)
        `)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      if (!returns || returns.length === 0) {
        return [];
      }

      // تنسيق البيانات
      const formattedReturns = returns.map(ret => ({
        ...ret,
        party_name: ret.parties?.name || 'غير محدد',
        return_type: ret.return_type as 'sales_return' | 'purchase_return',
        payment_status: ret.payment_status as 'draft' | 'confirmed' | 'cancelled'
      }));

      return formattedReturns as Return[];
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }

  /**
   * جلب مرتجع محدد بواسطة المعرف مع أصنافه
   */
  public async fetchReturnById(id: string): Promise<Return | null> {
    try {
      // استعلام جلب المرتجع مع اسم الطرف
      let { data: returnData, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      if (!returnData) {
        return null;
      }

      // جلب أصناف المرتجع
      const { data: returnItems, error: itemsError } = await supabase
        .from('return_items')
        .select('*')
        .eq('return_id', id);

      if (itemsError) {
        throw itemsError;
      }

      // Map item_type to the proper type
      const typedItems = returnItems?.map(item => ({
        ...item,
        item_type: item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products"
      })) || [];

      // تنسيق البيانات النهائية
      const formattedReturn: Return = {
        ...returnData,
        party_name: returnData.parties?.name || 'غير محدد',
        items: typedItems as ReturnItem[],
        return_type: returnData.return_type as 'sales_return' | 'purchase_return',
        payment_status: returnData.payment_status as 'draft' | 'confirmed' | 'cancelled'
      };

      return formattedReturn;
    } catch (error) {
      console.error(`Error fetching return with ID ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات المرتجع');
      return null;
    }
  }

  /**
   * إنشاء مرتجع جديد
   */
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      // إنشاء المرتجع في قاعدة البيانات
      const { data: newReturn, error } = await supabase
        .from('returns')
        .insert({
          return_type: returnData.return_type,
          invoice_id: returnData.invoice_id,
          party_id: returnData.party_id,
          date: returnData.date,
          amount: returnData.amount,
          payment_status: 'draft',
          notes: returnData.notes
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating return:", error);
        throw error;
      }

      // إضافة أصناف المرتجع
      if (returnData.items && returnData.items.length > 0) {
        const selectedItems = returnData.items.filter(item => item.quantity > 0);
        
        if (selectedItems.length === 0) {
          throw new Error("لا يوجد أصناف محددة للمرتجع");
        }
        
        const formattedItems = selectedItems.map(item => ({
          return_id: newReturn.id,
          item_id: item.item_id,
          item_type: item.item_type,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price
        }));

        const { error: itemsError } = await supabase
          .from('return_items')
          .insert(formattedItems);

        if (itemsError) {
          throw itemsError;
        }
      }
      
      // Return the created return with proper type casting
      return {
        ...newReturn,
        return_type: newReturn.return_type as 'sales_return' | 'purchase_return',
        payment_status: newReturn.payment_status as 'draft' | 'confirmed' | 'cancelled',
        party_name: returnData.party_name
      } as Return;
    } catch (error) {
      console.error('Error creating return:', error);
      throw error;
    }
  }

  /**
   * تحديث مرتجع موجود
   */
  public async updateReturn(id: string, returnData: Partial<Return>): Promise<boolean> {
    try {
      // تحديث بيانات المرتجع
      const { error } = await supabase
        .from('returns')
        .update({
          return_type: returnData.return_type,
          invoice_id: returnData.invoice_id,
          party_id: returnData.party_id,
          date: returnData.date,
          amount: returnData.amount,
          payment_status: returnData.payment_status,
          notes: returnData.notes
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // تحديث أصناف المرتجع إذا كانت موجودة
      if (returnData.items && returnData.items.length > 0) {
        // حذف جميع الأصناف الحالية
        const { error: deleteError } = await supabase
          .from('return_items')
          .delete()
          .eq('return_id', id);

        if (deleteError) {
          throw deleteError;
        }

        // إضافة الأصناف الجديدة
        const selectedItems = returnData.items.filter(item => item.quantity > 0);
        
        if (selectedItems.length > 0) {
          const formattedItems = selectedItems.map(item => ({
            return_id: id,
            item_id: item.item_id,
            item_type: item.item_type,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price
          }));

          const { error: insertError } = await supabase
            .from('return_items')
            .insert(formattedItems);

          if (insertError) {
            throw insertError;
          }
        }
      }

      return true;
    } catch (error) {
      console.error(`Error updating return ${id}:`, error);
      throw error;
    }
  }

  /**
   * تحديث حالة المرتجع
   */
  public async updateReturnStatus(id: string, status: 'draft' | 'confirmed' | 'cancelled'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('returns')
        .update({ 
          payment_status: status 
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error(`Error updating return status ${id}:`, error);
      throw error;
    }
  }

  /**
   * حذف مرتجع وأصنافه
   */
  public async deleteReturn(id: string): Promise<boolean> {
    try {
      // حذف أصناف المرتجع أولاً
      const { error: itemsError } = await supabase
        .from('return_items')
        .delete()
        .eq('return_id', id);

      if (itemsError) {
        throw itemsError;
      }

      // حذف المرتجع
      const { error } = await supabase
        .from('returns')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error(`Error deleting return ${id}:`, error);
      throw error;
    }
  }

  /**
   * جلب المرتجعات حسب الطرف
   */
  public async fetchReturnsByParty(partyId: string): Promise<Return[]> {
    try {
      let { data: returns, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      if (!returns || returns.length === 0) {
        return [];
      }

      // تنسيق البيانات
      const formattedReturns = returns.map(ret => ({
        ...ret,
        party_name: ret.parties?.name || 'غير محدد',
        return_type: ret.return_type as 'sales_return' | 'purchase_return',
        payment_status: ret.payment_status as 'draft' | 'confirmed' | 'cancelled'
      }));

      return formattedReturns as Return[];
    } catch (error) {
      console.error(`Error fetching returns for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }

  /**
   * جلب المرتجعات حسب الفاتورة
   */
  public async fetchReturnsByInvoice(invoiceId: string): Promise<Return[]> {
    try {
      let { data: returns, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('invoice_id', invoiceId)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      if (!returns || returns.length === 0) {
        return [];
      }

      // تنسيق البيانات
      const formattedReturns = returns.map(ret => ({
        ...ret,
        party_name: ret.parties?.name || 'غير محدد',
        return_type: ret.return_type as 'sales_return' | 'purchase_return',
        payment_status: ret.payment_status as 'draft' | 'confirmed' | 'cancelled'
      }));

      return formattedReturns as Return[];
    } catch (error) {
      console.error(`Error fetching returns for invoice ${invoiceId}:`, error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }
}

export default new ReturnDataService();
