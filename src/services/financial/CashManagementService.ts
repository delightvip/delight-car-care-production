
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FinancialBalanceService from "./FinancialBalanceService";
import FinancialTransactionService from "./FinancialTransactionService";
import FinancialCategoryService from "./FinancialCategoryService";

/**
 * خدمة إدارة النقد
 * مسؤولة عن عمليات الإيداع والسحب والتحويل بين الحسابات
 */
class CashManagementService {
  private static instance: CashManagementService;
  private financialBalanceService: FinancialBalanceService;
  private financialTransactionService: FinancialTransactionService;
  private financialCategoryService: FinancialCategoryService;
  
  private constructor() {
    this.financialBalanceService = FinancialBalanceService.getInstance();
    this.financialTransactionService = FinancialTransactionService.getInstance();
    this.financialCategoryService = FinancialCategoryService.getInstance();
  }
  
  public static getInstance(): CashManagementService {
    if (!CashManagementService.instance) {
      CashManagementService.instance = new CashManagementService();
    }
    return CashManagementService.instance;
  }
  
  /**
   * إيداع مبلغ في الخزينة
   * @param account الحساب (cash للنقدي، bank للبنك)
   * @param amount المبلغ
   * @param notes ملاحظات
   * @returns نجاح العملية
   */
  public async deposit(account: 'cash' | 'bank', amount: number, notes: string): Promise<boolean> {
    try {
      // الحصول على فئة الإيداع
      const depositCategory = await this.getOrCreateDepositCategory();
      if (!depositCategory) {
        throw new Error('فشل في الحصول على فئة الإيداع');
      }
      
      // إنشاء معاملة مالية
      const transaction = await this.financialTransactionService.createTransaction({
        type: 'income',
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        category_id: depositCategory.id,
        payment_method: account === 'cash' ? 'cash' : 'bank_transfer',
        notes: notes || `إيداع في ${account === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`
      });
      
      if (!transaction) {
        throw new Error('فشل في إنشاء معاملة مالية');
      }
      
      // تحديث رصيد الخزينة
      let success: boolean;
      if (account === 'cash') {
        success = await this.financialBalanceService.updateCashBalance(amount, `إيداع: ${notes || 'إيداع في الخزينة النقدية'}`);
      } else {
        success = await this.financialBalanceService.updateBankBalance(amount, `إيداع: ${notes || 'إيداع في الحساب البنكي'}`);
      }
      
      if (!success) {
        throw new Error('فشل في تحديث رصيد الخزينة');
      }
      
      // إرسال إشعار بتغيير البيانات المالية
      this.notifyFinancialDataChange('cash_deposit');
      
      return true;
    } catch (error) {
      console.error('Error depositing amount:', error);
      toast.error('حدث خطأ أثناء إيداع المبلغ');
      return false;
    }
  }
  
