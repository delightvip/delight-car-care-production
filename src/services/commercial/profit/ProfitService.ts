
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BaseCommercialService from '../BaseCommercialService';
import ProfitCalculationService from './ProfitCalculationService';
import { ProfitData } from './ProfitTypes';

/**
 * خدمة الأرباح
 * مسؤولة عن حساب وإدارة بيانات الأرباح للمبيعات
 */
class ProfitService extends BaseCommercialService {
  private static instance: ProfitService;
  private profitCalculationService: ProfitCalculationService;
  
  private constructor() {
    super();
    this.profitCalculationService = ProfitCalculationService.getInstance();
  }
  
  public static getInstance(): ProfitService {
    if (!ProfitService.instance) {
      ProfitService.instance = new ProfitService();
    }
    return ProfitService.instance;
  }
  
  /**
   * حساب وحفظ ربح فاتورة مبيعات
   * @param invoiceId معرف الفاتورة
   */
  public async calculateInvoiceProfit(invoiceId: string): Promise<ProfitData | null> {
    try {
      return await this.profitCalculationService.calculateAndSaveProfit(invoiceId);
    } catch (error) {
      console.error('Error in calculateInvoiceProfit:', error);
      toast.error('حدث خطأ أثناء حساب ربح الفاتورة');
      return null;
    }
  }
  
  /**
   * حذف بيانات الربح المرتبطة بفاتورة
   * @param invoiceId معرف الفاتورة
   */
  public async removeProfitData(invoiceId: string): Promise<boolean> {
    try {
      return await this.profitCalculationService.deleteProfitByInvoiceId(invoiceId);
    } catch (error) {
      console.error('Error in removeProfitData:', error);
      toast.error('حدث خطأ أثناء حذف بيانات الربح');
      return false;
    }
  }
  
  /**
   * تحديث بيانات الربح عند عملية الإرجاع
   * يتم استدعاؤها عند تأكيد مرتجع مبيعات لخصم الربح المتعلق بالمنتجات المرتجعة
   * @param invoiceId معرف الفاتورة الأصلية
   * @param returnItems بنود المرتجع
   * @param totalReturnAmount إجمالي مبلغ المرتجع
   */
  public async updateProfitForReturn(
    invoiceId: string, 
    returnItems: any[], 
    totalReturnAmount: number
  ): Promise<boolean> {
    try {
      // 1. التحقق من وجود بيانات ربح للفاتورة
      const profitData = await this.profitCalculationService.getProfitByInvoiceId(invoiceId);
      
      if (!profitData) {
        console.log(`لا توجد بيانات ربح للفاتورة رقم ${invoiceId}`);
        return false;
      }
      
      console.log('بيانات الربح الحالية:', profitData);
      
      // 2. حساب متوسط نسبة الربح للفاتورة
      const profitPercentage = profitData.profit_percentage;
      
      // 3. حساب قيمة الربح التي سيتم خصمها (باستخدام نفس نسبة الربح)
      const profitAmountToDeduct = (totalReturnAmount * profitPercentage) / 100;
      
      console.log(`قيمة الربح التي سيتم خصمها: ${profitAmountToDeduct}`);
      
      // 4. تحديث بيانات الربح
      const newTotalSales = profitData.total_sales - totalReturnAmount;
      const newProfitAmount = profitData.profit_amount - profitAmountToDeduct;
      // نسبة الربح تظل كما هي لأننا نخصم بنفس النسبة
      
      // 5. حفظ البيانات المحدثة
      const { error } = await this.supabase
        .from('profits')
        .update({
          total_sales: newTotalSales,
          profit_amount: newProfitAmount
        })
        .eq('id', profitData.id);
      
      if (error) throw error;
      
      console.log('تم تحديث بيانات الربح بنجاح بعد المرتجع');
      return true;
    } catch (error) {
      console.error('Error updating profit for return:', error);
      toast.error('حدث خطأ أثناء تحديث بيانات الربح للمرتجع');
      return false;
    }
  }
  
  /**
   * استرجاع بيانات الربح عند إلغاء عملية الإرجاع
   * يتم استدعاؤها عند إلغاء مرتجع مبيعات لإعادة الربح المتعلق بالمنتجات إلى قيمته الأصلية
   * @param invoiceId معرف الفاتورة الأصلية
   * @param returnItems بنود المرتجع
   * @param totalReturnAmount إجمالي مبلغ المرتجع
   */
  public async restoreProfitAfterReturnCancellation(
    invoiceId: string, 
    returnItems: any[], 
    totalReturnAmount: number
  ): Promise<boolean> {
    try {
      // 1. التحقق من وجود بيانات ربح للفاتورة
      const profitData = await this.profitCalculationService.getProfitByInvoiceId(invoiceId);
      
      if (!profitData) {
        console.log(`لا توجد بيانات ربح للفاتورة رقم ${invoiceId}`);
        return false;
      }
      
      console.log('بيانات الربح الحالية قبل إلغاء المرتجع:', profitData);
      
      // 2. استخدام نفس نسبة الربح لحساب الربح الذي سيتم إعادته
      const profitPercentage = profitData.profit_percentage;
      const profitAmountToRestore = (totalReturnAmount * profitPercentage) / 100;
      
      console.log(`قيمة الربح التي سيتم إعادتها: ${profitAmountToRestore}`);
      
      // 3. تحديث بيانات الربح
      const newTotalSales = profitData.total_sales + totalReturnAmount;
      const newProfitAmount = profitData.profit_amount + profitAmountToRestore;
      
      // 4. حفظ البيانات المحدثة
      const { error } = await this.supabase
        .from('profits')
        .update({
          total_sales: newTotalSales,
          profit_amount: newProfitAmount
        })
        .eq('id', profitData.id);
      
      if (error) throw error;
      
      console.log('تم استرجاع بيانات الربح بنجاح بعد إلغاء المرتجع');
      return true;
    } catch (error) {
      console.error('Error restoring profit after return cancellation:', error);
      toast.error('حدث خطأ أثناء استرجاع بيانات الربح بعد إلغاء المرتجع');
      return false;
    }
  }
}

export default ProfitService;
