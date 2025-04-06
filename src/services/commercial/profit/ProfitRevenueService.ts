import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BaseCommercialService from '../BaseCommercialService';
import { ProfitData } from './ProfitTypes';

/**
 * خدمة الربط بين الأرباح والإيرادات
 * تتولى هذه الخدمة مسؤولية إنشاء وتحديث وإلغاء سجلات الإيرادات المرتبطة بالأرباح
 */
class ProfitRevenueService extends BaseCommercialService {
  private static instance: ProfitRevenueService;
  
  private constructor() {
    super();
  }
  
  public static getInstance(): ProfitRevenueService {
    if (!ProfitRevenueService.instance) {
      ProfitRevenueService.instance = new ProfitRevenueService();
    }
    return ProfitRevenueService.instance;
  }
  
  /**
   * إنشاء إيراد مرتبط بربح محقق
   * @param profitData بيانات الربح المحقق
   * @returns نجاح العملية
   */
  public async createRevenueFromProfit(profitData: ProfitData): Promise<boolean> {
    try {
      // البحث عن الفئة المناسبة للإيراد (أرباح المبيعات)
      const { data: categories, error: categoriesError } = await this.supabase
        .from('financial_categories')
        .select('id')
        .eq('type', 'income')
        .ilike('name', '%أرباح%')
        .limit(1);
      
      if (categoriesError) {
        throw categoriesError;
      }
      
      // إذا لم نجد فئة مناسبة، نستخدم الفئة الافتراضية للإيرادات
      let categoryId: string;
      if (!categories || categories.length === 0) {
        const { data: defaultCategories, error: defaultError } = await this.supabase
          .from('financial_categories')
          .select('id')
          .eq('type', 'income')
          .limit(1);
          
        if (defaultError || !defaultCategories || defaultCategories.length === 0) {
          console.error("No suitable income category found");
          return false;
        }
        
        categoryId = defaultCategories[0].id;
      } else {
        categoryId = categories[0].id;
      }
      
      // فحص إذا كان هناك إيراد مسجل بالفعل لهذا الربح
      const { data: existingRevenue, error: checkError } = await this.supabase
        .from('financial_transactions')
        .select('id')
        .eq('reference_id', profitData.id)
        .eq('reference_type', 'profit')
        .limit(1);
        
      if (checkError) {
        throw checkError;
      }
      
      // إذا كان هناك إيراد مسجل بالفعل، نتخطى هذه الخطوة
      if (existingRevenue && existingRevenue.length > 0) {
        console.log('Revenue already exists for profit:', profitData.id);
        this.notifyFinancialDataChange('profit_revenue_already_exists');
        return true;
      }
      
      // إنشاء سجل الإيراد
      const { data: transaction, error: transactionError } = await this.supabase
        .from('financial_transactions')
        .insert({
          type: 'income',
          amount: profitData.profit_amount,
          category_id: categoryId,
          date: profitData.invoice_date,
          payment_method: 'other',
          notes: `أرباح من فاتورة مبيعات - ${profitData.invoice_id}`,
          reference_id: profitData.id,
          reference_type: 'profit'
        })
        .select()
        .single();
      
      if (transactionError) {
        throw transactionError;
      }
      
      // إرسال إشعار بتغيير البيانات المالية
      this.notifyFinancialDataChange('profit_revenue_created');
      
      console.log('Revenue transaction created successfully for profit:', profitData.id);
      return true;
    } catch (error) {
      console.error('Error creating revenue from profit:', error);
      toast.error('حدث خطأ أثناء تسجيل الإيراد من الربح');
      return false;
    }
  }
  
