
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * خدمة إدارة الأرباح
 * مسؤولة عن حساب وتخزين وإدارة بيانات الأرباح
 */
class ProfitService {
  private static instance: ProfitService;
  
  private constructor() {}
  
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
}

export default ProfitService;
