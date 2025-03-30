
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FinancialService from "./FinancialService";
import { format } from 'date-fns';

/**
 * جسر بين نظام المدفوعات التجارية والنظام المالي
 * يضمن تحديث الأرصدة المالية عند تأكيد أو إلغاء المدفوعات
 */
class FinancialPaymentBridge {
  private static instance: FinancialPaymentBridge;
  private financialService: FinancialService;
  
  private constructor() {
    this.financialService = FinancialService.getInstance();
  }
  
  public static getInstance(): FinancialPaymentBridge {
    if (!FinancialPaymentBridge.instance) {
      FinancialPaymentBridge.instance = new FinancialPaymentBridge();
    }
    return FinancialPaymentBridge.instance;
  }
  
  /**
   * معالجة تأكيد مدفوعة وتحديث الرصيد المالي
   */
  public async handlePaymentConfirmation(payment: any): Promise<boolean> {
    try {
      const paymentType = payment.payment_type === 'collection' ? 'income' : 'expense';
      const paymentMethod = payment.method === 'cash' ? 'cash' : 'bank';
      
      // تحديث الرصيد المالي (نقدي أو بنكي)
      const { data: balanceData, error: balanceError } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .single();
      
      if (balanceError) throw balanceError;
      
      const cashBalance = balanceData.cash_balance || 0;
      const bankBalance = balanceData.bank_balance || 0;
      
      let newCashBalance = cashBalance;
      let newBankBalance = bankBalance;
      
      if (paymentMethod === 'cash') {
        if (paymentType === 'income') {
          newCashBalance = cashBalance + payment.amount;
        } else {
          newCashBalance = cashBalance - payment.amount;
        }
      } else {
        if (paymentType === 'income') {
          newBankBalance = bankBalance + payment.amount;
        } else {
          newBankBalance = bankBalance - payment.amount;
        }
      }
      
      const { error: updateError } = await supabase
        .from('financial_balance')
        .update({
          cash_balance: newCashBalance,
          bank_balance: newBankBalance,
          last_updated: new Date().toISOString()
        })
        .eq('id', '1');
      
      if (updateError) throw updateError;
      
      // إنشاء معاملة مالية مناظرة
      const categoryId = paymentType === 'income'
        ? await this.getIncomeCategoryId()
        : await this.getExpenseCategoryId();
      
      if (!categoryId) {
        console.error('Failed to find appropriate financial category');
        return false;
      }
      
      await this.financialService.createTransaction({
        type: paymentType,
        amount: payment.amount,
        category_id: categoryId,
        date: typeof payment.date === 'string' ? payment.date : format(payment.date, 'yyyy-MM-dd'),
        payment_method: payment.method,
        notes: `${paymentType === 'income' ? 'تحصيل من' : 'تسديد إلى'} ${payment.party_name || 'غير محدد'}`,
        reference_id: payment.id,
        reference_type: 'payment'
      });
      
      return true;
    } catch (error) {
      console.error('Error handling payment confirmation:', error);
      toast.error('حدث خطأ أثناء تحديث الرصيد المالي');
      return false;
    }
  }
  
  /**
   * معالجة إلغاء مدفوعة وتحديث الرصيد المالي
   */
  public async handlePaymentCancellation(payment: any): Promise<boolean> {
    try {
      const paymentType = payment.payment_type === 'collection' ? 'income' : 'expense';
      const paymentMethod = payment.method === 'cash' ? 'cash' : 'bank';
      
      // عكس تأثير المدفوعة على الرصيد المالي
      const { data: balanceData, error: balanceError } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .single();
      
      if (balanceError) throw balanceError;
      
      const cashBalance = balanceData.cash_balance || 0;
      const bankBalance = balanceData.bank_balance || 0;
      
      let newCashBalance = cashBalance;
      let newBankBalance = bankBalance;
      
      // عكس العملية (مثلاً: تم إلغاء تحصيل، نخصم من الرصيد)
      if (paymentMethod === 'cash') {
        if (paymentType === 'income') {
          newCashBalance = cashBalance - payment.amount;
        } else {
          newCashBalance = cashBalance + payment.amount;
        }
      } else {
        if (paymentType === 'income') {
          newBankBalance = bankBalance - payment.amount;
        } else {
          newBankBalance = bankBalance + payment.amount;
        }
      }
      
      const { error: updateError } = await supabase
        .from('financial_balance')
        .update({
          cash_balance: newCashBalance,
          bank_balance: newBankBalance,
          last_updated: new Date().toISOString()
        })
        .eq('id', '1');
      
      if (updateError) throw updateError;
      
      // إنشاء معاملة مالية عكسية
      const reverseCategoryId = paymentType === 'income'
        ? await this.getExpenseCategoryId()
        : await this.getIncomeCategoryId();
      
      if (!reverseCategoryId) {
        console.error('Failed to find appropriate financial category for reversal');
        return false;
      }
      
      // تسجيل المعاملة العكسية بنوع معاكس (إلغاء إيراد = مصروف، إلغاء مصروف = إيراد)
      await this.financialService.createTransaction({
        type: paymentType === 'income' ? 'expense' : 'income',
        amount: payment.amount,
        category_id: reverseCategoryId,
        date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: payment.method,
        notes: `إلغاء ${paymentType === 'income' ? 'تحصيل من' : 'تسديد إلى'} ${payment.party_name || 'غير محدد'}`,
        reference_id: payment.id,
        reference_type: 'payment_cancellation'
      });
      
      return true;
    } catch (error) {
      console.error('Error handling payment cancellation:', error);
      toast.error('حدث خطأ أثناء تحديث الرصيد المالي');
      return false;
    }
  }
  
  /**
   * الحصول على معرف فئة الإيرادات المناسبة
   */
  private async getIncomeCategoryId(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('type', 'income')
        .limit(1);
      
      if (error || !data || data.length === 0) {
        console.error('No income category found:', error);
        return null;
      }
      
      return data[0].id;
    } catch (error) {
      console.error('Error fetching income category:', error);
      return null;
    }
  }
  
  /**
   * الحصول على معرف فئة المصروفات المناسبة
   */
  private async getExpenseCategoryId(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('type', 'expense')
        .limit(1);
      
      if (error || !data || data.length === 0) {
        console.error('No expense category found:', error);
        return null;
      }
      
      return data[0].id;
    } catch (error) {
      console.error('Error fetching expense category:', error);
      return null;
    }
  }
}

export default FinancialPaymentBridge;
