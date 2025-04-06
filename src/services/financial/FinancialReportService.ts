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
}

export default FinancialReportService;
