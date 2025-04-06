import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FinancialSummary, Transaction } from "./FinancialTypes";
import FinancialTransactionService from "./FinancialTransactionService";

/**
 * خدمة مخصصة للتقارير المالية
 */
class FinancialReportService {
  private static instance: FinancialReportService;
  private transactionService: FinancialTransactionService;
  
  private constructor() {
    this.transactionService = FinancialTransactionService.getInstance();
  }
  
  public static getInstance(): FinancialReportService {
    if (!FinancialReportService.instance) {
      FinancialReportService.instance = new FinancialReportService();
    }
    return FinancialReportService.instance;
  }
  
  /**
   * الحصول على بيانات الأرباح من المبيعات
   * هذه دالة جديدة تستخدم جدول الأرباح لحساب صافي الأرباح من المبيعات
   */
  private async getSalesProfit(startDate?: string, endDate?: string): Promise<{ totalSales: number, totalProfit: number }> {
    try {
      let query = supabase
        .from('profits')
        .select(`
          *,
          invoices!inner (date, invoice_type, status)
        `)
        .eq('invoices.invoice_type', 'sale');
      
      // إضافة شروط التاريخ إذا تم تحديدها
      if (startDate) {
        query = query.gte('invoices.date', startDate);
      }
      
      if (endDate) {
        query = query.lte('invoices.date', endDate);
      }
      
      // التأكد من حالة الفاتورة (معتمدة أو مكتملة)
      query = query.in('invoices.status', ['confirmed', 'completed', 'paid', 'delivered', 'done']);
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching profits data:', error);
        return { totalSales: 0, totalProfit: 0 };
      }
      
      // حساب إجماليات المبيعات والأرباح
      const totalSales = data.reduce((sum, profit) => sum + profit.total_sales, 0);
      const totalProfit = data.reduce((sum, profit) => sum + profit.profit_amount, 0);
      
      console.log(`Fetched profits data: sales=${totalSales}, profits=${totalProfit} for period ${startDate || 'all'} to ${endDate || 'all'}`);
      
      return { totalSales, totalProfit };
    } catch (error) {
      console.error('Error calculating sales profit:', error);
      return { totalSales: 0, totalProfit: 0 };
    }
  }
  
  /**
   * الحصول على ملخص مالي
   */
  public async getFinancialSummary(startDate?: string, endDate?: string): Promise<FinancialSummary> {
    try {
      // جلب المعاملات المالية
      const transactions = await this.transactionService.getTransactions(startDate, endDate);
      
      // الحصول على بيانات أرباح المبيعات من جدول الأرباح
      const salesProfitData = await this.getSalesProfit(startDate, endDate);
      
      // حساب الإجماليات من المعاملات المالية المسجلة
      let totalIncome = 0;
      let totalExpense = 0;
      
      transactions.forEach(transaction => {
        if (transaction.type === 'income') {
          totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
          totalExpense += transaction.amount;
        }
      });
      
      // إضافة صافي الربح من المبيعات إلى إجمالي الدخل (إذا لم يكن مسجلاً بالفعل في المعاملات المالية)
      // نفترض أن بيانات المبيعات قد تكون مسجلة بالفعل في المعاملات، لذلك نضيف فقط صافي الربح
      totalIncome += salesProfitData.totalProfit;
      
      const netProfit = totalIncome - totalExpense;
      
      // جلب أرصدة الخزينة
      const { data: balanceData, error: balanceError } = await supabase
        .from('financial_balance')
        .select('cash_balance, bank_balance')
        .eq('id', '1')
        .maybeSingle();
      
      if (balanceError) {
        throw balanceError;
      }
      
      const cashBalance = balanceData?.cash_balance || 0;
      const bankBalance = balanceData?.bank_balance || 0;
      const totalBalance = cashBalance + bankBalance;
      
      // حساب تحليل الفئات
      const categoryAnalysis = await this.getCategoryAnalysis(transactions);
      
      // الحصول على أحدث المعاملات
      const recentTransactions = transactions.slice(0, 10);
      
      return {
        totalIncome,
        totalExpense,
        netProfit,
        netIncome: netProfit, // Alias for backward compatibility
        cashBalance,
        bankBalance,
        totalBalance,
        categoryAnalysis,
        recentTransactions,
        startDate,
        endDate,
        incomeByCategory: [],
        expenseByCategory: [],
        salesProfit: salesProfitData.totalProfit // إضافة صافي الربح من المبيعات للإيرادات
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      toast.error('حدث خطأ أثناء جلب الملخص المالي');
      
      // إرجاع ملخص فارغ في حالة الخطأ
      return {
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0,
        netIncome: 0,
        cashBalance: 0,
        bankBalance: 0,
        totalBalance: 0,
        categoryAnalysis: [],
        recentTransactions: [],
        startDate,
        endDate,
        incomeByCategory: [],
        expenseByCategory: [],
        salesProfit: 0
      };
    }
  }
  
  /**
   * الحصول على تحليل الفئات
   */
  private async getCategoryAnalysis(transactions: Transaction[]): Promise<any[]> {
    try {
      // تجميع المعاملات حسب الفئة
      const categorySums = transactions.reduce((acc, transaction) => {
        const categoryId = transaction.category_id;
        
        if (!acc[categoryId]) {
          acc[categoryId] = {
            id: categoryId,
            name: transaction.category_name,
            type: transaction.type,
            totalAmount: 0,
            count: 0
          };
        }
        
        acc[categoryId].totalAmount += transaction.amount;
        acc[categoryId].count += 1;
        
        return acc;
      }, {} as Record<string, any>);
      
      // تحويل الكائن إلى مصفوفة وترتيبها حسب المبلغ
      return Object.values(categorySums).sort((a, b) => b.totalAmount - a.totalAmount);
    } catch (error) {
      console.error('Error analyzing categories:', error);
      return [];
    }
  }
  
  /**
   * الحصول على التدفق النقدي اليومي
   */
  public async getDailyCashFlow(startDate: string, endDate: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('date, type, amount')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');
      
      if (error) {
        throw error;
      }
      
      // تجميع المعاملات حسب التاريخ
      const dailyTotals = data.reduce((acc, transaction) => {
        const date = transaction.date;
        
        if (!acc[date]) {
          acc[date] = {
            date,
            income: 0,
            expense: 0
          };
        }
        
        if (transaction.type === 'income') {
          acc[date].income += transaction.amount;
        } else if (transaction.type === 'expense') {
          acc[date].expense += transaction.amount;
        }
        
        return acc;
      }, {} as Record<string, any>);
      
      // تحويل الكائن إلى مصفوفة
      return Object.values(dailyTotals);
    } catch (error) {
      console.error('Error getting daily cash flow:', error);
      toast.error('حدث خطأ أثناء جلب التدفق النقدي اليومي');
      return [];
    }
  }
  
  /**
   * توليد تقرير الإيرادات والمصروفات
   */
  public async generateIncomeExpenseReport(startDate: string, endDate: string): Promise<any> {
    try {
      // الحصول على جميع المعاملات في النطاق الزمني
      const transactions = await this.transactionService.getTransactions(startDate, endDate);
      
      // الحصول على بيانات أرباح المبيعات من جدول الأرباح
      const salesProfitData = await this.getSalesProfit(startDate, endDate);
      
      // تجميع البيانات
      const incomeByCategory: Record<string, number> = {};
      const expenseByCategory: Record<string, number> = {};
      let totalIncome = 0;
      let totalExpense = 0;
      
      transactions.forEach(transaction => {
        const categoryKey = `${transaction.category_id}-${transaction.category_name}`;
        
        if (transaction.type === 'income') {
          incomeByCategory[categoryKey] = (incomeByCategory[categoryKey] || 0) + transaction.amount;
          totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
          expenseByCategory[categoryKey] = (expenseByCategory[categoryKey] || 0) + transaction.amount;
          totalExpense += transaction.amount;
        }
      });
      
      // إضافة أرباح المبيعات كفئة دخل إضافية (إذا لم تكن موجودة بالفعل)
      if (salesProfitData.totalProfit > 0) {
        const salesProfitCategoryKey = 'sales-profit-أرباح المبيعات';
        incomeByCategory[salesProfitCategoryKey] = (incomeByCategory[salesProfitCategoryKey] || 0) + salesProfitData.totalProfit;
        totalIncome += salesProfitData.totalProfit;
      }
      
      // تحويل البيانات لتنسيق مناسب
      const incomeData = Object.entries(incomeByCategory).map(([key, amount]) => {
        const [id, name] = key.split('-');
        return { id, name, amount };
      }).sort((a, b) => b.amount - a.amount);
      
      const expenseData = Object.entries(expenseByCategory).map(([key, amount]) => {
        const [id, name] = key.split('-');
        return { id, name, amount };
      }).sort((a, b) => b.amount - a.amount);
      
      return {
        startDate,
        endDate,
        totalIncome,
        totalExpense,
        netIncome: totalIncome - totalExpense,
        incomeData,
        expenseData,
        salesProfit: salesProfitData.totalProfit // إضافة صافي الربح من المبيعات
      };
    } catch (error) {
      console.error('Error generating income/expense report:', error);
      toast.error('حدث خطأ أثناء إنشاء تقرير الإيرادات والمصروفات');
      return null;
    }
  }
  
  /**
   * توليد تقرير بناءً على معاملات تجارية
   */
  public async generateCommercialLinkedReport(
    startDate: string,
    endDate: string,
    referenceType: string
  ): Promise<any> {
    try {
      // الحصول على المعاملات المرتبطة بالنوع المحدد
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories (name, type)
        `)
        .eq('reference_type', referenceType)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');
      
      if (error) {
        throw error;
      }
      
      const transactions = data.map(item => ({
        id: item.id,
        date: item.date,
        amount: item.amount,
        type: item.type,
        category_id: item.category_id,
        category_name: item.financial_categories?.name || '',
        category_type: item.financial_categories?.type || item.type,
        payment_method: item.payment_method,
        reference_id: item.reference_id,
        reference_type: item.reference_type,
        notes: item.notes
      }));
      
      // تجميع البيانات
      let totalAmount = 0;
      const methodBreakdown: Record<string, number> = {};
      
      transactions.forEach(transaction => {
        totalAmount += transaction.amount;
        methodBreakdown[transaction.payment_method] = (methodBreakdown[transaction.payment_method] || 0) + transaction.amount;
      });
      
      return {
        referenceType,
        startDate,
        endDate,
        totalAmount,
        count: transactions.length,
        methodBreakdown,
        transactions
      };
    } catch (error) {
      console.error('Error generating commercial linked report:', error);
      toast.error('حدث خطأ أثناء إنشاء التقرير المرتبط بالمعاملات التجارية');
      return null;
    }
  }
}

export default FinancialReportService;
