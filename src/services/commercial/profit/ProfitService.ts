import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BaseCommercialService from '../BaseCommercialService';
import ProfitCalculationService from './ProfitCalculationService';
import { ProfitData, ProfitFilter, ProfitSummary } from './ProfitTypes';

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

  /**
   * الحصول على قائمة الأرباح بناءً على مرشحات محددة
   * @param filters مرشحات البحث
   */
  public async getProfits(filters?: ProfitFilter): Promise<ProfitData[]> {
    try {
      let query = this.supabase
        .from('profits')
        .select(`
          *,
          invoices!inner (date, invoice_type),
          parties (name)
        `)
        .eq('invoices.invoice_type', 'sale');
      
      // تطبيق المرشحات إذا وجدت
      if (filters) {
        if (filters.startDate) {
          query = query.gte('invoices.date', filters.startDate);
        }
        
        if (filters.endDate) {
          query = query.lte('invoices.date', filters.endDate);
        }
        
        if (filters.minProfit && !isNaN(Number(filters.minProfit))) {
          query = query.gte('profit_amount', Number(filters.minProfit));
        }
        
        if (filters.maxProfit && !isNaN(Number(filters.maxProfit))) {
          query = query.lte('profit_amount', Number(filters.maxProfit));
        }
        
        if (filters.partyId) {
          query = query.eq('party_id', filters.partyId);
        }
        
        // تطبيق ترتيب النتائج إذا تم تحديده
        if (filters.sortBy) {
          const orderField = filters.sortBy === 'date' ? 'invoices.date' : filters.sortBy;
          query = query.order(orderField, { ascending: filters.sortOrder === 'asc' });
        } else {
          // الترتيب الافتراضي
          query = query.order('invoices.date', { ascending: false });
        }
      } else {
        // الترتيب الافتراضي
        query = query.order('invoices.date', { ascending: false });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // تحويل البيانات إلى الشكل المطلوب
      return data.map(profit => ({
        id: profit.id,
        invoice_id: profit.invoice_id,
        invoice_date: profit.invoices?.date || '',
        party_id: profit.party_id,
        party_name: profit.parties?.name || '',
        total_sales: profit.total_sales,
        total_cost: profit.total_cost,
        profit_amount: profit.profit_amount,
        profit_percentage: profit.profit_percentage,
        created_at: profit.created_at
      }));
    } catch (error) {
      console.error('Error fetching profits:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الأرباح');
      return [];
    }
  }

  /**
   * الحصول على ملخص الأرباح لفترة محددة
   * @param startDate تاريخ البداية
   * @param endDate تاريخ النهاية
   * @param partyId معرف الطرف (اختياري)
   */
  public async getProfitSummary(
    startDate?: string,
    endDate?: string,
    partyId?: string
  ): Promise<ProfitSummary> {
    try {
      let query = this.supabase
        .from('profits')
        .select(`
          *,
          invoices!inner (date, invoice_type)
        `)
        .eq('invoices.invoice_type', 'sale');
      
      // تطبيق المرشحات إذا وجدت
      if (startDate) {
        query = query.gte('invoices.date', startDate);
      }
      
      if (endDate) {
        query = query.lte('invoices.date', endDate);
      }
      
      if (partyId) {
        query = query.eq('party_id', partyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // حساب القيم الإجمالية
      const totalSales = data.reduce((sum, profit) => sum + profit.total_sales, 0);
      const totalCost = data.reduce((sum, profit) => sum + profit.total_cost, 0);
      const totalProfit = data.reduce((sum, profit) => sum + profit.profit_amount, 0);
      const invoiceCount = data.length;
      
      // حساب متوسط نسبة الربح
      const averageProfitPercentage = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
      
      return {
        total_sales: totalSales,
        total_cost: totalCost,
        total_profit: totalProfit,
        average_profit_percentage: averageProfitPercentage,
        invoice_count: invoiceCount
      };
    } catch (error) {
      console.error('Error fetching profit summary:', error);
      toast.error('حدث خطأ أثناء جلب ملخص الأرباح');
      return {
        total_sales: 0,
        total_cost: 0,
        total_profit: 0,
        average_profit_percentage: 0,
        invoice_count: 0
      };
    }
  }

  /**
   * إعادة حساب جميع الأرباح
   */
  public async recalculateAllProfits(): Promise<void> {
    try {
      // 1. الحصول على جميع فواتير المبيعات المؤكدة
      const { data: salesInvoices, error: invoicesError } = await this.supabase
        .from('invoices')
        .select('id')
        .eq('invoice_type', 'sale')
        .eq('payment_status', 'confirmed');
      
      if (invoicesError) throw invoicesError;
      
      if (!salesInvoices || salesInvoices.length === 0) {
        toast.info('لا توجد فواتير مبيعات لإعادة حساب الأرباح');
        return;
      }
      
      // 2. إعادة حساب الربح لكل فاتورة
      let successCount = 0;
      let failCount = 0;
      
      for (const invoice of salesInvoices) {
        const result = await this.calculateInvoiceProfit(invoice.id);
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      }
      
      if (failCount > 0) {
        toast.warning(`تم إعادة حساب ${successCount} فاتورة بنجاح، وفشل حساب ${failCount} فاتورة`);
      } else {
        toast.success(`تم إعادة حساب أرباح ${successCount} فاتورة بنجاح`);
      }
    } catch (error) {
      console.error('Error recalculating all profits:', error);
      toast.error('حدث خطأ أثناء إعادة حساب جميع الأرباح');
    }
  }
}

export default ProfitService;
