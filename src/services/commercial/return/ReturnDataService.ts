import { supabase } from "@/integrations/supabase/client";
import { Return, ReturnItem } from "@/types/returns";
import { toast } from "sonner";

/**
 * خدمة التعامل مع قاعدة البيانات للمرتجعات
 * تم تحسين الاستعلامات وإضافة تحقق أفضل
 */
export class ReturnDataService {
  /**
   * جلب جميع المرتجعات مع التفاصيل المرتبطة في استعلام واحد
   */
  public async fetchAllReturns(): Promise<Return[]> {
    try {
      // تحسين: جلب المرتجعات وأسماء الأطراف في استعلام واحد
      let { data: returns, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties:party_id (id, name),
          return_items!return_id (*)
        `)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching returns:', error);
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
        payment_status: ret.payment_status as 'draft' | 'confirmed' | 'cancelled',
        items: ret.return_items || []
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
      // تحسين: استعلام متعدد الجداول للحصول على كل البيانات دفعة واحدة
      let { data: returnData, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties:party_id (id, name),
          return_items!return_id (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching return with ID ${id}:`, error);
        throw error;
      }

      if (!returnData) {
        return null;
      }

      // تنسيق البيانات النهائية
      const formattedReturn: Return = {
        ...returnData,
        party_name: returnData.parties?.name || 'غير محدد',
        items: (returnData.return_items || []).map(item => ({
          ...item,
          item_type: item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products"
        })) as ReturnItem[],
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
   * إنشاء مرتجع جديد مع تحسينات التحقق
   */
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      // التحقق من البيانات قبل الإنشاء وإظهار رسالة خطأ محددة
      if (!this.validateReturnData(returnData)) {
        console.error("Validation failed for return data:", returnData);
        toast.error("فشل التحقق من البيانات، يرجى التأكد من إدخال جميع البيانات المطلوبة");
        return null;
      }

      console.log("Creating return with data:", {
        return_type: returnData.return_type,
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        date: returnData.date,
        amount: returnData.amount
      });

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
        if (error.code === '23503') {
          toast.error("فشل إنشاء المرتجع: رقم الفاتورة أو العميل/المورد غير صحيح");
        } else if (error.code === '23502') {
          toast.error("فشل إنشاء المرتجع: بعض البيانات المطلوبة مفقودة");
        } else {
          toast.error(`فشل إنشاء المرتجع: ${error.message || 'خطأ في قاعدة البيانات'}`);
        }
        return null;
      }

      if (!newReturn) {
        console.error("No return data received after insert");
        toast.error("فشل إنشاء المرتجع: لم يتم استلام بيانات من قاعدة البيانات");
        return null;
      }

      // إضافة أصناف المرتجع
      if (returnData.items && returnData.items.length > 0) {
        const selectedItems = returnData.items.filter(item => item.quantity > 0);
        
        if (selectedItems.length === 0) {
          console.error("No items selected with quantity > 0");
          toast.error("لا يوجد أصناف محددة للمرتجع بكمية صالحة");
          // حذف المرتجع الذي تم إنشاؤه حيث لا توجد أصناف
          await this.deleteReturn(newReturn.id);
          return null;
        }
        
        const formattedItems = selectedItems.map(item => ({
          return_id: newReturn.id,
          item_id: item.item_id,
          item_type: item.item_type,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price
          // حذف حقل total لأنه يتم حسابه تلقائيًا في قاعدة البيانات
        }));

        console.log("Inserting return items:", formattedItems.length);

        const { error: itemsError } = await supabase
          .from('return_items')
          .insert(formattedItems);

        if (itemsError) {
          console.error("Error inserting return items:", itemsError);
          // إذا فشل إدخال الأصناف، نحذف المرتجع الذي تم إنشاؤه
          await this.deleteReturn(newReturn.id);
          if (itemsError.code === '23503') {
            toast.error("فشل إنشاء المرتجع: بعض أرقام الأصناف غير صحيحة");
          } else {
            toast.error(`فشل إنشاء المرتجع: خطأ في الأصناف - ${itemsError.message || 'خطأ في قاعدة البيانات'}`);
          }
          return null;
        }
      }

      // سجل العملية في سجل الأحداث
      await this.logReturnAction(newReturn.id, "create", returnData.return_type);
      
      toast.success("تم إنشاء المرتجع بنجاح");
      
      // Return the created return with proper type casting
      return {
        ...newReturn,
        return_type: newReturn.return_type as 'sales_return' | 'purchase_return',
        payment_status: newReturn.payment_status as 'draft' | 'confirmed' | 'cancelled',
        party_name: returnData.party_name,
        items: returnData.items?.filter(item => item.quantity > 0)
      } as Return;
    } catch (error: any) {
      console.error('Error creating return:', error);
      toast.error(`حدث خطأ أثناء إنشاء المرتجع: ${error.message || 'خطأ غير معروف'}`);
      return null;
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
            unit_price: item.unit_price
            // حذف حقل total لأنه يتم حسابه تلقائيًا في قاعدة البيانات
          }));

          const { error: insertError } = await supabase
            .from('return_items')
            .insert(formattedItems);

          if (insertError) {
            throw insertError;
          }
        }
      }

      // سجل العملية في سجل الأحداث
      await this.logReturnAction(id, "update", returnData.return_type);

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

      // سجل العملية في سجل الأحداث
      await this.logReturnAction(id, `status_change_to_${status}`);

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

      // سجل العملية في سجل الأحداث
      await this.logReturnAction(id, "delete");

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
   * التحقق من بيانات المرتجع
   * @private
   */
  private validateReturnData(returnData: Omit<Return, 'id' | 'created_at'>): boolean {
    // التحقق من وجود البيانات الأساسية
    if (!returnData.return_type || !returnData.date) {
      console.error("Missing required return data:", { returnData });
      toast.error("بيانات المرتجع غير مكتملة");
      return false;
    }

    // التحقق من الأصناف
    if (!returnData.items || returnData.items.length === 0) {
      console.error("No items in return data");
      toast.error("يجب إضافة صنف واحد على الأقل للمرتجع");
      return false;
    }

    // التحقق من وجود أصناف بكميات صالحة
    const hasValidItems = returnData.items.some(item => 
      item.quantity > 0 && item.item_id && item.item_type
    );

    if (!hasValidItems) {
      console.error("No valid items with quantity > 0");
      toast.error("يجب اختيار صنف واحد على الأقل وتحديد كمية صالحة له");
      return false;
    }

    return true;
  }

  /**
   * تسجيل عمليات المرتجعات في سجل الأحداث
   * @private
   */
  private async logReturnAction(
    returnId: string, 
    action: string, 
    returnType?: string
  ): Promise<void> {
    try {
      // يمكن إضافة سجل للعمليات في جدول منفصل
      // حسب متطلبات النظام، هذا مثال فقط
      console.log(`Audit log: Return ${returnId} action: ${action}, type: ${returnType || 'unknown'}`);

      // يمكن إضافة تنفيذ فعلي لتسجيل العمليات هنا
      // await supabase.from('audit_log').insert({...});
    } catch (error) {
      console.error("Error logging return action:", error);
      // نستمر بالعمل حتى لو فشل تسجيل العملية
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
          parties:party_id (id, name),
          return_items!return_id (*)
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
        items: ret.return_items || [],
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
          parties:party_id (id, name),
          return_items!return_id (*)
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
        items: ret.return_items || [],
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
