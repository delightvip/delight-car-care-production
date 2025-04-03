
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BaseCommercialService from '../BaseCommercialService';
import ProfitCalculator from './ProfitCalculator';
import { ProfitData } from './ProfitTypes';

/**
 * خدمة حسابات الأرباح
 * تتولى هذه الخدمة مسؤولية حساب وحفظ بيانات الأرباح
 */
class ProfitCalculationService extends BaseCommercialService {
  private static instance: ProfitCalculationService;
  private profitCalculator: ProfitCalculator;
  
  private constructor() {
    super();
    this.profitCalculator = ProfitCalculator.getInstance();
  }
  
  public static getInstance(): ProfitCalculationService {
    if (!ProfitCalculationService.instance) {
      ProfitCalculationService.instance = new ProfitCalculationService();
    }
    return ProfitCalculationService.instance;
  }
  
  /**
   * حساب وحفظ بيانات الربح لفاتورة مبيعات
   * @param invoiceId معرف الفاتورة
   * @returns بيانات الربح المحسوبة أو null في حال الفشل
   */
  public async calculateAndSaveProfit(invoiceId: string): Promise<ProfitData | null> {
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
      
      // Make sure this is a confirmed sales invoice
      if (invoice.invoice_type !== 'sale' || invoice.payment_status !== 'confirmed') {
        return null;
      }
      
      // Calculate total cost of items
      const totalCost = await this.profitCalculator.calculateInvoiceCost(invoiceId);
      
      const totalSales = invoice.total_amount;
      const profitAmount = totalSales - totalCost;
      const profitPercentage = totalSales > 0 ? (profitAmount / totalSales) * 100 : 0;
      
      // Check if profit record already exists
      const { data: existingProfit, error: existingError } = await this.supabase
        .from('profits')
        .select('id')
        .eq('invoice_id', invoiceId)
        .limit(1);
      
      if (existingError) throw existingError;
      
      let profitData: ProfitData;
      
      // Update existing record or create new one
      if (existingProfit && existingProfit.length > 0) {
        const { data: updatedProfit, error: updateError } = await this.supabase
          .from('profits')
          .update({
            total_sales: totalSales,
            total_cost: totalCost,
            profit_amount: profitAmount,
            profit_percentage: profitPercentage
          })
          .eq('id', existingProfit[0].id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        profitData = updatedProfit as ProfitData;
      } else {
        // Save new profit data
        const { data: newProfit, error: insertError } = await this.supabase
          .from('profits')
          .insert({
            invoice_id: invoiceId,
            invoice_date: invoice.date,
            party_id: invoice.party_id,
            total_sales: totalSales,
            total_cost: totalCost,
            profit_amount: profitAmount,
            profit_percentage: profitPercentage
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        profitData = newProfit as ProfitData;
      }
      
      return profitData;
    } catch (error) {
      console.error('Error calculating and saving profit:', error);
      toast.error('حدث خطأ أثناء حساب وحفظ الأرباح');
      return null;
    }
  }
  
  /**
   * الحصول على بيانات الربح لفاتورة محددة
   * @param invoiceId معرف الفاتورة
   * @returns بيانات الربح أو null إذا لم يتم العثور عليها
   */
  public async getProfitByInvoiceId(invoiceId: string): Promise<ProfitData | null> {
    try {
      const { data, error } = await this.supabase
        .from('profits')
        .select('*')
        .eq('invoice_id', invoiceId)
        .limit(1)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // لم يتم العثور على سجل
          return null;
        }
        throw error;
      }
      
      return data as ProfitData;
    } catch (error) {
      console.error('Error getting profit by invoice ID:', error);
      return null;
    }
  }
  
  /**
   * حذف بيانات الربح لفاتورة محددة
   * @param invoiceId معرف الفاتورة
   * @returns نجاح العملية
   */
  public async deleteProfitByInvoiceId(invoiceId: string): Promise<boolean> {
    try {
      // الحصول على معرف سجل الربح أولاً
      const profitData = await this.getProfitByInvoiceId(invoiceId);
      if (!profitData) {
        // لا توجد بيانات ربح لهذه الفاتورة
        return true;
      }
      
      const { error } = await this.supabase
        .from('profits')
        .delete()
        .eq('invoice_id', invoiceId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting profit for invoice:', error);
      toast.error('حدث خطأ أثناء حذف بيانات الربح');
      return false;
    }
  }
}

export default ProfitCalculationService;