  /**
   * إلغاء الإيراد المرتبط بربح عند إلغاء أو حذف فاتورة البيع
   * @param profitId معرف سجل الربح
   * @returns نجاح العملية
   */
  public async cancelProfitRevenue(profitId: string): Promise<boolean> {
    try {
      // البحث عن سجل الإيراد المرتبط بالربح
      const { data: transactions, error: findError } = await this.supabase
        .from('financial_transactions')
        .select('*')
        .eq('reference_id', profitId)
        .eq('reference_type', 'profit');
      
      if (findError) {
        throw findError;
      }
      
      // إذا لم نجد سجلات مرتبطة، نعتبر العملية ناجحة
      if (!transactions || transactions.length === 0) {
        console.log('No revenue transactions found for profit:', profitId);
        return true;
      }
      
      // إنشاء معاملة عكسية لكل معاملة مرتبطة
      for (const transaction of transactions) {
        const { error: reverseError } = await this.supabase
          .from('financial_transactions')
          .insert({
            type: 'expense', // عكس نوع المعاملة (من إيراد إلى مصروف)
            amount: transaction.amount,
            category_id: transaction.category_id,
            date: new Date().toISOString().split('T')[0],
            payment_method: transaction.payment_method,
            notes: `إلغاء إيراد من ربح - ${profitId}`,
            reference_id: profitId,
            reference_type: 'profit_cancellation'
          });
        
        if (reverseError) {
          throw reverseError;
        }
      }
      
      // حذف المعاملات الأصلية
      const { error: deleteError } = await this.supabase
        .from('financial_transactions')
        .delete()
        .eq('reference_id', profitId)
        .eq('reference_type', 'profit');
      
      if (deleteError) {
        console.error('Error deleting original revenue transactions:', deleteError);
        // نستمر في التنفيذ حتى لو فشل الحذف، لأن المعاملات العكسية تم إنشاؤها بنجاح
      }
      
      // إرسال إشعار بتغيير البيانات المالية
      this.notifyFinancialDataChange('profit_revenue_cancelled');
      
      console.log('Profit revenue cancelled successfully for profit:', profitId);
      return true;
    } catch (error) {
      console.error('Error cancelling profit revenue:', error);
      toast.error('حدث خطأ أثناء إلغاء الإيراد من الربح');
      return false;
    }
  }
  
  /**
   * تحديث الإيراد المرتبط بربح عند تعديل فاتورة البيع
   * @param oldProfitId معرف سجل الربح القديم
   * @param newProfitData بيانات الربح الجديدة
   * @returns نجاح العملية
   */
  public async updateProfitRevenue(oldProfitId: string, newProfitData: ProfitData): Promise<boolean> {
    try {
      // إلغاء الإيراد القديم
      await this.cancelProfitRevenue(oldProfitId);
      
      // إنشاء إيراد جديد
      const result = await this.createRevenueFromProfit(newProfitData);
      
      if (result) {
        // إرسال إشعار بتغيير البيانات المالية
        this.notifyFinancialDataChange('profit_revenue_updated');
      }
      
      return result;
    } catch (error) {
      console.error('Error updating profit revenue:', error);
      toast.error('حدث خطأ أثناء تحديث الإيراد من الربح');
      return false;
    }
  }
  
  /**
   * التحقق من وجود إيرادات مرتبطة بربح معين
   * @param profitId معرف سجل الربح
   * @returns وجود إيرادات مرتبطة
   */
  public async hasProfitRevenue(profitId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('financial_transactions')
        .select('id')
        .eq('reference_id', profitId)
        .eq('reference_type', 'profit')
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking profit revenue:', error);
      return false;
    }
  }
  
  /**
   * إرسال إشعار بتغيير البيانات المالية
   * @param source مصدر التغيير
   */
  private notifyFinancialDataChange(source: string): void {
    try {
      const event = new CustomEvent('financial-data-change', { 
        detail: { source: source }
      });
      window.dispatchEvent(event);
      console.log(`تم إرسال إشعار بتغيير البيانات المالية من مصدر: ${source}`);
    } catch (error) {
      console.error('خطأ في إرسال إشعار بتغيير البيانات المالية:', error);
    }
  }
}

export default ProfitRevenueService;
