
import { supabase } from '@/integrations/supabase/client';

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category_id: string;
  category_name: string;
  amount: number;
  payment_method: 'cash' | 'bank' | 'other';
  notes?: string;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  created_at?: string;
}

export interface FinancialBalance {
  cash_balance: number;
  bank_balance: number;
  total_balance: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  balance: FinancialBalance;
  recentTransactions: Transaction[];
}

export default class FinancialService {
  private static instance: FinancialService;

  private constructor() {}

  public static getInstance(): FinancialService {
    if (!FinancialService.instance) {
      FinancialService.instance = new FinancialService();
    }
    return FinancialService.instance;
  }

  // Transactions methods
  public async getTransactions(
    startDate?: string,
    endDate?: string,
    type?: 'income' | 'expense',
    categoryId?: string,
    limit?: number
  ): Promise<Transaction[]> {
    let query = supabase
      .from('financial_transactions')
      .select(`
        id,
        date,
        type,
        category_id,
        amount,
        payment_method,
        notes,
        reference_id,
        reference_type,
        created_at,
        financial_categories:category_id(name)
      `)
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      date: item.date,
      type: item.type as 'income' | 'expense',
      category_id: item.category_id,
      category_name: item.financial_categories?.name || '',
      amount: item.amount,
      payment_method: item.payment_method as 'cash' | 'bank' | 'other',
      notes: item.notes,
      reference_id: item.reference_id,
      reference_type: item.reference_type,
      created_at: item.created_at
    }));
  }

  // Categories methods
  public async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('financial_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return (data || []).map(item => ({
      ...item,
      type: item.type as 'income' | 'expense'
    }));
  }

  public async getCategory(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('financial_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching category:', error);
      return null;
    }

    return {
      ...data,
      type: data.type as 'income' | 'expense'
    };
  }

  public async createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category | null> {
    const { data, error } = await supabase
      .from('financial_categories')
      .insert(category)
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return null;
    }

    return {
      ...data,
      type: data.type as 'income' | 'expense'
    };
  }

  public async updateCategory(id: string, category: Partial<Category>): Promise<Category | null> {
    const { data, error } = await supabase
      .from('financial_categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return null;
    }

    return {
      ...data,
      type: data.type as 'income' | 'expense'
    };
  }

  public async deleteCategory(id: string): Promise<boolean> {
    // First check if the category is being used in any transactions
    const { data: transactions, error: checkError } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking for category usage:', checkError);
      return false;
    }

    // If category is in use, don't delete it
    if (transactions && transactions.length > 0) {
      console.error('Cannot delete category that is being used in transactions');
      return false;
    }

    const { error } = await supabase
      .from('financial_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return false;
    }

    return true;
  }

  // Transaction CRUD methods
  public async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'category_name'>): Promise<Transaction | null> {
    // Update financial balance based on transaction type and payment method
    if (transaction.payment_method !== 'other') {
      await this.updateBalance(
        transaction.type === 'income' ? transaction.amount : -transaction.amount,
        transaction.payment_method
      );
    }

    const { data, error } = await supabase
      .from('financial_transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      return null;
    }

    // Fetch the category name
    const { data: category } = await supabase
      .from('financial_categories')
      .select('name')
      .eq('id', transaction.category_id)
      .single();

    return {
      ...data,
      type: data.type as 'income' | 'expense',
      payment_method: data.payment_method as 'cash' | 'bank' | 'other',
      category_name: category?.name || ''
    };
  }

  public async updateTransaction(
    id: string, 
    transaction: Partial<Omit<Transaction, 'id' | 'created_at' | 'category_name'>>
  ): Promise<Transaction | null> {
    // Get the original transaction to calculate balance adjustments
    const { data: original, error: getError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !original) {
      console.error('Error fetching original transaction:', getError);
      return null;
    }

    // Update financial balance based on changes in amount, type, or payment method
    if (
      (transaction.amount !== undefined && transaction.amount !== original.amount) ||
      (transaction.type !== undefined && transaction.type !== original.type) ||
      (transaction.payment_method !== undefined && transaction.payment_method !== original.payment_method)
    ) {
      // Reverse the original transaction impact on balance
      if (original.payment_method !== 'other') {
        await this.updateBalance(
          original.type === 'income' ? -original.amount : original.amount,
          original.payment_method as 'cash' | 'bank'
        );
      }

      // Apply the new transaction impact on balance
      if ((transaction.payment_method || original.payment_method) !== 'other') {
        await this.updateBalance(
          (transaction.type || original.type) === 'income' 
            ? (transaction.amount || original.amount) 
            : -(transaction.amount || original.amount),
          (transaction.payment_method || original.payment_method) as 'cash' | 'bank'
        );
      }
    }

    const { data, error } = await supabase
      .from('financial_transactions')
      .update(transaction)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      return null;
    }

    // Fetch the category name
    const { data: category } = await supabase
      .from('financial_categories')
      .select('name')
      .eq('id', data.category_id)
      .single();

    return {
      ...data,
      type: data.type as 'income' | 'expense',
      payment_method: data.payment_method as 'cash' | 'bank' | 'other',
      category_name: category?.name || ''
    };
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    // Get the transaction to calculate balance adjustments
    const { data: transaction, error: getError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !transaction) {
      console.error('Error fetching transaction for deletion:', getError);
      return false;
    }

    // Reverse the transaction impact on balance
    if (transaction.payment_method !== 'other') {
      await this.updateBalance(
        transaction.type === 'income' ? -transaction.amount : transaction.amount,
        transaction.payment_method as 'cash' | 'bank'
      );
    }

    const { error } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }

    return true;
  }

  // Balance management
  private async updateBalance(amount: number, method: 'cash' | 'bank'): Promise<boolean> {
    // Get current balance
    const { data: currentBalance, error: getError } = await supabase
      .from('financial_balance')
      .select('*')
      .eq('id', '1')
      .single();

    if (getError) {
      console.error('Error getting current balance:', getError);
      return false;
    }

    // Update based on payment method
    const updates = method === 'cash'
      ? { cash_balance: currentBalance.cash_balance + amount }
      : { bank_balance: currentBalance.bank_balance + amount };

    const { error: updateError } = await supabase
      .from('financial_balance')
      .update(updates)
      .eq('id', '1');

    if (updateError) {
      console.error('Error updating balance:', updateError);
      return false;
    }

    return true;
  }

  // Get current balance
  public async getBalance(): Promise<FinancialBalance> {
    const { data, error } = await supabase
      .from('financial_balance')
      .select('*')
      .eq('id', '1')
      .single();

    if (error) {
      console.error('Error getting balance:', error);
      return { cash_balance: 0, bank_balance: 0, total_balance: 0 };
    }

    return {
      cash_balance: data.cash_balance || 0,
      bank_balance: data.bank_balance || 0,
      total_balance: (data.cash_balance || 0) + (data.bank_balance || 0)
    };
  }

  // Get financial summary for dashboard
  public async getFinancialSummary(startDate?: string, endDate?: string): Promise<FinancialSummary> {
    // Get all transactions for the period
    const transactions = await this.getTransactions(startDate, endDate);
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Get current balance
    const balance = await this.getBalance();
    
    // Get recent transactions for the dashboard
    const recentTransactions = await this.getTransactions(undefined, undefined, undefined, undefined, 5);
    
    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      balance,
      recentTransactions
    };
  }
}
