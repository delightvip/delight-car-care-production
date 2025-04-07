import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FinancialSummary, Category, Transaction, FinancialBalance } from "./FinancialTypes";
import FinancialTransactionService from "./FinancialTransactionService";
import FinancialCategoryService from "./FinancialCategoryService";
import FinancialReportService from "./FinancialReportService";
import FinancialCommercialBridge from "./FinancialCommercialBridge";
import { format } from "date-fns";

/**
 * الخدمة المالية الرئيسية
 * تقوم بدور واجهة موحدة للوصول إلى كافة خدمات موديول الإدارة المالية
 */
class FinancialService {
  private static instance: FinancialService;
  
  private transactionService: FinancialTransactionService;
  private categoryService: FinancialCategoryService;
  private reportService: FinancialReportService;
  private commercialBridge: FinancialCommercialBridge;
  
  private constructor() {
    this.transactionService = FinancialTransactionService.getInstance();
    this.categoryService = FinancialCategoryService.getInstance();
    this.reportService = FinancialReportService.getInstance();
    this.commercialBridge = FinancialCommercialBridge.getInstance();
  }
  
  public static getInstance(): FinancialService {
    if (!FinancialService.instance) {
      FinancialService.instance = new FinancialService();
    }
    return FinancialService.instance;
  }
  
  // =========== وظائف المعاملات المالية ===========
  
  /**
   * الحصول على المعاملات المالية
   */
  public async getTransactions(
    startDate?: string,
    endDate?: string,
    type?: 'income' | 'expense',
    categoryId?: string
  ): Promise<Transaction[]> {
    return this.transactionService.getTransactions(startDate, endDate, type, categoryId);
  }
  
  /**
   * الحصول على معاملة مالية بواسطة المعرف
   */
  public async getTransactionById(id: string): Promise<Transaction | null> {
    return this.transactionService.getTransactionById(id);
  }
  
  /**
   * إنشاء معاملة مالية جديدة
   */
  public async createTransaction(transactionData: Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'>): Promise<Transaction | null> {
    return this.transactionService.createTransaction(transactionData);
  }
  
  /**
   * تحديث معاملة مالية
   */
  public async updateTransaction(id: string, transactionData: Partial<Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'>>): Promise<boolean> {
    return this.transactionService.updateTransaction(id, transactionData);
  }
  
  /**
   * حذف معاملة مالية
   */
  public async deleteTransaction(id: string): Promise<boolean> {
    return this.transactionService.deleteTransaction(id);
  }
  
  // =========== وظائف الفئات المالية ===========
  
