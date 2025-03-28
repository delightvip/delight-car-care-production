
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
   * الحصول على ملخص مالي
   */
  public async getFinancialSummary(startDate?: string, endDate?: string): Promise<FinancialSummary> {
    try {
      // جلب المعاملات المالية
      const transactions = await this.transactionService.getTransactions(startDate, endDate);
      
      // حساب الإجماليات
      let totalIncome = 0;
      let totalExpenses = 0;
      
      transactions.forEach(transaction => {
        if (transaction.type === 'income') {
          totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
          totalExpenses += transaction.amount;
        }
      });
      
      const netIncome = totalIncome - totalExpenses;
      
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
        totalExpenses,
        netIncome,
        cashBalance,
        bankBalance,
        totalBalance,
        categoryAnalysis,
        recentTransactions,
        startDate,
        endDate
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      toast.error('حدث خطأ أثناء جلب الملخص المالي');
      
      // إرجاع ملخص فارغ في حالة الخطأ
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        cashBalance: 0,
        bankBalance: 0,
        totalBalance: 0,
        categoryAnalysis: [],
        recentTransactions: [],
        startDate,
        endDate
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
        expenseData
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
