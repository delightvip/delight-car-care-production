
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ProfitCalculationService from './ProfitCalculationService';
import ProfitRepository from './ProfitRepository';
import { ProfitData, ProfitFilter, ProfitSummary } from './ProfitTypes';

/**
 * خدمة إدارة الأرباح
 * مسؤولة عن حساب وتخزين وإدارة بيانات الأرباح
 */
class ProfitService {
  private static instance: ProfitService;
  private profitCalculationService: ProfitCalculationService;
  private profitRepository: ProfitRepository;
  
  private constructor() {
    this.profitCalculationService = ProfitCalculationService.getInstance();
    this.profitRepository = ProfitRepository.getInstance();
  }
  
  public static getInstance(): ProfitService {
    if (!ProfitService.instance) {
      ProfitService.instance = new ProfitService();
    }
    return ProfitService.instance;
  }
  
  /**
   * الحصول على سجل الربح بواسطة معرف الفاتورة
   */
  public async getProfitByInvoiceId(invoiceId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('profits')
        .select('*')
        .eq('invoice_id', invoiceId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // no rows returned
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching profit for invoice ${invoiceId}:`, error);
      return null;
    }
  }
  
  /**
   * تسجيل الربح لفاتورة بيع
   */
  public async recordInvoiceProfit(
    invoiceId: string,
    invoiceDate: string,
    partyId: string,
    totalSales: number,
    totalCost: number
  ): Promise<boolean> {
    try {
      // حساب مبلغ الربح ونسبة الربح
      const profit = totalSales - totalCost;
      const profitPercentage = totalSales > 0 ? (profit / totalSales) * 100 : 0;
      
      // التحقق من وجود سجل ربح سابق لهذه الفاتورة
      const existingProfit = await this.getProfitByInvoiceId(invoiceId);
      
      if (existingProfit) {
        // تحديث السجل الموجود
        const { error } = await supabase
          .from('profits')
          .update({
            total_sales: totalSales,
            total_cost: totalCost,
            profit_amount: profit,
            profit_percentage: profitPercentage,
            invoice_date: invoiceDate
          })
          .eq('invoice_id', invoiceId);
        
        if (error) throw error;
      } else {
        // إنشاء سجل جديد
        const { error } = await supabase
          .from('profits')
          .insert({
            invoice_id: invoiceId,
            party_id: partyId,
            invoice_date: invoiceDate,
            total_sales: totalSales,
            total_cost: totalCost,
            profit_amount: profit,
            profit_percentage: profitPercentage
          });
        
        if (error) throw error;
      }
      
      return true;
    } catch (error) {
      console.error(`Error recording profit for invoice ${invoiceId}:`, error);
      toast.error('حدث خطأ أثناء تسجيل بيانات الربح');
      return false;
    }
  }
  
  /**
   * حذف سجل الربح لفاتورة معينة
   */
  public async deleteProfitRecord(invoiceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profits')
        .delete()
        .eq('invoice_id', invoiceId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error(`Error deleting profit record for invoice ${invoiceId}:`, error);
      return false;
    }
  }

  /**
   * احتساب ربح الفاتورة
   */
  public async calculateInvoiceProfit(invoiceId: string): Promise<any> {
    return await this.profitCalculationService.calculateAndSaveProfit(invoiceId);
  }

  /**
   * إزالة بيانات الربح
   */
  public async removeProfitData(invoiceId: string): Promise<boolean> {
    return await this.profitCalculationService.deleteProfitByInvoiceId(invoiceId);
  }

  /**
   * الحصول على جميع سجلات الأرباح مع إمكانية التصفية
   */
  public async getProfits(filters?: ProfitFilter): Promise<ProfitData[]> {
    return await this.profitRepository.getProfits(filters);
  }

  /**
   * الحصول على ملخص الأرباح
   */
  public async getProfitSummary(startDate?: string, endDate?: string, partyId?: string): Promise<ProfitSummary> {
    return await this.profitRepository.getProfitSummary(startDate, endDate, partyId);
  }

  /**
   * إعادة حساب جميع الأرباح
   */
  public async recalculateAllProfits(): Promise<boolean> {
    try {
      // الحصول على جميع فواتير البيع المؤكدة
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, date, party_id, total_amount')
        .eq('invoice_type', 'sale')
        .eq('payment_status', 'confirmed');
      
      if (error) throw error;
      
      // إعادة حساب الربح لكل فاتورة
      for (const invoice of invoices) {
        await this.calculateInvoiceProfit(invoice.id);
      }
      
      return true;
    } catch (error) {
      console.error('Error recalculating all profits:', error);
      return false;
    }
  }
}

export default ProfitService;
