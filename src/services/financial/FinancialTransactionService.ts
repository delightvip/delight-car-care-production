import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Transaction, Category } from './FinancialTypes';

// Interface for transaction creation
export interface TransactionCreateData {
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string;
  payment_method: string;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  is_reduction?: boolean;
}

class FinancialTransactionService {
  private static instance: FinancialTransactionService;
  
  private constructor() {}
  
  public static getInstance(): FinancialTransactionService {
    if (!FinancialTransactionService.instance) {
      FinancialTransactionService.instance = new FinancialTransactionService();
    }
    return FinancialTransactionService.instance;
  }
  
  public async getTransactions(): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories:category_id (
            name,
            type
          )
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(transaction => ({
        id: transaction.id,
        date: transaction.date,
        amount: transaction.amount,
        type: transaction.type as 'income' | 'expense',
        category_id: transaction.category_id,
        category_name: transaction.financial_categories?.name || '',
        category_type: transaction.financial_categories?.type || '',
        payment_method: transaction.payment_method,
        reference_id: transaction.reference_id,
        reference_type: transaction.reference_type,
        notes: transaction.notes,
        created_at: transaction.created_at,
        is_reduction: transaction.is_reduction || false
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('حدث خطأ أثناء جلب المعاملات المالية');
      return [];
    }
  }
  
  public async getTransactionById(id: string): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories:category_id (
            name,
            type
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        date: data.date,
        amount: data.amount,
        type: data.type as 'income' | 'expense',
        category_id: data.category_id,
        category_name: data.financial_categories?.name || '',
        category_type: data.financial_categories?.type || '',
        payment_method: data.payment_method,
        reference_id: data.reference_id,
        reference_type: data.reference_type,
        notes: data.notes,
        created_at: data.created_at,
        is_reduction: data.is_reduction || false
      };
    } catch (error) {
      console.error(`Error fetching transaction ${id}:`, error);
      return null;
    }
  }
  
  public async createTransaction(transactionData: TransactionCreateData): Promise<Transaction | null> {
    try {
      // Check if category exists
      const category = await this.getCategoryById(transactionData.category_id);
      
      if (!category) {
        toast.error('فئة المعاملة غير موجودة');
        return null;
      }
      
      // Validate amount
      if (transactionData.amount <= 0) {
        toast.error('يجب أن يكون مبلغ المعاملة أكبر من صفر');
        return null;
      }
      
      // Add transaction
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({
          date: transactionData.date,
          amount: transactionData.amount,
          type: transactionData.type,
          category_id: transactionData.category_id,
          payment_method: transactionData.payment_method,
          reference_id: transactionData.reference_id,
          reference_type: transactionData.reference_type,
          notes: transactionData.notes,
          is_reduction: transactionData.is_reduction || false
        })
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Update financial balance
      if (transactionData.type === 'income') {
        await this.updateFinancialBalance(transactionData.amount, 0);
      } else {
        await this.updateFinancialBalance(-transactionData.amount, 0);
      }
      
      // Format response
      return {
        id: data.id,
        date: data.date,
        amount: data.amount,
        type: data.type as 'income' | 'expense',
        category_id: data.category_id,
        category_name: category.name,
        category_type: category.type,
        payment_method: data.payment_method,
        reference_id: data.reference_id,
        reference_type: data.reference_type,
        notes: data.notes,
        created_at: data.created_at,
        is_reduction: data.is_reduction || false
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('حدث خطأ أثناء إنشاء المعاملة المالية');
      return null;
    }
  }
  
  // Add the createTransactionFromCommercial method that was missing
  public async createTransactionFromCommercial(
    amount: number,
    type: 'income' | 'expense',
    categoryId: string,
    referenceId: string,
    referenceType: string,
    notes?: string,
    isReduction?: boolean
  ): Promise<Transaction | null> {
    try {
      // Get today's date in ISO format
      const today = new Date().toISOString().split('T')[0];
      
      // Create transaction data
      const transactionData: TransactionCreateData = {
        date: today,
        amount,
        type,
        category_id: categoryId,
        payment_method: 'cash',
        reference_id: referenceId,
        reference_type: referenceType,
        notes,
        is_reduction: isReduction
      };
      
      // Create transaction
      return await this.createTransaction(transactionData);
    } catch (error) {
      console.error('Error creating transaction from commercial:', error);
      toast.error('حدث خطأ أثناء إنشاء المعاملة المالية من التجارية');
      return null;
    }
  }
  
  public async updateFinancialBalance(income: number, expense: number): Promise<void> {
    try {
      // Get current balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('financial_balance')
        .select('*')
        .single();
      
      if (balanceError) throw balanceError;
      
      let cashBalance = balanceData?.cash_balance || 0;
      let bankBalance = balanceData?.bank_balance || 0;
      
      // Update balance
      cashBalance += income - expense;
      
      // Update database
      const { error: updateError } = await supabase
        .from('financial_balance')
        .update({
          cash_balance: cashBalance,
          bank_balance: bankBalance,
          last_updated: new Date().toISOString()
        })
        .eq('id', balanceData?.id);
      
      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating financial balance:', error);
      toast.error('حدث خطأ أثناء تحديث الرصيد المالي');
    }
  }
  
  public async getCategoryById(id: string): Promise<Category | null> {
    try {
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
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      return null;
    }
  }
  
  public async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data.map(category => ({
        id: category.id,
        name: category.name,
        type: category.type as 'income' | 'expense',
        description: category.description,
        created_at: category.created_at
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('حدث خطأ أثناء جلب فئات المعاملات المالية');
      return [];
    }
  }
  
  public async createCategory(name: string, type: 'income' | 'expense', description?: string): Promise<Category | null> {
    try {
      // Validate category name
      if (!name) {
        toast.error('يجب إدخال اسم الفئة');
        return null;
      }
      
      // Add category
      const { data, error } = await supabase
        .from('financial_categories')
        .insert({
          name: name,
          type: type,
          description: description
        })
        .select('*')
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        type: data.type as 'income' | 'expense',
        description: data.description,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('حدث خطأ أثناء إنشاء فئة المعاملة المالية');
      return null;
    }
  }
  
  public async updateCategory(id: string, name: string, type: 'income' | 'expense', description?: string): Promise<Category | null> {
    try {
      // Validate category name
      if (!name) {
        toast.error('يجب إدخال اسم الفئة');
        return null;
      }
      
      // Update category
      const { data, error } = await supabase
        .from('financial_categories')
        .update({
          name: name,
          type: type,
          description: description
        })
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        type: data.type as 'income' | 'expense',
        description: data.description,
        created_at: data.created_at
      };
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      toast.error('حدث خطأ أثناء تحديث فئة المعاملة المالية');
      return null;
    }
  }
  
  public async deleteCategory(id: string): Promise<boolean> {
    try {
      // Delete category
      const { error } = await supabase
        .from('financial_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      toast.error('حدث خطأ أثناء حذف فئة المعاملة المالية');
      return false;
    }
  }
  
  public async deleteTransaction(id: string): Promise<boolean> {
    try {
      // Get transaction
      const transaction = await this.getTransactionById(id);
      
      if (!transaction) {
        toast.error('المعاملة المالية غير موجودة');
        return false;
      }
      
      // Delete transaction
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update financial balance
      if (transaction.type === 'income') {
        await this.updateFinancialBalance(-transaction.amount, 0);
      } else {
        await this.updateFinancialBalance(transaction.amount, 0);
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting transaction ${id}:`, error);
      toast.error('حدث خطأ أثناء حذف المعاملة المالية');
      return false;
    }
  }
}

export default FinancialTransactionService;
