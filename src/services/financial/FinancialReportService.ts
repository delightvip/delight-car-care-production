
import { supabase } from '@/integrations/supabase/client';
import { FinancialSummary, Transaction } from './FinancialTypes';
import { format, subMonths, parseISO } from 'date-fns';

class FinancialReportService {
  private static instance: FinancialReportService;

  private constructor() {}

  public static getInstance(): FinancialReportService {
    if (!FinancialReportService.instance) {
      FinancialReportService.instance = new FinancialReportService();
    }
    return FinancialReportService.instance;
  }

  public async getFinancialSummary(startDate?: string, endDate?: string): Promise<FinancialSummary> {
    // Default to current month if dates not provided
    const currentDate = new Date();
    const defaultEndDate = format(currentDate, 'yyyy-MM-dd');
    const defaultStartDate = format(subMonths(currentDate, 1), 'yyyy-MM-dd');
    
    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || defaultEndDate;

    try {
      // Get total income
      const { data: incomeData, error: incomeError } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'income');
      
      if (incomeError) throw incomeError;
      
      // Get total expense
      const { data: expenseData, error: expenseError } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'expense');
      
      if (expenseError) throw expenseError;
      
      // Calculate totals
      const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0);
      const totalExpense = expenseData.reduce((sum, item) => sum + item.amount, 0);
      const netProfit = totalIncome - totalExpense;
      
      // Get period transactions
      const { data: periodIncomeData, error: periodIncomeError } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'income')
        .gte('date', effectiveStartDate)
        .lte('date', effectiveEndDate);
      
      if (periodIncomeError) throw periodIncomeError;
      
      const { data: periodExpenseData, error: periodExpenseError } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'expense')
        .gte('date', effectiveStartDate)
        .lte('date', effectiveEndDate);
      
      if (periodExpenseError) throw periodExpenseError;
      
      // Calculate period totals
      const periodIncome = periodIncomeData.reduce((sum, item) => sum + item.amount, 0);
      const periodExpense = periodExpenseData.reduce((sum, item) => sum + item.amount, 0);
      const periodProfit = periodIncome - periodExpense;
      
      // Get financial balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('financial_balance')
        .select('*')
        .single();
      
      if (balanceError && balanceError.code !== 'PGRST116') throw balanceError;
      
      const cashBalance = balanceData?.cash_balance || 0;
      const bankBalance = balanceData?.bank_balance || 0;
      const totalBalance = cashBalance + bankBalance;
      
      // Get recent transactions
      const { data: recentTransactions, error: recentTransactionsError } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories:category_id (
            name,
            type
          )
        `)
        .order('date', { ascending: false })
        .limit(10);
      
      if (recentTransactionsError) throw recentTransactionsError;
      
      // Format recent transactions
      const formattedTransactions = recentTransactions.map((transaction) => {
        return {
          id: transaction.id,
          date: transaction.date,
          amount: transaction.amount,
          type: transaction.type,
          category_id: transaction.category_id,
          category_name: transaction.financial_categories?.name || '',
          category_type: transaction.financial_categories?.type || '',
          payment_method: transaction.payment_method,
          reference_id: transaction.reference_id,
          reference_type: transaction.reference_type,
          notes: transaction.notes,
          created_at: transaction.created_at,
          is_reduction: transaction.is_reduction || false
        };
      });
      
      return {
        totalIncome,
        totalExpense,
        netProfit,
        periodIncome,
        periodExpense, 
        periodProfit,
        netIncome: netProfit,
        cashBalance,
        bankBalance,
        totalBalance,
        categoryAnalysis: [],
        recentTransactions: formattedTransactions as Transaction[],
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        incomeByCategory: [],
        expenseByCategory: []
      };
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      
      // Return empty summary on error
      return {
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0,
        periodIncome: 0,
        periodExpense: 0,
        periodProfit: 0,
        netIncome: 0,
        cashBalance: 0,
        bankBalance: 0,
        totalBalance: 0,
        categoryAnalysis: [],
        recentTransactions: [],
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        incomeByCategory: [],
        expenseByCategory: []
      };
    }
  }

  // Add the missing methods that FinancialService is trying to call
  public async getDailyCashFlow(startDate: string, endDate: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
        
      if (error) throw error;
      
      // Group transactions by date
      const cashFlowByDate = new Map();
      
      // Initialize with all dates in the range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayMilliseconds = 24 * 60 * 60 * 1000;
      
      for (let date = start; date <= end; date = new Date(date.getTime() + dayMilliseconds)) {
        const dateString = format(date, 'yyyy-MM-dd');
        cashFlowByDate.set(dateString, {
          date: dateString,
          income: 0,
          expense: 0,
          balance: 0
        });
      }
      
      // Sum transactions by date
      data.forEach(transaction => {
        const dateKey = transaction.date;
        const entry = cashFlowByDate.get(dateKey) || {
          date: dateKey,
          income: 0,
          expense: 0,
          balance: 0
        };
        
        if (transaction.type === 'income') {
          entry.income += transaction.amount;
        } else {
          entry.expense += transaction.amount;
        }
        
        cashFlowByDate.set(dateKey, entry);
      });
      
      // Convert map to array and calculate balance
      let runningBalance = 0;
      const result = Array.from(cashFlowByDate.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(day => {
          runningBalance += day.income - day.expense;
          return {
            ...day,
            balance: runningBalance
          };
        });
      
      return result;
      
    } catch (error) {
      console.error('Error getting daily cash flow:', error);
      return [];
    }
  }
  
  public async generateIncomeExpenseReport(startDate: string, endDate: string): Promise<any> {
    try {
      // Get transactions within date range
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories:category_id (
            name,
            type
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate);
        
      if (error) throw error;
      
      // Group transactions by category
      const incomeByCategory = new Map();
      const expenseByCategory = new Map();
      
      data.forEach(transaction => {
        const categoryName = transaction.financial_categories?.name || 'غير مصنف';
        const categoryId = transaction.category_id;
        
        if (transaction.type === 'income') {
          const current = incomeByCategory.get(categoryId) || { 
            id: categoryId,
            name: categoryName,
            amount: 0,
            count: 0
          };
          
          current.amount += transaction.amount;
          current.count += 1;
          incomeByCategory.set(categoryId, current);
        } else {
          const current = expenseByCategory.get(categoryId) || { 
            id: categoryId,
            name: categoryName,
            amount: 0,
            count: 0
          };
          
          current.amount += transaction.amount;
          current.count += 1;
          expenseByCategory.set(categoryId, current);
        }
      });
      
      // Calculate totals
      const totalIncome = Array.from(incomeByCategory.values()).reduce((sum, cat) => sum + cat.amount, 0);
      const totalExpense = Array.from(expenseByCategory.values()).reduce((sum, cat) => sum + cat.amount, 0);
      
      // Add percentage to each category
      const incomeCategories = Array.from(incomeByCategory.values()).map(cat => ({
        ...cat,
        percentage: totalIncome > 0 ? (cat.amount / totalIncome) * 100 : 0
      }));
      
      const expenseCategories = Array.from(expenseByCategory.values()).map(cat => ({
        ...cat,
        percentage: totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0
      }));
      
      return {
        startDate,
        endDate,
        incomeByCategory: incomeCategories,
        expenseByCategory: expenseCategories,
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense
      };
      
    } catch (error) {
      console.error('Error generating income expense report:', error);
      return {
        startDate,
        endDate,
        incomeByCategory: [],
        expenseByCategory: [],
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0
      };
    }
  }
}

export default FinancialReportService;
