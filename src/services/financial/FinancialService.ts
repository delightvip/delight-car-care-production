
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ErrorHandler } from '@/utils/errorHandler';

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
    return ErrorHandler.wrapOperation(
      async () => {
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

        if (error) throw error;

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
      },
      "getTransactions",
      "حدث خطأ أثناء جلب المعاملات المالية",
      []
    ) as Promise<Transaction[]>;
  }

  // Categories methods
  public async getCategories(): Promise<Category[]> {
    return ErrorHandler.wrapOperation(
      async () => {
        const { data, error } = await supabase
          .from('financial_categories')
          .select('*')
          .order('name');

        if (error) throw error;

        return (data || []).map(item => ({
          id: item.id,
          name: item.name,
          type: item.type as 'income' | 'expense',
          description: item.description,
          created_at: item.created_at
        }));
      },
      "getCategories",
      "حدث خطأ أثناء جلب فئات المعاملات المالية",
      []
    ) as Promise<Category[]>;
  }

  public async getCategory(id: string): Promise<Category | null> {
    return ErrorHandler.wrapOperation(
      async () => {
        const { data, error } = await supabase
          .from('financial_categories')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        return {
          id: data.id,
          name: data.name,
          type: data.type as 'income' | 'expense',
          description: data.description,
          created_at: data.created_at
        };
      },
      "getCategory",
      "حدث خطأ أثناء جلب فئة المعاملة المالية",
      null
    ) as Promise<Category | null>;
  }

  public async createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category | null> {
    return ErrorHandler.wrapOperation(
      async () => {
        const { data, error } = await supabase
          .from('financial_categories')
          .insert(category)
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          name: data.name,
          type: data.type as 'income' | 'expense',
          description: data.description,
          created_at: data.created_at
        };
      },
      "createCategory",
      "حدث خطأ أثناء إنشاء فئة المعاملة المالية",
      null
    ) as Promise<Category | null>;
  }

  public async updateCategory(id: string, category: Partial<Omit<Category, 'id' | 'created_at'>>): Promise<Category | null> {
    return ErrorHandler.wrapOperation(
      async () => {
        const { data, error } = await supabase
          .from('financial_categories')
          .update(category)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          name: data.name,
          type: data.type as 'income' | 'expense',
          description: data.description,
          created_at: data.created_at
        };
      },
      "updateCategory",
      "حدث خطأ أثناء تحديث فئة المعاملة المالية",
      null
    ) as Promise<Category | null>;
  }

  public async deleteCategory(id: string): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      async () => {
        // First check if the category is being used in any transactions
        const { data: transactions, error: checkError } = await supabase
          .from('financial_transactions')
          .select('id')
          .eq('category_id', id)
          .limit(1);

        if (checkError) throw checkError;

        // If category is in use, don't delete it
        if (transactions && transactions.length > 0) {
          throw new Error('Cannot delete category that is being used in transactions');
        }

        const { error } = await supabase
          .from('financial_categories')
          .delete()
          .eq('id', id);

        if (error) throw error;

        return true;
      },
      "deleteCategory",
      "حدث خطأ أثناء حذف فئة المعاملة المالية",
      false
    ) as Promise<boolean>;
  }

  // Transaction CRUD methods
  public async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'category_name'>): Promise<Transaction | null> {
    return ErrorHandler.wrapOperation(
      async () => {
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

        if (error) throw error;

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
        } as Transaction;
      },
      "createTransaction",
      "حدث خطأ أثناء إنشاء المعاملة المالية",
      null
    ) as Promise<Transaction | null>;
  }

  public async updateTransaction(
    id: string, 
    transaction: Partial<Omit<Transaction, 'id' | 'created_at' | 'category_name'>>
  ): Promise<Transaction | null> {
    return ErrorHandler.wrapOperation(
      async () => {
        // Get the original transaction to calculate balance adjustments
        const { data: original, error: getError } = await supabase
          .from('financial_transactions')
          .select('*')
          .eq('id', id)
          .single();

        if (getError || !original) throw getError || new Error('Transaction not found');

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

        if (error) throw error;

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
        } as Transaction;
      },
      "updateTransaction",
      "حدث خطأ أثناء تحديث المعاملة المالية",
      null
    ) as Promise<Transaction | null>;
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      async () => {
        // Get the transaction to calculate balance adjustments
        const { data: transaction, error: getError } = await supabase
          .from('financial_transactions')
          .select('*')
          .eq('id', id)
          .single();

        if (getError || !transaction) throw getError || new Error('Transaction not found');

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

        if (error) throw error;

        return true;
      },
      "deleteTransaction",
      "حدث خطأ أثناء حذف المعاملة المالية",
      false
    ) as Promise<boolean>;
  }

  // تحديث رصيد الخزينة
  public async updateBalance(amount: number, method: 'cash' | 'bank'): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      async () => {
        // Get current balance
        const { data: currentBalance, error: getError } = await supabase
          .from('financial_balance')
          .select('*')
          .eq('id', '1')
          .single();

        if (getError) throw getError;

        // Update based on payment method
        const updates = method === 'cash'
          ? { cash_balance: currentBalance.cash_balance + amount }
          : { bank_balance: currentBalance.bank_balance + amount };

        const { error: updateError } = await supabase
          .from('financial_balance')
          .update(updates)
          .eq('id', '1');

        if (updateError) throw updateError;

        return true;
      },
      "updateBalance",
      "حدث خطأ أثناء تحديث رصيد الخزينة",
      false
    ) as Promise<boolean>;
  }

  // Get current balance
  public async getBalance(): Promise<FinancialBalance> {
    return ErrorHandler.wrapOperation(
      async () => {
        const { data, error } = await supabase
          .from('financial_balance')
          .select('*')
          .eq('id', '1')
          .single();

        if (error) throw error;

        return {
          cash_balance: data.cash_balance || 0,
          bank_balance: data.bank_balance || 0,
          total_balance: (data.cash_balance || 0) + (data.bank_balance || 0)
        };
      },
      "getBalance",
      "حدث خطأ أثناء جلب رصيد الخزينة",
      { cash_balance: 0, bank_balance: 0, total_balance: 0 }
    ) as Promise<FinancialBalance>;
  }

  // Get financial summary for dashboard
  public async getFinancialSummary(startDate?: string, endDate?: string): Promise<FinancialSummary> {
    return ErrorHandler.wrapOperation(
      async () => {
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
      },
      "getFinancialSummary",
      "حدث خطأ أثناء جلب ملخص البيانات المالية",
      {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        balance: { cash_balance: 0, bank_balance: 0, total_balance: 0 },
        recentTransactions: []
      }
    ) as Promise<FinancialSummary>;
  }
}
