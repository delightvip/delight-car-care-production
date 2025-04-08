
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FinancialBalance } from "./FinancialTypes";

/**
 * خدمة إدارة أرصدة الخزينة
 * تتعامل مع تحديث أرصدة الخزينة (النقدية والبنكية) عند إجراء المعاملات المالية
 */
class FinancialBalanceService {
  private static instance: FinancialBalanceService;
  
  private constructor() {}
  
  public static getInstance(): FinancialBalanceService {
    if (!FinancialBalanceService.instance) {
      FinancialBalanceService.instance = new FinancialBalanceService();
    }
    return FinancialBalanceService.instance;
  }
  
  /**
   * الحصول على أرصدة الخزينة الحالية
   */
  public async getCurrentBalance(): Promise<FinancialBalance | null> {
    try {
      const { data, error } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .single();
      
      if (error) throw error;
      
      return data as FinancialBalance;
    } catch (error) {
      console.error('Error fetching financial balance:', error);
      toast.error('حدث خطأ أثناء جلب أرصدة الخزينة');
      return null;
    }
  }
  
  /**
   * تحديث رصيد الخزينة النقدي
   * @param amount المبلغ المراد إضافته/خصمه (موجب للإضافة، سالب للخصم)
   * @param reason سبب التحديث (للسجلات)
   */
  public async updateCashBalance(amount: number, reason: string): Promise<boolean> {
    try {
      const balance = await this.getCurrentBalance();
      if (!balance) return false;
      
      const newCashBalance = Number(balance.cash_balance) + amount;
      
      if (newCashBalance < 0) {
        toast.error('الرصيد النقدي لا يمكن أن يكون سالباً');
        return false;
      }
      
      const { error } = await supabase
        .from('financial_balance')
        .update({
          cash_balance: newCashBalance,
          last_updated: new Date().toISOString()
        })
        .eq('id', '1');
      
      if (error) throw error;
      
      console.log(`Cash balance updated: ${amount > 0 ? 'Added' : 'Subtracted'} ${Math.abs(amount)} EGP. Reason: ${reason}. New balance: ${newCashBalance}`);
      return true;
    } catch (error) {
      console.error('Error updating cash balance:', error);
      toast.error('حدث خطأ أثناء تحديث رصيد الخزينة النقدي');
      return false;
    }
  }
  
  /**
   * تحديث رصيد الخزينة البنكي
   * @param amount المبلغ المراد إضافته/خصمه (موجب للإضافة، سالب للخصم)
   * @param reason سبب التحديث (للسجلات)
   */
  public async updateBankBalance(amount: number, reason: string): Promise<boolean> {
    try {
      const balance = await this.getCurrentBalance();
      if (!balance) return false;
      
      const newBankBalance = Number(balance.bank_balance) + amount;
      
      if (newBankBalance < 0) {
        toast.error('الرصيد البنكي لا يمكن أن يكون سالباً');
        return false;
      }
      
      const { error } = await supabase
        .from('financial_balance')
        .update({
          bank_balance: newBankBalance,
          last_updated: new Date().toISOString()
        })
        .eq('id', '1');
      
      if (error) throw error;
      
      console.log(`Bank balance updated: ${amount > 0 ? 'Added' : 'Subtracted'} ${Math.abs(amount)} EGP. Reason: ${reason}. New balance: ${newBankBalance}`);
      return true;
    } catch (error) {
      console.error('Error updating bank balance:', error);
      toast.error('حدث خطأ أثناء تحديث رصيد الخزينة البنكي');
      return false;
    }
  }
  
  /**
   * تحديث رصيد الخزينة بناءً على طريقة الدفع
   * @param amount المبلغ
   * @param paymentMethod طريقة الدفع (cash, bank_transfer, check, other)
   * @param isIncome هل هي عملية إيراد (true) أم مصروف (false)
   * @param reason سبب التحديث
   */
  public async updateBalanceByPaymentMethod(
    amount: number, 
    paymentMethod: string, 
    isIncome: boolean, 
    reason: string
  ): Promise<boolean> {
    const actualAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);
    
    switch (paymentMethod) {
      case 'cash':
        return this.updateCashBalance(actualAmount, reason);
      case 'bank_transfer':
      case 'check':
        return this.updateBankBalance(actualAmount, reason);
      case 'other':
        // لطرق الدفع الأخرى، نفترض أنها نقدية
        return this.updateCashBalance(actualAmount, reason);
      default:
        // الافتراضي هو النقدية
        return this.updateCashBalance(actualAmount, reason);
    }
  }
  
  /**
   * تحديث أرصدة الخزينة يدويًا
   * @param cashBalance الرصيد النقدي الجديد
   * @param bankBalance الرصيد البنكي الجديد
   * @returns نجاح العملية
   */
  public async updateBalancesManually(cashBalance: number, bankBalance: number): Promise<boolean> {
    try {
      if (cashBalance < 0 || bankBalance < 0) {
        toast.error('الأرصدة لا يمكن أن تكون سالبة');
        return false;
      }
      
      const { error } = await supabase
        .from('financial_balance')
        .update({
          cash_balance: cashBalance,
          bank_balance: bankBalance,
          last_updated: new Date().toISOString()
        })
        .eq('id', '1');
      
      if (error) throw error;
      
      toast.success('تم تحديث أرصدة الخزينة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating financial balances manually:', error);
      toast.error('حدث خطأ أثناء تحديث أرصدة الخزينة');
      return false;
    }
  }
  
  /**
   * إرسال إشعار بتغيير البيانات المالية
   * @param source مصدر التغيير
   * @private
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

export default FinancialBalanceService;
