
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProfitCalculator from './ProfitCalculator';
import ProfitCalculationService from './ProfitCalculationService';
import { ProfitData, ProfitFilter, ProfitSummary } from './ProfitTypes';
import { ReturnItem } from '@/types/returns';

/**
 * خدمة الأرباح
 * مسؤولة عن جميع العمليات المتعلقة بالأرباح
 */
class ProfitService {
  private static instance: ProfitService;
  private profitCalculator: ProfitCalculator;
  private calculationService: ProfitCalculationService;

  private constructor() {
    this.profitCalculator = ProfitCalculator.getInstance();
    this.calculationService = ProfitCalculationService.getInstance();
  }

  public static getInstance(): ProfitService {
    if (!ProfitService.instance) {
      ProfitService.instance = new ProfitService();
    }
    return ProfitService.instance;
  }

  /**
   * الحصول على جميع بيانات الأرباح
   */
  public async getProfits(filter?: ProfitFilter): Promise<ProfitData[]> {
    try {
      let query = supabase
        .from('profits')
        .select(`
          *,
          parties (name)
        `);

      // تطبيق مرشحات البحث إذا وجدت
      if (filter) {
        if (filter.startDate) {
          query = query.gte('invoice_date', filter.startDate);
        }
        if (filter.endDate) {
          query = query.lte('invoice_date', filter.endDate);
        }
        if (filter.minProfit) {
          query = query.gte('profit_amount', parseFloat(filter.minProfit));
        }
        if (filter.maxProfit) {
          query = query.lte('profit_amount', parseFloat(filter.maxProfit));
        }
        if (filter.partyId) {
          query = query.eq('party_id', filter.partyId);
        }
        if (filter.sortBy) {
          const order = filter.sortOrder || 'desc';
          query = query.order(filter.sortBy, { ascending: order === 'asc' });
        } else {
          query = query.order('invoice_date', { ascending: false });
        }
      } else {
        query = query.order('invoice_date', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(profit => ({
        id: profit.id,
        invoice_id: profit.invoice_id,
        invoice_date: profit.invoice_date,
        party_id: profit.party_id,
        party_name: profit.parties?.name,
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
   * الحصول على ملخص الأرباح
   */
  public async getProfitSummary(filter?: ProfitFilter): Promise<ProfitSummary> {
    try {
      let profits = await this.getProfits(filter);

      // البيانات الافتراضية
      let summary: ProfitSummary = {
        total_sales: 0,
        total_cost: 0,
        total_profit: 0,
        average_profit_percentage: 0,
        invoice_count: profits.length
      };

      // الحساب إذا كانت هناك بيانات
      if (profits.length > 0) {
        summary.total_sales = profits.reduce((sum, profit) => sum + profit.total_sales, 0);
        summary.total_cost = profits.reduce((sum, profit) => sum + profit.total_cost, 0);
        summary.total_profit = profits.reduce((sum, profit) => sum + profit.profit_amount, 0);
        
        // حساب متوسط نسبة الربح
        const totalPercentage = profits.reduce((sum, profit) => sum + profit.profit_percentage, 0);
        summary.average_profit_percentage = profits.length ? totalPercentage / profits.length : 0;
      }

      return summary;
    } catch (error) {
      console.error('Error calculating profit summary:', error);
      toast.error('حدث خطأ أثناء حساب ملخص الأرباح');
      
      // إرجاع ملخص فارغ في حالة الخطأ
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
   * إعادة حساب الأرباح لفاتورة محددة
   */
  public async recalculateProfitForInvoice(invoiceId: string): Promise<ProfitData | null> {
    try {
      return await this.calculationService.calculateAndSaveProfit(invoiceId);
    } catch (error) {
      console.error('Error recalculating profit:', error);
      toast.error('حدث خطأ أثناء إعادة حساب الأرباح');
      return null;
    }
  }

  /**
   * إعادة حساب جميع الأرباح
   */
  public async recalculateAllProfits(): Promise<boolean> {
    try {
      // الحصول على جميع فواتير المبيعات المؤكدة
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id')
        .eq('invoice_type', 'sale')
        .eq('payment_status', 'confirmed');
      
      if (error) throw error;
      
      if (!invoices || invoices.length === 0) {
        toast.info('لا توجد فواتير مبيعات مؤكدة لإعادة حساب أرباحها');
        return true;
      }
      
      // إعادة حساب الربح لكل فاتورة
      let successCount = 0;
      for (const invoice of invoices) {
        try {
          await this.recalculateProfitForInvoice(invoice.id);
          successCount++;
        } catch (error) {
          console.error(`Error recalculating profit for invoice ${invoice.id}:`, error);
          // استمر في المعالجة حتى مع وجود أخطاء لفواتير فردية
        }
      }
      
      console.log(`Successfully recalculated profits for ${successCount} out of ${invoices.length} invoices`);
      
      return true;
    } catch (error) {
      console.error('Error recalculating all profits:', error);
      toast.error('حدث خطأ أثناء إعادة حساب جميع الأرباح');
      return false;
    }
  }

  /**
   * حساب وحفظ بيانات الربح لفاتورة مبيعات
   */
  public async calculateInvoiceProfit(invoiceId: string): Promise<ProfitData | null> {
    try {
      return await this.calculationService.calculateAndSaveProfit(invoiceId);
    } catch (error) {
      console.error('Error calculating invoice profit:', error);
      return null;
    }
  }

  /**
   * حذف بيانات الربح لفاتورة محددة
   */
  public async removeProfitData(invoiceId: string): Promise<boolean> {
    try {
      return await this.calculationService.deleteProfitByInvoiceId(invoiceId);
    } catch (error) {
      console.error('Error removing profit data:', error);
      return false;
    }
  }

  /**
   * تحديث بيانات الربح عند تسجيل مرتجع مبيعات
   * @param invoiceId معرف الفاتورة المرتبطة
   * @param returnItems عناصر المرتجع
   * @param returnAmount مبلغ المرتجع الإجمالي
   */
  public async updateProfitForReturn(
    invoiceId: string,
    returnItems: ReturnItem[],
    returnAmount: number
  ): Promise<boolean> {
    try {
      console.log(`Updating profit for invoice ${invoiceId} after return with amount ${returnAmount}`);
      
      // 1. الحصول على بيانات الربح الحالية للفاتورة
      const { data: profitData, error } = await supabase
        .from('profits')
        .select('*')
        .eq('invoice_id', invoiceId)
        .single();
      
      if (error) {
        console.error('Error fetching profit data:', error);
        
        if (error.code === 'PGRST116') { // Error: no rows returned
          console.warn(`No profit record found for invoice ${invoiceId}`);
          return false;
        }
        
        throw error;
      }
      
      // 2. حساب مجموع تكلفة الأصناف المرتجعة
      let returnItemsCost = 0;
      for (const item of returnItems) {
        // حساب تكلفة الصنف المرتجع - يمكن تحسين هذا بجلب التكلفة الفعلية من قاعدة البيانات
        const itemUnitCost = await this.profitCalculator.getItemCost(
          item.item_id,
          item.item_type
        );
        returnItemsCost += itemUnitCost * item.quantity;
      }
      
      console.log(`Return items cost: ${returnItemsCost}, Return amount: ${returnAmount}`);
      
      // 3. حساب القيم الجديدة بعد المرتجع
      const newTotalSales = profitData.total_sales - returnAmount;
      const newTotalCost = profitData.total_cost - returnItemsCost;
      const newProfitAmount = newTotalSales - newTotalCost;
      const newProfitPercentage = newTotalSales > 0 ? (newProfitAmount / newTotalSales) * 100 : 0;
      
      console.log('Updated profit values:', {
        oldTotalSales: profitData.total_sales,
        newTotalSales,
        oldTotalCost: profitData.total_cost,
        newTotalCost,
        oldProfitAmount: profitData.profit_amount,
        newProfitAmount,
        oldProfitPercentage: profitData.profit_percentage,
        newProfitPercentage
      });
      
      // 4. تحديث سجل الربح
      const { error: updateError } = await supabase
        .from('profits')
        .update({
          total_sales: newTotalSales,
          total_cost: newTotalCost,
          profit_amount: newProfitAmount,
          profit_percentage: newProfitPercentage
        })
        .eq('id', profitData.id);
      
      if (updateError) throw updateError;
      
      console.log(`Successfully updated profit for invoice ${invoiceId} after return`);
      return true;
    } catch (error) {
      console.error('Error updating profit for return:', error);
      return false;
    }
  }

  /**
   * استعادة بيانات الربح بعد إلغاء مرتجع مبيعات
   * @param invoiceId معرف الفاتورة المرتبطة
   * @param returnItems عناصر المرتجع
   * @param returnAmount مبلغ المرتجع الإجمالي
   */
  public async restoreProfitAfterReturnCancellation(
    invoiceId: string,
    returnItems: ReturnItem[],
    returnAmount: number
  ): Promise<boolean> {
    try {
      console.log(`Restoring profit for invoice ${invoiceId} after return cancellation with amount ${returnAmount}`);
      
      // 1. الحصول على بيانات الربح الحالية للفاتورة
      const { data: profitData, error } = await supabase
        .from('profits')
        .select('*')
        .eq('invoice_id', invoiceId)
        .single();
      
      if (error) {
        console.error('Error fetching profit data:', error);
        
        if (error.code === 'PGRST116') { // Error: no rows returned
          console.warn(`No profit record found for invoice ${invoiceId}`);
          return false;
        }
        
        throw error;
      }
      
      // 2. حساب مجموع تكلفة الأصناف المرتجعة
      let returnItemsCost = 0;
      for (const item of returnItems) {
        // حساب تكلفة الصنف المرتجع
        const itemUnitCost = await this.profitCalculator.getItemCost(
          item.item_id,
          item.item_type
        );
        returnItemsCost += itemUnitCost * item.quantity;
      }
      
      console.log(`Return items cost: ${returnItemsCost}, Return amount: ${returnAmount}`);
      
      // 3. حساب القيم الجديدة بعد إلغاء المرتجع (إضافة القيم مرة أخرى)
      const newTotalSales = profitData.total_sales + returnAmount;
      const newTotalCost = profitData.total_cost + returnItemsCost;
      const newProfitAmount = newTotalSales - newTotalCost;
      const newProfitPercentage = newTotalSales > 0 ? (newProfitAmount / newTotalSales) * 100 : 0;
      
      console.log('Restored profit values:', {
        oldTotalSales: profitData.total_sales,
        newTotalSales,
        oldTotalCost: profitData.total_cost,
        newTotalCost,
        oldProfitAmount: profitData.profit_amount,
        newProfitAmount,
        oldProfitPercentage: profitData.profit_percentage,
        newProfitPercentage
      });
      
      // 4. تحديث سجل الربح
      const { error: updateError } = await supabase
        .from('profits')
        .update({
          total_sales: newTotalSales,
          total_cost: newTotalCost,
          profit_amount: newProfitAmount,
          profit_percentage: newProfitPercentage
        })
        .eq('id', profitData.id);
      
      if (updateError) throw updateError;
      
      console.log(`Successfully restored profit for invoice ${invoiceId} after return cancellation`);
      return true;
    } catch (error) {
      console.error('Error restoring profit after return cancellation:', error);
      return false;
    }
  }
}

export default ProfitService;
