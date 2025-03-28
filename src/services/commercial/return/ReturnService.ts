
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Return, ReturnItem } from "@/types/returns";
import { format } from "date-fns";
import FinancialCommercialBridge from "@/services/financial/FinancialCommercialBridge";
import InventoryService from "@/services/InventoryService";

/**
 * خدمة إدارة المرتجعات
 * تتيح عمليات الإنشاء والتعديل والحذف للمرتجعات مع المحافظة على تحديث المخزون والدفاتر المالية
 */
class ReturnService {
  private static instance: ReturnService;
  private financialBridge: FinancialCommercialBridge;
  private inventoryService: InventoryService;

  private constructor() {
    this.financialBridge = FinancialCommercialBridge.getInstance();
    this.inventoryService = InventoryService.getInstance();
  }

  public static getInstance(): ReturnService {
    if (!ReturnService.instance) {
      ReturnService.instance = new ReturnService();
    }
    return ReturnService.instance;
  }

  /**
   * جلب جميع المرتجعات
   */
  public async getReturns(): Promise<Return[]> {
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

      // تنسيق البيانات
      const formattedReturns = returns?.map(ret => ({
        ...ret,
        party_name: ret.parties?.name || 'غير محدد',
        // Ensure return_type is properly cast to the expected union type
        return_type: ret.return_type as 'sales_return' | 'purchase_return',
        // Ensure payment_status is properly cast to the expected union type
        payment_status: ret.payment_status as 'draft' | 'confirmed' | 'cancelled'
      })) || [];

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
  public async getReturnById(id: string): Promise<Return | null> {
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
      // التأكد من تنسيق التاريخ بشكل صحيح
      const formattedDate = typeof returnData.date === 'object' 
        ? format(new Date(returnData.date as any), 'yyyy-MM-dd')
        : returnData.date;

      // إنشاء المرتجع في قاعدة البيانات
      const { data: newReturn, error } = await supabase
        .from('returns')
        .insert({
          return_type: returnData.return_type,
          invoice_id: returnData.invoice_id,
          party_id: returnData.party_id,
          date: formattedDate,
          amount: returnData.amount,
          payment_status: 'draft',
          notes: returnData.notes
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // إضافة أصناف المرتجع
      if (returnData.items && returnData.items.length > 0) {
        const selectedItems = returnData.items.filter(item => item.quantity > 0);
        
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

      toast.success('تم إنشاء المرتجع بنجاح');
      
      // Return the created return with proper type casting
      return {
        ...newReturn,
        return_type: newReturn.return_type as 'sales_return' | 'purchase_return',
        payment_status: newReturn.payment_status as 'draft' | 'confirmed' | 'cancelled',
        party_name: returnData.party_name
      } as Return;
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error('حدث خطأ أثناء إنشاء المرتجع');
      return null;
    }
  }

  /**
   * تحديث مرتجع موجود
   */
  public async updateReturn(id: string, returnData: Partial<Return>): Promise<boolean> {
    try {
      // التأكد من تنسيق التاريخ
      let updateData: any = { ...returnData };
      
      if (returnData.date) {
        updateData.date = typeof returnData.date === 'object' 
          ? format(new Date(returnData.date as any), 'yyyy-MM-dd')
          : returnData.date;
      }

      // تحديث بيانات المرتجع
      const { error } = await supabase
        .from('returns')
        .update(updateData)
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

      toast.success('تم تحديث المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error(`Error updating return ${id}:`, error);
      toast.error('حدث خطأ أثناء تحديث المرتجع');
      return false;
    }
  }

  /**
   * تأكيد مرتجع (تحديث المخزون والحسابات)
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      // 1. جلب بيانات المرتجع كاملة
      const returnData = await this.getReturnById(returnId);
      
      if (!returnData || !returnData.items || returnData.items.length === 0) {
        toast.error('لا توجد بيانات كافية لتأكيد المرتجع');
        return false;
      }

      // 2. تحديث حالة المرتجع إلى مؤكد
      const { error: updateError } = await supabase
        .from('returns')
        .update({ payment_status: 'confirmed' })
        .eq('id', returnId);

      if (updateError) {
        throw updateError;
      }

      // 3. تحديث المخزون بناءً على نوع المرتجع
      for (const item of returnData.items) {
        if (returnData.return_type === 'sales_return') {
          // مرتجع مبيعات: إضافة الكميات للمخزون (العميل أعاد البضاعة)
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        } else {
          // مرتجع مشتريات: خصم الكميات من المخزون (إعادة بضاعة للمورد)
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
      }

      // 4. تسجيل المعاملة المالية المقابلة
      const financialType = returnData.return_type === 'sales_return' ? 'expense' : 'income';
      const invoiceOrParty = returnData.invoice_id || '';
      const partyName = returnData.party_name || '';
      const note = returnData.return_type === 'sales_return' 
        ? `مرتجع مبيعات من ${partyName}` 
        : `مرتجع مشتريات إلى ${partyName}`;

      // استخدام جسر الربط المالي
      await this.financialBridge.handleReturnConfirmation({
        id: returnId,
        return_type: returnData.return_type,
        amount: returnData.amount,
        date: returnData.date,
        party_id: returnData.party_id,
        party_name: returnData.party_name,
        invoice_id: returnData.invoice_id,
        notes: note
      });

      toast.success('تم تأكيد المرتجع وتحديث المخزون والحسابات');
      return true;
    } catch (error) {
      console.error(`Error confirming return ${returnId}:`, error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }

  /**
   * إلغاء مرتجع (عكس تأثيره على المخزون والحسابات)
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      // 1. جلب بيانات المرتجع كاملة
      const returnData = await this.getReturnById(returnId);
      
      if (!returnData) {
        toast.error('لا توجد بيانات كافية لإلغاء المرتجع');
        return false;
      }

      // 2. التحقق من أن المرتجع مؤكد وليس ملغي بالفعل
      if (returnData.payment_status !== 'confirmed') {
        toast.error('لا يمكن إلغاء مرتجع غير مؤكد');
        return false;
      }

      // 3. تحديث حالة المرتجع إلى ملغي
      const { error: updateError } = await supabase
        .from('returns')
        .update({ payment_status: 'cancelled' })
        .eq('id', returnId);

      if (updateError) {
        throw updateError;
      }

      // 4. عكس تأثير المرتجع على المخزون
      if (returnData.items && returnData.items.length > 0) {
        for (const item of returnData.items) {
          if (returnData.return_type === 'sales_return') {
            // إلغاء مرتجع مبيعات: خصم الكميات من المخزون (عكس الإضافة السابقة)
            switch (item.item_type) {
              case 'raw_materials':
                await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
                break;
              case 'packaging_materials':
                await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
                break;
              case 'semi_finished_products':
                await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
                break;
              case 'finished_products':
                await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
                break;
            }
          } else {
            // إلغاء مرتجع مشتريات: إضافة الكميات للمخزون (عكس الخصم السابق)
            switch (item.item_type) {
              case 'raw_materials':
                await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
                break;
              case 'packaging_materials':
                await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
                break;
              case 'semi_finished_products':
                await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
                break;
              case 'finished_products':
                await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
                break;
            }
          }
        }
      }

      // 5. عكس المعاملة المالية
      await this.financialBridge.handleReturnCancellation({
        id: returnId,
        return_type: returnData.return_type,
        amount: returnData.amount,
        date: returnData.date,
        party_id: returnData.party_id,
        party_name: returnData.party_name
      });

      toast.success('تم إلغاء المرتجع وعكس تأثيره على المخزون والحسابات');
      return true;
    } catch (error) {
      console.error(`Error cancelling return ${returnId}:`, error);
      toast.error('حدث خطأ أثناء إلغاء المرتجع');
      return false;
    }
  }

  /**
   * حذف مرتجع
   */
  public async deleteReturn(id: string): Promise<boolean> {
    try {
      // 1. التحقق من حالة المرتجع
      const { data: returnData, error: checkError } = await supabase
        .from('returns')
        .select('payment_status')
        .eq('id', id)
        .single();

      if (checkError) {
        throw checkError;
      }

      // 2. لا يمكن حذف مرتجع مؤكد، يجب إلغاؤه أولاً
      if (returnData.payment_status === 'confirmed') {
        toast.error('لا يمكن حذف مرتجع مؤكد. يرجى إلغائه أولاً ثم حذفه');
        return false;
      }

      // 3. حذف أصناف المرتجع أولاً
      const { error: itemsError } = await supabase
        .from('return_items')
        .delete()
        .eq('return_id', id);

      if (itemsError) {
        throw itemsError;
      }

      // 4. حذف المرتجع نفسه
      const { error: deleteError } = await supabase
        .from('returns')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      toast.success('تم حذف المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error(`Error deleting return ${id}:`, error);
      toast.error('حدث خطأ أثناء حذف المرتجع');
      return false;
    }
  }

  /**
   * جلب المرتجعات حسب الطرف
   */
  public async getReturnsByParty(partyId: string): Promise<Return[]> {
    try {
      // استعلام جلب المرتجعات حسب الطرف المحدد
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

      // تنسيق البيانات
      const formattedReturns = returns?.map(ret => ({
        ...ret,
        party_name: ret.parties?.name || 'غير محدد',
        return_type: ret.return_type as 'sales_return' | 'purchase_return',
        payment_status: ret.payment_status as 'draft' | 'confirmed' | 'cancelled'
      })) || [];

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
  public async getReturnsByInvoice(invoiceId: string): Promise<Return[]> {
    try {
      // استعلام جلب المرتجعات حسب الفاتورة المحددة
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

      // تنسيق البيانات
      const formattedReturns = returns?.map(ret => ({
        ...ret,
        party_name: ret.parties?.name || 'غير محدد',
        return_type: ret.return_type as 'sales_return' | 'purchase_return',
        payment_status: ret.payment_status as 'draft' | 'confirmed' | 'cancelled'
      })) || [];

      return formattedReturns as Return[];
    } catch (error) {
      console.error(`Error fetching returns for invoice ${invoiceId}:`, error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }
}

export default ReturnService;
