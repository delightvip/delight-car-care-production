
import { Return, ReturnItem } from "@/types/returns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PartyService from "@/services/PartyService";
import { ReturnProcessingService } from "./ReturnProcessingService";
import ProfitService from "../profit/ProfitService";

/**
 * خدمة المرتجعات الرئيسية
 * تعالج كافة عمليات المرتجعات والتفاعل مع المخزون والحسابات
 */
export class ReturnService {
  private static instance: ReturnService;
  private partyService: PartyService;
  private returnProcessor: ReturnProcessingService;
  private profitService: ProfitService;

  private constructor() {
    this.partyService = PartyService.getInstance();
    this.returnProcessor = new ReturnProcessingService();
    this.profitService = ProfitService.getInstance();
  }

  /**
   * الحصول على مثيل من الخدمة (نمط Singleton)
   */
  public static getInstance(): ReturnService {
    if (!ReturnService.instance) {
      ReturnService.instance = new ReturnService();
    }
    return ReturnService.instance;
  }

  /**
   * استرجاع جميع المرتجعات
   */
  public async getReturns(): Promise<Return[]> {
    try {
      // 1. جلب بيانات المرتجعات الأساسية
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          parties (name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      // 2. تحويل البيانات إلى النوع المطلوب
      return data.map(returnItem => ({
        id: returnItem.id,
        return_type: returnItem.return_type as 'sales_return' | 'purchase_return',
        invoice_id: returnItem.invoice_id,
        party_id: returnItem.party_id,
        party_name: returnItem.parties?.name,
        date: returnItem.date,
        amount: returnItem.amount,
        payment_status: returnItem.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: returnItem.notes,
        created_at: returnItem.created_at
      }));
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('حدث خطأ أثناء جلب المرتجعات');
      return [];
    }
  }

  /**
   * استرجاع مرتجع محدد بواسطة الرقم المعرف
   */
  public async getReturnById(id: string): Promise<Return | null> {
    try {
      // 1. جلب بيانات المرتجع
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', id)
        .single();

      if (returnError) throw returnError;

      // 2. جلب عناصر المرتجع
      const { data: items, error: itemsError } = await supabase
        .from('return_items')
        .select('*')
        .eq('return_id', id);

      if (itemsError) throw itemsError;

      // 3. إنشاء كائن المرتجع كامل
      return {
        id: returnData.id,
        return_type: returnData.return_type as 'sales_return' | 'purchase_return',
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        party_name: returnData.parties?.name,
        date: returnData.date,
        amount: returnData.amount,
        payment_status: returnData.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: returnData.notes,
        created_at: returnData.created_at,
        items: items ? items.map(item => ({
          id: item.id,
          return_id: item.return_id,
          item_id: item.item_id,
          item_type: item.item_type as "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          created_at: item.created_at
        })) : []
      };
    } catch (error) {
      console.error(`Error fetching return with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات المرتجع');
      return null;
    }
  }

  /**
   * إنشاء مرتجع جديد
   */
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    try {
      console.log('Creating return with data:', returnData);

      // 1. التحقق من البيانات
      if (!returnData.items || returnData.items.length === 0) {
        toast.error('لا يمكن إنشاء مرتجع بدون أصناف');
        return null;
      }

      // 2. حساب إجمالي المبلغ
      let totalAmount = 0;
      for (const item of returnData.items) {
        totalAmount += (item.quantity * item.unit_price);
      }

      // 3. إنشاء سجل المرتجع
      const { data: returnRecord, error } = await supabase
        .from('returns')
        .insert({
          return_type: returnData.return_type,
          invoice_id: returnData.invoice_id,
          party_id: returnData.party_id,
          date: returnData.date,
          amount: totalAmount,
          payment_status: 'draft' as 'draft' | 'confirmed' | 'cancelled',
          notes: returnData.notes
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating return record:', error);
        throw error;
      }

      console.log('Return created successfully:', returnRecord);

      // 4. إضافة أصناف المرتجع
      if (returnData.items && returnData.items.length > 0) {
        console.log('Adding return items:', returnData.items);

        // Important: Do not include total field as it's a computed column
        const returnItems = returnData.items.map(item => ({
          return_id: returnRecord.id,
          item_id: item.item_id,
          item_type: item.item_type,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price
          // Don't include total as it's computed in the database
        }));

        const { error: itemsError } = await supabase
          .from('return_items')
          .insert(returnItems);

        if (itemsError) {
          console.error('Error adding return items:', itemsError);
          throw itemsError;
        }

        console.log('Return items added successfully');
      }

      // 5. الحصول على بيانات الطرف للاستجابة
      const party = await this.partyService.getPartyById(returnData.party_id || '');
      console.log('Party details:', party);

      toast.success('تم إنشاء المرتجع بنجاح');

      return {
        id: returnRecord.id,
        return_type: returnData.return_type,
        invoice_id: returnData.invoice_id,
        party_id: returnData.party_id,
        party_name: party?.name,
        date: returnData.date as string,
        amount: totalAmount,
        payment_status: 'draft',
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

  /**
   * تأكيد المرتجع (تطبيق التغييرات على المخزون والحسابات)
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    try {
      // 1. جلب بيانات المرتجع
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }

      // 2. استخدام معالج المرتجعات لتأكيد المرتجع
      const success = await this.returnProcessor.confirmReturn(returnId);
      
      if (success && returnData.return_type === 'sales_return') {
        try {
          // 3. تحديث بيانات الربح للفاتورة المرتبطة (لمرتجعات المبيعات فقط)
          if (returnData.invoice_id) {
            console.log('Updating profit data for invoice:', returnData.invoice_id);
            await this.profitService.updateProfitForReturn(
              returnData.invoice_id,
              returnData.items || [],
              returnData.amount
            );
          }
          
          // 4. تحديث حساب العميل
          if (returnData.party_id) {
            console.log('Updating customer balance for return:', returnId);
            await this.partyService.updatePartyBalance(
              returnData.party_id,
              returnData.amount,
              false, // دائن لمرتجعات المبيعات (تقليل دين العميل)
              'مرتجع مبيعات',
              'sales_return',
              returnId
            );
          }
        } catch (err) {
          console.error('Error updating financial records:', err);
          // لا نريد إلغاء العملية بأكملها إذا فشل تحديث السجلات المالية
          toast.warning('تم تأكيد المرتجع لكن قد تكون هناك مشكلة في تحديث السجلات المالية');
        }
      } else if (success && returnData.return_type === 'purchase_return' && returnData.party_id) {
        try {
          // 5. تحديث حساب المورد لمرتجعات المشتريات
          console.log('Updating supplier balance for return:', returnId);
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            true, // مدين لمرتجعات المشتريات (زيادة دين المورد)
            'مرتجع مشتريات',
            'purchase_return',
            returnId
          );
        } catch (err) {
          console.error('Error updating supplier balance:', err);
          toast.warning('تم تأكيد المرتجع لكن قد تكون هناك مشكلة في تحديث حساب المورد');
        }
      }
      
      return success;
    } catch (error) {
      console.error(`Error confirming return ${returnId}:`, error);
      toast.error('حدث خطأ أثناء تأكيد المرتجع');
      return false;
    }
  }

  /**
   * إلغاء المرتجع
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    try {
      // 1. جلب بيانات المرتجع
      const returnData = await this.getReturnById(returnId);
      if (!returnData) {
        toast.error('لم يتم العثور على المرتجع');
        return false;
      }

      // 2. استخدام معالج المرتجعات لإلغاء المرتجع
      const success = await this.returnProcessor.cancelReturn(returnId);
      
      if (success && returnData.return_type === 'sales_return') {
        try {
          // 3. استعادة بيانات الربح للفاتورة المرتبطة (لمرتجعات المبيعات فقط)
          if (returnData.invoice_id) {
            console.log('Restoring profit data for invoice after return cancellation:', returnData.invoice_id);
            await this.profitService.restoreProfitAfterReturnCancellation(
              returnData.invoice_id,
              returnData.items || [],
              returnData.amount
            );
          }
          
          // 4. تحديث حساب العميل (عكس التغيير السابق)
          if (returnData.party_id) {
            console.log('Updating customer balance after return cancellation:', returnId);
            await this.partyService.updatePartyBalance(
              returnData.party_id,
              returnData.amount,
              true, // مدين لإلغاء مرتجعات المبيعات (استعادة دين العميل)
              'إلغاء مرتجع مبيعات',
              'cancel_sales_return',
              returnId
            );
          }
        } catch (err) {
          console.error('Error updating financial records after cancellation:', err);
          toast.warning('تم إلغاء المرتجع لكن قد تكون هناك مشكلة في تحديث السجلات المالية');
        }
      } else if (success && returnData.return_type === 'purchase_return' && returnData.party_id) {
        try {
          // 5. تحديث حساب المورد لإلغاء مرتجعات المشتريات (عكس التغيير السابق)
          console.log('Updating supplier balance after return cancellation:', returnId);
          await this.partyService.updatePartyBalance(
            returnData.party_id,
            returnData.amount,
            false, // دائن لإلغاء مرتجعات المشتريات (استعادة دين المورد)
            'إلغاء مرتجع مشتريات',
            'cancel_purchase_return',
            returnId
          );
        } catch (err) {
          console.error('Error updating supplier balance after cancellation:', err);
          toast.warning('تم إلغاء المرتجع لكن قد تكون هناك مشكلة في تحديث حساب المورد');
        }
      }
      
      return success;
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
      // 1. التحقق من حالة المرتجع قبل الحذف
      const { data, error: checkError } = await supabase
        .from('returns')
        .select('payment_status')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;

      if (data.payment_status === 'confirmed') {
        toast.error('لا يمكن حذف مرتجع مؤكد، يجب إلغاؤه أولاً');
        return false;
      }

      // 2. حذف عناصر المرتجع أولاً
      const { error: itemsError } = await supabase
        .from('return_items')
        .delete()
        .eq('return_id', id);

      if (itemsError) throw itemsError;

      // 3. حذف المرتجع
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

  /**
   * تحديث بيانات المرتجع
   */
  public async updateReturn(id: string, returnData: Partial<Return>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('returns')
        .update(returnData)
        .eq('id', id);

      if (error) throw error;

      toast.success('تم تحديث بيانات المرتجع بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating return:', error);
      toast.error('حدث خطأ أثناء تحديث بيانات المرتجع');
      return false;
    }
  }
}

export default ReturnService;
