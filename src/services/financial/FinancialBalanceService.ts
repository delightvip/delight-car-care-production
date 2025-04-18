
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
      
      // التحقق من أن الرصيد الجديد غير سالب (لا يمكن للخزينة أن تكون سالبة)
      if (newCashBalance < 0) {
        toast.error('لا يمكن أن يكون رصيد الخزينة النقدية سالباً');
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
      
      // التحقق من أن الرصيد الجديد غير سالب (لا يمكن للحساب البنكي أن يكون سالباً)
      if (newBankBalance < 0) {
        toast.error('لا يمكن أن يكون رصيد الحساب البنكي سالباً');
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
      case 'bank':
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
   * تحديث أرصدة الخزينة يدويًا بقيم محددة
   * @param cashBalance الرصيد النقدي الجديد
   * @param bankBalance الرصيد البنكي الجديد
   * @param reason سبب التعديل
   */
  public async setBalanceManually(
    cashBalance: number,
    bankBalance: number,
    reason: string = 'تعديل يدوي للأرصدة'
  ): Promise<boolean> {
    try {
      // التحقق من صحة القيم
      if (cashBalance < 0 || bankBalance < 0) {
        toast.error('لا يمكن أن تكون قيم الأرصدة سالبة');
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
      
      console.log(`Balances updated manually. Cash: ${cashBalance} EGP, Bank: ${bankBalance} EGP. Reason: ${reason}`);
      toast.success('تم تحديث الأرصدة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating balances manually:', error);
      toast.error('حدث خطأ أثناء تحديث الأرصدة');
      return false;
    }
  }
}

export default FinancialBalanceService;