  /**
   * سحب مبلغ من الخزينة
   * @param account الحساب (cash للنقدي، bank للبنك)
   * @param amount المبلغ
   * @param notes ملاحظات
   * @returns نجاح العملية
   */
  public async withdraw(account: 'cash' | 'bank', amount: number, notes: string): Promise<boolean> {
    try {
      // التحقق من وجود رصيد كافٍ
      const balance = await this.financialBalanceService.getCurrentBalance();
      if (!balance) {
        throw new Error('فشل في الحصول على رصيد الخزينة');
      }
      
      const availableBalance = account === 'cash' ? balance.cash_balance : balance.bank_balance;
      if (amount > availableBalance) {
        toast.error(`الرصيد غير كافٍ. الرصيد المتاح: ${availableBalance.toLocaleString('ar-EG')} جنيه`);
        return false;
      }
      
      // الحصول على فئة السحب
      const withdrawalCategory = await this.getOrCreateWithdrawalCategory();
      if (!withdrawalCategory) {
        throw new Error('فشل في الحصول على فئة السحب');
      }
      
      // إنشاء معاملة مالية
      const transaction = await this.financialTransactionService.createTransaction({
        type: 'expense',
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        category_id: withdrawalCategory.id,
        payment_method: account === 'cash' ? 'cash' : 'bank_transfer',
        notes: notes || `سحب من ${account === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`
      });
      
      if (!transaction) {
        throw new Error('فشل في إنشاء معاملة مالية');
      }
      
      // تحديث رصيد الخزينة
      let success: boolean;
      if (account === 'cash') {
        success = await this.financialBalanceService.updateCashBalance(-amount, `سحب: ${notes || 'سحب من الخزينة النقدية'}`);
      } else {
        success = await this.financialBalanceService.updateBankBalance(-amount, `سحب: ${notes || 'سحب من الحساب البنكي'}`);
      }
      
      if (!success) {
        throw new Error('فشل في تحديث رصيد الخزينة');
      }
      
      // إرسال إشعار بتغيير البيانات المالية
      this.notifyFinancialDataChange('cash_withdrawal');
      
      return true;
    } catch (error) {
      console.error('Error withdrawing amount:', error);
      toast.error('حدث خطأ أثناء سحب المبلغ');
      return false;
    }
  }
  
  /**
   * تحويل مبلغ بين الحسابات
   * @param fromAccount الحساب المصدر (cash للنقدي، bank للبنك)
   * @param toAccount الحساب الوجهة (cash للنقدي، bank للبنك)
   * @param amount المبلغ
   * @param notes ملاحظات
   * @returns نجاح العملية
   */
  public async transfer(
    fromAccount: 'cash' | 'bank', 
    toAccount: 'cash' | 'bank', 
    amount: number, 
    notes: string
  ): Promise<boolean> {
    try {
      // التحقق من أن الحسابين مختلفين
      if (fromAccount === toAccount) {
        toast.error('لا يمكن التحويل إلى نفس الحساب');
        return false;
      }
      
      // التحقق من وجود رصيد كافٍ
      const balance = await this.financialBalanceService.getCurrentBalance();
      if (!balance) {
        throw new Error('فشل في الحصول على رصيد الخزينة');
      }
      
      const availableBalance = fromAccount === 'cash' ? balance.cash_balance : balance.bank_balance;
      if (amount > availableBalance) {
        toast.error(`الرصيد غير كافٍ. الرصيد المتاح: ${availableBalance.toLocaleString('ar-EG')} جنيه`);
        return false;
      }
      
      // الحصول على فئة التحويل
      const transferCategory = await this.getOrCreateTransferCategory();
      if (!transferCategory) {
        throw new Error('فشل في الحصول على فئة التحويل');
      }
      
      // إنشاء معاملتين ماليتين (سحب من المصدر وإيداع في الوجهة)
      // نستخدم نفس الفئة لكليهما ولكن بأنواع مختلفة (expense و income)
      
      // 1. معاملة السحب من المصدر
      const withdrawalTransaction = await this.financialTransactionService.createTransaction({
        type: 'expense',
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        category_id: transferCategory.id,
        payment_method: fromAccount === 'cash' ? 'cash' : 'bank_transfer',
        notes: `سحب للتحويل: ${notes || 'تحويل بين الحسابات'}`
      });
      
      if (!withdrawalTransaction) {
        throw new Error('فشل في إنشاء معاملة السحب');
      }
      
      // 2. معاملة الإيداع في الوجهة
      const depositTransaction = await this.financialTransactionService.createTransaction({
        type: 'income',
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        category_id: transferCategory.id,
        payment_method: toAccount === 'cash' ? 'cash' : 'bank_transfer',
        notes: `إيداع من التحويل: ${notes || 'تحويل بين الحسابات'}`
      });
      
      if (!depositTransaction) {
        throw new Error('فشل في إنشاء معاملة الإيداع');
      }
      
      // تحديث أرصدة الحسابات
      let withdrawSuccess: boolean;
      let depositSuccess: boolean;
      
      // سحب من المصدر
      if (fromAccount === 'cash') {
        withdrawSuccess = await this.financialBalanceService.updateCashBalance(
          -amount, 
          `تحويل من النقدية: ${notes || 'تحويل بين الحسابات'}`
        );
      } else {
        withdrawSuccess = await this.financialBalanceService.updateBankBalance(
          -amount, 
          `تحويل من البنك: ${notes || 'تحويل بين الحسابات'}`
        );
      }
      
      // إيداع في الوجهة
      if (toAccount === 'cash') {
        depositSuccess = await this.financialBalanceService.updateCashBalance(
          amount, 
          `تحويل إلى النقدية: ${notes || 'تحويل بين الحسابات'}`
        );
      } else {
        depositSuccess = await this.financialBalanceService.updateBankBalance(
          amount, 
          `تحويل إلى البنك: ${notes || 'تحويل بين الحسابات'}`
        );
      }
      
      if (!withdrawSuccess || !depositSuccess) {
        throw new Error('فشل في تحديث أرصدة الحسابات');
      }
      
      // إرسال إشعار بتغيير البيانات المالية
      this.notifyFinancialDataChange('cash_transfer');
      
      return true;
    } catch (error) {
      console.error('Error transferring amount:', error);
      toast.error('حدث خطأ أثناء تحويل المبلغ');
      return false;
    }
  }
  
