
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import FinancialBalanceService from "./FinancialBalanceService";
import FinancialTransactionService from "./FinancialTransactionService";
import { CashOperation } from "@/integrations/supabase/types-custom";

/**
 * خدمة إدارة العمليات النقدية
 * تتعامل مع عمليات إيداع وسحب وتحويل الأموال بين الخزينة النقدية والحساب البنكي
 */
class CashManagementService {
  private static instance: CashManagementService;
  private financialBalanceService: FinancialBalanceService;
  private transactionService: FinancialTransactionService;
  
  private constructor() {
    this.financialBalanceService = FinancialBalanceService.getInstance();
    this.transactionService = FinancialTransactionService.getInstance();
  }
  
  public static getInstance(): CashManagementService {
    if (!CashManagementService.instance) {
      CashManagementService.instance = new CashManagementService();
    }
    return CashManagementService.instance;
  }
  
  /**
   * إيداع مبلغ في حساب (نقدي أو بنكي)
   * @param amount المبلغ المراد إيداعه
   * @param accountType نوع الحساب (cash = نقدي, bank = بنكي)
   * @param date تاريخ العملية
   * @param notes ملاحظات
   * @param reference رقم مرجعي
   */
  public async depositToAccount(
    amount: number,
    accountType: 'cash' | 'bank',
    date: Date,
    notes: string = '',
    reference: string = ''
  ): Promise<boolean> {
    try {
      // التحقق من صحة المبلغ
      if (amount <= 0) {
        toast.error('يجب أن يكون المبلغ أكبر من صفر');
        return false;
      }
      
      // تحديث الرصيد المناسب
      if (accountType === 'cash') {
        await this.financialBalanceService.updateCashBalance(amount, `إيداع في الخزينة النقدية: ${notes}`);
      } else {
        await this.financialBalanceService.updateBankBalance(amount, `إيداع في الحساب البنكي: ${notes}`);
      }
      
      // إضافة سجل للعملية
      const operation: Omit<CashOperation, 'id' | 'created_at'> = {
        date: format(date, 'yyyy-MM-dd'),
        amount,
        operation_type: 'deposit',
        account_type: accountType,
        notes,
        reference
      };
      
      const { data, error } = await supabase
        .from('cash_operations')
        .insert(operation as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // تسجيل معاملة مالية
      const categoryId = 'c0e47d1c-2c9c-4c42-bcb6-ddeabf817fac'; // فئة "إيرادات أخرى" (نقوم بتثبيتها للتبسيط)
      
      await this.transactionService.createTransaction({
        amount,
        type: 'income',
        date: format(date, 'yyyy-MM-dd'),
        payment_method: accountType,
        category_id: categoryId,
        notes: `إيداع في ${accountType === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}: ${notes}`,
        reference_id: data.id,
        reference_type: 'cash_operation'
      });
      
      return true;
    } catch (error) {
      console.error('خطأ في عملية الإيداع:', error);
      toast.error('حدث خطأ أثناء إيداع المبلغ');
      return false;
    }
  }
  
  /**
   * سحب مبلغ من حساب (نقدي أو بنكي)
   * @param amount المبلغ المراد سحبه
   * @param accountType نوع الحساب (cash = نقدي, bank = بنكي)
   * @param date تاريخ العملية
   * @param notes ملاحظات
   * @param reference رقم مرجعي
   */
  public async withdrawFromAccount(
    amount: number,
    accountType: 'cash' | 'bank',
    date: Date,
    notes: string = '',
    reference: string = ''
  ): Promise<boolean> {
    try {
      // التحقق من صحة المبلغ
      if (amount <= 0) {
        toast.error('يجب أن يكون المبلغ أكبر من صفر');
        return false;
      }
      
      // التحقق من كفاية الرصيد
      const balance = await this.financialBalanceService.getCurrentBalance();
      if (!balance) {
        toast.error('تعذر الحصول على معلومات الرصيد');
        return false;
      }
      
      if (accountType === 'cash' && balance.cash_balance < amount) {
        toast.error('الرصيد النقدي غير كافي');
        return false;
      }
      
      if (accountType === 'bank' && balance.bank_balance < amount) {
        toast.error('الرصيد البنكي غير كافي');
        return false;
      }
      
      // تحديث الرصيد المناسب (إشارة سالبة لأنها عملية سحب)
      if (accountType === 'cash') {
        await this.financialBalanceService.updateCashBalance(-amount, `سحب من الخزينة النقدية: ${notes}`);
      } else {
        await this.financialBalanceService.updateBankBalance(-amount, `سحب من الحساب البنكي: ${notes}`);
      }
      
      // إضافة سجل للعملية
      const operation: Omit<CashOperation, 'id' | 'created_at'> = {
        date: format(date, 'yyyy-MM-dd'),
        amount,
        operation_type: 'withdraw',
        account_type: accountType,
        notes,
        reference
      };
      
      const { data, error } = await supabase
        .from('cash_operations')
        .insert(operation as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // تسجيل معاملة مالية
      const categoryId = 'c0e47d1c-2c9c-4c42-bcb6-ddeabf817fac'; // فئة "مصروفات أخرى" (نقوم بتثبيتها للتبسيط)
      
      await this.transactionService.createTransaction({
        amount,
        type: 'expense',
        date: format(date, 'yyyy-MM-dd'),
        payment_method: accountType,
        category_id: categoryId,
        notes: `سحب من ${accountType === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}: ${notes}`,
        reference_id: data.id,
        reference_type: 'cash_operation'
      });
      
      return true;
    } catch (error) {
      console.error('خطأ في عملية السحب:', error);
      toast.error('حدث خطأ أثناء سحب المبلغ');
      return false;
    }
  }
  
  /**
   * تحويل مبلغ بين الحسابات (نقدي إلى بنكي أو العكس)
   * @param amount المبلغ المراد تحويله
   * @param fromAccount الحساب المصدر
   * @param toAccount الحساب الهدف
   * @param date تاريخ العملية
   * @param notes ملاحظات
   * @param reference رقم مرجعي
   */
  public async transferBetweenAccounts(
    amount: number,
    fromAccount: 'cash' | 'bank',
    toAccount: 'cash' | 'bank',
    date: Date,
    notes: string = '',
    reference: string = ''
  ): Promise<boolean> {
    try {
      // التحقق من صحة المبلغ
      if (amount <= 0) {
        toast.error('يجب أن يكون المبلغ أكبر من صفر');
        return false;
      }
      
      // التحقق من أن الحسابات مختلفة
      if (fromAccount === toAccount) {
        toast.error('لا يمكن التحويل من وإلى نفس الحساب');
        return false;
      }
      
      // التحقق من كفاية الرصيد
      const balance = await this.financialBalanceService.getCurrentBalance();
      if (!balance) {
        toast.error('تعذر الحصول على معلومات الرصيد');
        return false;
      }
      
      if (fromAccount === 'cash' && balance.cash_balance < amount) {
        toast.error('الرصيد النقدي غير كافي');
        return false;
      }
      
      if (fromAccount === 'bank' && balance.bank_balance < amount) {
        toast.error('الرصيد البنكي غير كافي');
        return false;
      }
      
      // إنشاء معاملة في Supabase
      const operation: Omit<CashOperation, 'id' | 'created_at'> = {
        date: format(date, 'yyyy-MM-dd'),
        amount,
        operation_type: 'transfer',
        from_account: fromAccount,
        to_account: toAccount,
        notes,
        reference
      };
      
      const { data, error } = await supabase
        .from('cash_operations')
        .insert(operation as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // تحديث الأرصدة
      if (fromAccount === 'cash') {
        // خصم من النقدي
        await this.financialBalanceService.updateCashBalance(-amount, `تحويل من الخزينة النقدية إلى الحساب البنكي: ${notes}`);
        // إضافة إلى البنكي
        await this.financialBalanceService.updateBankBalance(amount, `تحويل من الخزينة النقدية إلى الحساب البنكي: ${notes}`);
      } else {
        // خصم من البنكي
        await this.financialBalanceService.updateBankBalance(-amount, `تحويل من الحساب البنكي إلى الخزينة النقدية: ${notes}`);
        // إضافة إلى النقدي
        await this.financialBalanceService.updateCashBalance(amount, `تحويل من الحساب البنكي إلى الخزينة النقدية: ${notes}`);
      }
      
      return true;
    } catch (error) {
      console.error('خطأ في عملية التحويل:', error);
      toast.error('حدث خطأ أثناء تحويل المبلغ');
      return false;
    }
  }
  
  /**
   * الحصول على آخر عمليات الخزينة
   * @param limit عدد العمليات المراد الحصول عليها
   */
  public async getRecentCashOperations(limit: number = 10): Promise<CashOperation[]> {
    try {
      const { data, error } = await supabase
        .from('cash_operations')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit) as { data: CashOperation[], error: any };
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('خطأ في جلب عمليات الخزينة:', error);
      toast.error('حدث خطأ أثناء جلب عمليات الخزينة');
      return [];
    }
  }
}

export default CashManagementService;