  /**
   * الحصول على الفئات المالية
   */
  public async getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
    return this.categoryService.getCategories(type);
  }
  
  /**
   * الحصول على فئة بواسطة المعرف
   */
  public async getCategoryById(id: string): Promise<Category | null> {
    return this.categoryService.getCategoryById(id);
  }
  
  /**
   * إنشاء فئة جديدة
   */
  public async createCategory(categoryData: Omit<Category, 'id' | 'created_at'>): Promise<Category | null> {
    return this.categoryService.createCategory(categoryData);
  }
  
  /**
   * تحديث فئة
   */
  public async updateCategory(id: string, categoryData: Partial<Omit<Category, 'id' | 'created_at'>>): Promise<boolean> {
    return this.categoryService.updateCategory(id, categoryData);
  }
  
  /**
   * حذف فئة
   */
  public async deleteCategory(id: string): Promise<boolean> {
    return this.categoryService.deleteCategory(id);
  }
  
  // =========== وظائف التقارير المالية ===========
  
  /**
   * الحصول على ملخص مالي
   */
  public async getFinancialSummary(startDate?: string, endDate?: string): Promise<FinancialSummary> {
    return this.reportService.getFinancialSummary(startDate, endDate);
  }
  
  /**
   * الحصول على التدفق النقدي اليومي
   */
  public async getDailyCashFlow(startDate: string, endDate: string): Promise<any[]> {
    return this.reportService.getDailyCashFlow(startDate, endDate);
  }
  
  /**
   * توليد تقرير الإيرادات والمصروفات
   */
  public async generateIncomeExpenseReport(startDate: string, endDate: string): Promise<any> {
    return this.reportService.generateIncomeExpenseReport(startDate, endDate);
  }
  
  // =========== وظائف الربط مع المعاملات التجارية ===========
  
  /**
   * معالجة تأكيد فاتورة تجارية
   */
  public async handleInvoiceConfirmation(invoice: any): Promise<boolean> {
    return this.commercialBridge.handleInvoiceConfirmation(invoice);
  }
  
  /**
   * معالجة تأكيد دفعة تجارية
   */
  public async handlePaymentConfirmation(payment: any): Promise<boolean> {
    return this.commercialBridge.handlePaymentConfirmation(payment);
  }
  
  /**
   * معالجة إلغاء معاملة تجارية
   */
  public async handleCommercialCancellation(
    id: string,
    type: 'invoice' | 'payment',
    commercialType: string,
    amount: number,
    partyName?: string,
    date?: string
  ): Promise<boolean> {
    return this.commercialBridge.handleCommercialCancellation(id, type, commercialType, amount, partyName, date);
  }
  
  /**
   * البحث عن المعاملات المالية المرتبطة بمعاملة تجارية
   */
  public async findLinkedFinancialTransactions(commercialId: string): Promise<any[]> {
    return this.commercialBridge.findLinkedFinancialTransactions(commercialId);
  }
  
  /**
   * تنظيف المعاملات المالية للمرتجعات
   * تستخدم هذه الدالة لحذف أي معاملات مالية مرتبطة بالمرتجعات
   * من أجل إزالة تأثير المرتجعات على لوحة التحكم المالية تمامًا
   */
  public async cleanupReturnFinancialTransactions(): Promise<boolean> {
    return this.commercialBridge.cleanupReturnFinancialTransactions();
  }
  
  /**
   * تهيئة النظام المالي
   * تستخدم هذه الدالة عند بدء تشغيل النظام لتنفيذ أي عمليات تهيئة مطلوبة
   * مثل تنظيف المعاملات المالية المرتبطة بالمرتجعات
   */
  public async initialize(): Promise<void> {
    try {
      console.log('بدء تهيئة النظام المالي...');
      
      // تنظيف المعاملات المالية المرتبطة بالمرتجعات (إزالة تأثير المرتجعات على لوحة التحكم المالية)
      await this.cleanupReturnFinancialTransactions();
      
      console.log('تمت تهيئة النظام المالي بنجاح');
    } catch (error) {
      console.error('حدث خطأ أثناء تهيئة النظام المالي:', error);
    }
  }
  
  // =========== وظائف الأرصدة المالية ===========
  
  /**
   * الحصول على أرصدة الخزينة
   */
  public async getFinancialBalance(): Promise<FinancialBalance | null> {
    try {
      const { data, error } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      return data as FinancialBalance;
    } catch (error) {
      console.error('Error fetching financial balance:', error);
      toast.error('حدث خطأ أثناء جلب أرصدة الخزينة');
      return null;
    }
  }
  
  /**
   * تحديث أرصدة الخزينة يدويًا
   */
  public async updateFinancialBalanceManually(
    cashBalance: number,
    bankBalance: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('financial_balance')
        .update({
          cash_balance: cashBalance,
          bank_balance: bankBalance,
          last_updated: format(new Date(), 'yyyy-MM-dd')
        })
        .eq('id', '1');
      
      if (error) {
        throw error;
      }
      
      toast.success('تم تحديث أرصدة الخزينة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating financial balance manually:', error);
      toast.error('حدث خطأ أثناء تحديث أرصدة الخزينة');
      return false;
    }
  }
}

export default FinancialService;
