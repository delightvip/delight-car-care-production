
import { toast } from "sonner";
import { ProfitData, ProfitFilter, ProfitSummary } from './ProfitTypes';
import BaseCommercialService from '../BaseCommercialService';
import ProfitCalculator from './ProfitCalculator';
import ProfitRepository from './ProfitRepository';

class ProfitService extends BaseCommercialService {
  private static instance: ProfitService;
  private profitCalculator: ProfitCalculator;
  private profitRepository: ProfitRepository;
  
  private constructor() {
    super();
    this.profitCalculator = ProfitCalculator.getInstance();
    this.profitRepository = ProfitRepository.getInstance();
  }
  
  public static getInstance(): ProfitService {
    if (!ProfitService.instance) {
      ProfitService.instance = new ProfitService();
    }
    return ProfitService.instance;
  }
  
  /**
   * Calculate profit for a specific invoice
   */
  public async calculateInvoiceProfit(invoiceId: string): Promise<ProfitData | null> {
    try {
      // Get invoice details
      const { data: invoice, error: invoiceError } = await this.supabase
        .from('invoices')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) throw invoiceError;
      
      // Make sure this is a sales invoice
      if (invoice.invoice_type !== 'sale' || invoice.payment_status !== 'confirmed') {
        return null;
      }
      
      // Calculate total cost of items
      const totalCost = await this.profitCalculator.calculateInvoiceCost(invoiceId);
      
      const totalSales = invoice.total_amount;
      const profitAmount = totalSales - totalCost;
      const profitPercentage = totalSales > 0 ? (profitAmount / totalSales) * 100 : 0;
      
      // Save profit data
      const profitData = await this.profitRepository.saveProfitData({
        invoice_id: invoiceId,
        invoice_date: invoice.date,
        party_id: invoice.party_id,
        total_sales: totalSales,
        total_cost: totalCost,
        profit_amount: profitAmount,
        profit_percentage: profitPercentage
      });
      
      return profitData;
    } catch (error) {
      console.error('Error calculating invoice profit:', error);
      toast.error('حدث خطأ أثناء حساب الأرباح');
      return null;
    }
  }
  
  /**
   * Get profit data with filtering options
   */
  public async getProfits(filters?: ProfitFilter): Promise<ProfitData[]> {
    return this.profitRepository.getProfits(filters);
  }
  
  /**
   * Get profit summary
   */
  public async getProfitSummary(startDate?: string, endDate?: string, partyId?: string): Promise<ProfitSummary> {
    return this.profitRepository.getProfitSummary(startDate, endDate, partyId);
  }
  
  /**
   * Remove profit data for an invoice (when invoice is deleted/cancelled)
   */
  public async removeProfitData(invoiceId: string): Promise<boolean> {
    return this.profitRepository.removeProfitData(invoiceId);
  }
  
  /**
   * Recalculate profits for all sales invoices
   */
  public async recalculateAllProfits(): Promise<boolean> {
    try {
      // Get all confirmed sales invoices
      const { data: invoices, error } = await this.supabase
        .from('invoices')
        .select('id')
        .eq('invoice_type', 'sale')
        .eq('payment_status', 'confirmed');
      
      if (error) throw error;
      
      // Process each invoice
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

export { ProfitFilter };
export default ProfitService;
