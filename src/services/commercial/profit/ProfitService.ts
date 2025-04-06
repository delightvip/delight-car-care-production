
import { toast } from "sonner";
import { ProfitData, ProfitFilter, ProfitSummary } from './ProfitTypes';
import BaseCommercialService from '../BaseCommercialService';
import ProfitRevenueService from './ProfitRevenueService';
import ProfitCalculationService from './ProfitCalculationService';
import ProfitRepository from './ProfitRepository';

/**
 * خدمة الأرباح الرئيسية
 * تتولى هذه الخدمة تنسيق العمليات بين مختلف مكونات نظام الأرباح
 */
class ProfitService extends BaseCommercialService {
  private static instance: ProfitService;
  private profitCalculationService: ProfitCalculationService;
  private profitRevenueService: ProfitRevenueService;
  private profitRepository: ProfitRepository;
  
  private constructor() {
    super();
    this.profitCalculationService = ProfitCalculationService.getInstance();
    this.profitRevenueService = ProfitRevenueService.getInstance();
    this.profitRepository = ProfitRepository.getInstance();
  }
  
  public static getInstance(): ProfitService {
    if (!ProfitService.instance) {
      ProfitService.instance = new ProfitService();
    }
    return ProfitService.instance;
  }
  
  /**
   * حساب الربح لفاتورة محددة وتحديث الإيرادات المرتبطة
   */
  public async calculateInvoiceProfit(invoiceId: string): Promise<ProfitData | null> {
    try {
      // حساب وحفظ بيانات الربح
      const profitData = await this.profitCalculationService.calculateAndSaveProfit(invoiceId);
      
      if (profitData && profitData.profit_amount > 0) {
        // إنشاء إيراد مرتبط بالربح إذا كان هناك ربح إيجابي
        await this.profitRevenueService.createRevenueFromProfit(profitData);
      }
      
      return profitData;
    } catch (error) {
      console.error('Error calculating invoice profit:', error);
      toast.error('حدث خطأ أثناء حساب الأرباح');
      return null;
    }
  }
  
  /**
   * الحصول على بيانات الأرباح مع خيارات التصفية
   */
  public async getProfits(filters?: ProfitFilter): Promise<ProfitData[]> {
    return this.profitRepository.getProfits(filters);
  }
  
  /**
   * الحصول على ملخص الأرباح
   */
  public async getProfitSummary(startDate?: string, endDate?: string, partyId?: string): Promise<ProfitSummary> {
    return this.profitRepository.getProfitSummary(startDate, endDate, partyId);
  }
  
  /**
   * إزالة بيانات الربح والإيراد المرتبط به لفاتورة محددة (عند حذف/إلغاء الفاتورة)
   */
  public async removeProfitData(invoiceId: string): Promise<boolean> {
    try {
      // الحصول على معرف سجل الربح أولاً
      const profitData = await this.profitCalculationService.getProfitByInvoiceId(invoiceId);
      
      if (profitData) {
        // إلغاء الإيراد المرتبط بالربح
        await this.profitRevenueService.cancelProfitRevenue(profitData.id);
      }
      
      // حذف سجل الربح
      return await this.profitCalculationService.deleteProfitByInvoiceId(invoiceId);
    } catch (error) {
      console.error('Error removing profit data:', error);
      toast.error('حدث خطأ أثناء إزالة بيانات الربح');
      return false;
    }
  }
  
  /**
   * إعادة حساب الأرباح لجميع فواتير المبيعات وتحديث الإيرادات المرتبطة
   */
  public async recalculateAllProfits(): Promise<boolean> {
    try {
      // الحصول على جميع فواتير المبيعات المؤكدة
      const { data: invoices, error } = await this.supabase
        .from('invoices')
        .select('id')
        .eq('invoice_type', 'sale')
        .eq('payment_status', 'confirmed');
      
      if (error) throw error;
      
      // معالجة كل فاتورة
      let successCount = 0;
      for (const invoice of invoices) {
        const result = await this.calculateInvoiceProfit(invoice.id);
        if (result) successCount++;
      }
      
      toast.success(`تم إعادة حساب الأرباح بنجاح لعدد ${successCount} من الفواتير`);
      return true;
    } catch (error) {
      console.error('Error recalculating all profits:', error);
      toast.error('حدث خطأ أثناء إعادة حساب الأرباح');
      return false;
    }
  }
}

export default ProfitService;