  /**
   * الحصول على أو إنشاء فئة الإيداع
   * @returns فئة الإيداع
   */
  private async getOrCreateDepositCategory() {
    // البحث عن فئة الإيداع النقدي
    const categories = await this.financialCategoryService.getCategories('income');
    const depositCategory = categories.find(cat => 
      cat.name.includes('إيداع') || 
      cat.name.includes('نقدي') || 
      cat.name.includes('تحويل')
    );
    
    if (depositCategory) {
      return depositCategory;
    }
    
    // إنشاء فئة جديدة إذا لم تجد
    return this.financialCategoryService.createCategory({
      name: 'إيداع نقدي',
      type: 'income',
      description: 'إيداعات نقدية في الخزينة'
    });
  }
  
  /**
   * الحصول على أو إنشاء فئة السحب
   * @returns فئة السحب
   */
  private async getOrCreateWithdrawalCategory() {
    // البحث عن فئة السحب النقدي
    const categories = await this.financialCategoryService.getCategories('expense');
    const withdrawalCategory = categories.find(cat => 
      cat.name.includes('سحب') || 
      cat.name.includes('نقدي') || 
      cat.name.includes('تحويل')
    );
    
    if (withdrawalCategory) {
      return withdrawalCategory;
    }
    
    // إنشاء فئة جديدة إذا لم تجد
    return this.financialCategoryService.createCategory({
      name: 'سحب نقدي',
      type: 'expense',
      description: 'سحب نقدي من الخزينة'
    });
  }
  
  /**
   * الحصول على أو إنشاء فئة التحويل
   * @returns فئة التحويل
   */
  private async getOrCreateTransferCategory() {
    // البحث عن فئة التحويل بين الحسابات
    const categories = await this.financialCategoryService.getCategories();
    const transferCategory = categories.find(cat => 
      cat.name.includes('تحويل') || 
      cat.name.includes('نقل') || 
      cat.name.includes('حساب')
    );
    
    if (transferCategory) {
      return transferCategory;
    }
    
    // إنشاء فئة جديدة إذا لم تجد
    return this.financialCategoryService.createCategory({
      name: 'تحويل بين الحسابات',
      type: 'expense', // نوع الفئة لا يهم كثيرًا هنا لأننا سنستخدمها للإيداع والسحب
      description: 'تحويلات بين الحسابات النقدية والبنكية'
    });
  }
  
  /**
   * إرسال إشعار بتغيير البيانات المالية
   * @param source مصدر التغيير
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

export default CashManagementService;
