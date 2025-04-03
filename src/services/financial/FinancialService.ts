
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Transaction, Category, FinancialSummary } from './FinancialTypes';
import { Invoice } from '@/services/commercial/CommercialTypes';

class FinancialService {
  private static instance: FinancialService;

  private constructor() {}

  public static getInstance(): FinancialService {
    if (!FinancialService.instance) {
      FinancialService.instance = new FinancialService();
    }
    return FinancialService.instance;
  }

  /**
   * Record a financial transaction
   */
  async recordTransaction(transactionData: {
    date: string;
    account_id?: string;
    type: string;
    amount: number;
    description: string;
    reference_id: string;
    reference_type: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .insert({
          date: transactionData.date,
          category_id: transactionData.account_id || '00000000-0000-0000-0000-000000000000',
          type: transactionData.type,
          amount: transactionData.amount,
          payment_method: 'cash', // Default value
          reference_id: transactionData.reference_id,
          reference_type: transactionData.reference_type,
          notes: transactionData.description
        });

      if (error) throw error;
      
      // Update financial balance
      await this.updateFinancialBalance(transactionData.amount, transactionData.type);
      
      return true;
    } catch (error) {
      console.error('Error recording financial transaction:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة المالية');
      return false;
    }
  }
  
  /**
   * Update financial balance
   */
  private async updateFinancialBalance(amount: number, transactionType: string): Promise<boolean> {
    try {
      const { data: balance, error: fetchError } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .single();
      
      if (fetchError) throw fetchError;
      
      let newCashBalance = balance?.cash_balance || 0;
      
      // Update cash balance based on transaction type
      if (transactionType === 'receipt' || transactionType === 'sales_return' || transactionType === 'income') {
        newCashBalance += amount;
      } else if (transactionType === 'payment' || transactionType === 'purchase_return' || transactionType === 'expense') {
        newCashBalance -= amount;
      } else if (transactionType === 'receipt_cancellation') {
        newCashBalance -= Math.abs(amount);
      } else if (transactionType === 'payment_cancellation') {
        newCashBalance += Math.abs(amount);
      }
      
      const { error: updateError } = await supabase
        .from('financial_balance')
        .update({ 
          cash_balance: newCashBalance,
          last_updated: new Date().toISOString()
        })
        .eq('id', '1');
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error('Error updating financial balance:', error);
      return false;
    }
  }
  
  /**
   * Get financial transactions with optional filters
   */
  public async getTransactions(
    startDate?: string,
    endDate?: string,
    type?: 'income' | 'expense',
    categoryId?: string
  ): Promise<Transaction[]> {
    try {
      console.log('Fetching transactions with filters:', { startDate, endDate, type, categoryId });
      
      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories (name, type)
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
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data.map(item => ({
        id: item.id,
        date: item.date,
        amount: item.amount,
        type: item.type as 'income' | 'expense',
        category_id: item.category_id,
        category_name: item.financial_categories?.name || '',
        category_type: item.financial_categories?.type || item.type,
        payment_method: item.payment_method,
        reference_id: item.reference_id,
        reference_type: item.reference_type,
        notes: item.notes,
        created_at: item.created_at
      })) as Transaction[];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('حدث خطأ أثناء جلب المعاملات المالية');
      return [];
    }
  }
  
  /**
   * Get financial categories with optional filters
   */
  public async getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
    try {
      let query = supabase
        .from('financial_categories')
        .select('*')
        .order('name');
      
      if (type) {
        query = query.eq('type', type);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data as Category[];
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('حدث خطأ أثناء جلب فئات المعاملات');
      return [];
    }
  }
  
  /**
   * Create a new category
   */
  public async createCategory(categoryData: Omit<Category, 'id' | 'created_at'>): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .insert(categoryData)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      toast.success('تم إنشاء الفئة بنجاح');
      return data as Category;
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('حدث خطأ أثناء إنشاء الفئة');
      return null;
    }
  }
  
  /**
   * Update a category
   */
  public async updateCategory(id: string, categoryData: Partial<Category>): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .update(categoryData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      toast.success('تم تحديث الفئة بنجاح');
      return data as Category;
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('حدث خطأ أثناء تحديث الفئة');
      return null;
    }
  }
  
  /**
   * Delete a category
   */
  public async deleteCategory(id: string): Promise<boolean> {
    try {
      // Check if there are any transactions associated with this category
      const { count, error: countError } = await supabase
        .from('financial_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        toast.error('لا يمكن حذف فئة مرتبطة بمعاملات مالية');
        return false;
      }
      
      const { error } = await supabase
        .from('financial_categories')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      toast.success('تم حذف الفئة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('حدث خطأ أثناء حذف الفئة');
      return false;
    }
  }
  
  /**
   * Create a transaction
   */
  public async createTransaction(transactionData: Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'>): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert(transactionData)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      await this.updateFinancialBalance(
        transactionData.amount, 
        transactionData.type
      );
      
      toast.success('تم إنشاء المعاملة المالية بنجاح');
      return data as Transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('حدث خطأ أثناء إنشاء المعاملة المالية');
      return null;
    }
  }
  
  /**
   * Update a transaction
   */
  public async updateTransaction(id: string, transactionData: Partial<Transaction>): Promise<Transaction | null> {
    try {
      const { data: oldTransaction, error: fetchError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { data, error } = await supabase
        .from('financial_transactions')
        .update(transactionData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // If amount or type has changed, update the financial balance
      if ((transactionData.amount && transactionData.amount !== oldTransaction.amount) ||
          (transactionData.type && transactionData.type !== oldTransaction.type)) {
        
        // Reverse old transaction
        await this.updateFinancialBalance(
          -oldTransaction.amount,
          oldTransaction.type === 'income' ? 'income' : 'expense'
        );
        
        // Apply new transaction values
        await this.updateFinancialBalance(
          transactionData.amount || oldTransaction.amount,
          transactionData.type || oldTransaction.type
        );
      }
      
      toast.success('تم تحديث المعاملة المالية بنجاح');
      return data as Transaction;
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('حدث خطأ أثناء تحديث المعاملة المالية');
      return null;
    }
  }
  
  /**
   * Delete a transaction
   */
  public async deleteTransaction(id: string): Promise<boolean> {
    try {
      // Get transaction to reverse its financial effect
      const { data: transaction, error: fetchError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Reverse financial effect
      await this.updateFinancialBalance(
        -transaction.amount,
        transaction.type === 'income' ? 'income' : 'expense'
      );
      
      toast.success('تم حذف المعاملة المالية بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('حدث خطأ أثناء حذف المعاملة المالية');
      return false;
    }
  }
  
  /**
   * Get financial summary
   */
  public async getFinancialSummary(startDate?: string, endDate?: string): Promise<FinancialSummary> {
    try {
      // Current date as default end date
      const currentDate = new Date();
      const endDateValue = endDate || currentDate.toISOString().split('T')[0];
      
      // 30 days ago as default start date
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      const startDateValue = startDate || defaultStartDate.toISOString().split('T')[0];
      
      // Get transactions for the period
      const transactions = await this.getTransactions(startDateValue, endDateValue);
      
      // Calculate income, expenses and net profit
      const totalIncome = transactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const totalExpense = transactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const netProfit = totalIncome - totalExpense;
      
      // Get categories data
      const categories = await this.getCategories();
      
      // Group transactions by category
      const incomeByCategory: { category: string; amount: number; percentage: number }[] = [];
      const expenseByCategory: { category: string; amount: number; percentage: number }[] = [];
      
      categories.forEach(category => {
        const categoryTransactions = transactions.filter(tx => tx.category_id === category.id);
        const categoryTotal = categoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        
        if (categoryTotal > 0) {
          const item = {
            category: category.name,
            amount: categoryTotal,
            percentage: category.type === 'income' 
              ? (totalIncome > 0 ? (categoryTotal / totalIncome) * 100 : 0)
              : (totalExpense > 0 ? (categoryTotal / totalExpense) * 100 : 0)
          };
          
          if (category.type === 'income') {
            incomeByCategory.push(item);
          } else {
            expenseByCategory.push(item);
          }
        }
      });
      
      // Get financial balance
      const { data: balance, error: balanceError } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .single();
      
      if (balanceError) throw balanceError;
      
      return {
        totalIncome,
        totalExpense,
        netProfit,
        incomeByCategory,
        expenseByCategory,
        recentTransactions: transactions.slice(0, 5),
        startDate: startDateValue,
        endDate: endDateValue,
        cashBalance: balance?.cash_balance || 0,
        bankBalance: balance?.bank_balance || 0,
        totalBalance: (balance?.cash_balance || 0) + (balance?.bank_balance || 0)
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      toast.error('حدث خطأ أثناء جلب الملخص المالي');
      
      // Return empty summary
      return {
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0,
        incomeByCategory: [],
        expenseByCategory: [],
        recentTransactions: []
      };
    }
  }
  
  /**
   * Find financial transactions linked to a commercial entity
   */
  public async findLinkedFinancialTransactions(referenceId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories (name, type)
        `)
        .eq('reference_id', referenceId);
      
      if (error) throw error;
      
      return data.map(item => ({
        id: item.id,
        date: item.date,
        amount: item.amount,
        type: item.type as 'income' | 'expense',
        category_id: item.category_id,
        category_name: item.financial_categories?.name || '',
        category_type: item.financial_categories?.type || item.type,
        payment_method: item.payment_method,
        reference_id: item.reference_id,
        reference_type: item.reference_type,
        notes: item.notes,
        created_at: item.created_at
      })) as Transaction[];
    } catch (error) {
      console.error('Error finding linked transactions:', error);
      return [];
    }
  }
  
  /**
   * Handle invoice confirmation by creating appropriate financial transactions
   */
  public async handleInvoiceConfirmation(invoice: Invoice): Promise<boolean> {
    try {
      // Determine transaction type based on invoice type
      const transactionType = invoice.invoice_type === 'sale' ? 'income' : 'expense';
      
      // Find appropriate category
      const { data: categories, error: categoriesError } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('type', transactionType)
        .eq('name', invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات');
      
      if (categoriesError) throw categoriesError;
      
      let categoryId = '';
      if (categories && categories.length > 0) {
        categoryId = categories[0].id;
      } else {
        // Create category if it doesn't exist
        const { data: newCategory, error: createError } = await supabase
          .from('financial_categories')
          .insert({
            name: invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات',
            type: transactionType,
            description: invoice.invoice_type === 'sale' ? 'إيرادات المبيعات' : 'مصاريف المشتريات'
          })
          .select()
          .single();
        
        if (createError) throw createError;
        categoryId = newCategory.id;
      }
      
      // Create financial transaction
      const transactionData = {
        date: invoice.date,
        type: transactionType,
        amount: invoice.total_amount,
        category_id: categoryId,
        payment_method: 'cash',
        notes: `${invoice.invoice_type === 'sale' ? 'إيراد من فاتورة مبيعات' : 'مصروف من فاتورة مشتريات'} - ${invoice.id}`,
        reference_id: invoice.id,
        reference_type: 'invoice'
      };
      
      const { error: transactionError } = await supabase
        .from('financial_transactions')
        .insert(transactionData);
      
      if (transactionError) throw transactionError;
      
      // Update financial balance
      await this.updateFinancialBalance(invoice.total_amount, transactionType);
      
      return true;
    } catch (error) {
      console.error('Error handling invoice confirmation:', error);
      toast.error('حدث خطأ أثناء إنشاء المعاملة المالية للفاتورة');
      return false;
    }
  }
  
  /**
   * Handle payment confirmation by creating appropriate financial transactions
   */
  public async handlePaymentConfirmation(payment: any): Promise<boolean> {
    try {
      // Determine transaction type based on payment type
      const transactionType = payment.payment_type === 'collection' ? 'income' : 'expense';
      
      // Find appropriate category
      const { data: categories, error: categoriesError } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('type', transactionType)
        .eq('name', payment.payment_type === 'collection' ? 'تحصيلات' : 'مدفوعات');
      
      if (categoriesError) throw categoriesError;
      
      let categoryId = '';
      if (categories && categories.length > 0) {
        categoryId = categories[0].id;
      } else {
        // Create category if it doesn't exist
        const { data: newCategory, error: createError } = await supabase
          .from('financial_categories')
          .insert({
            name: payment.payment_type === 'collection' ? 'تحصيلات' : 'مدفوعات',
            type: transactionType,
            description: payment.payment_type === 'collection' ? 'تحصيلات نقدية' : 'مدفوعات نقدية'
          })
          .select()
          .single();
        
        if (createError) throw createError;
        categoryId = newCategory.id;
      }
      
      // Create financial transaction
      const transactionData = {
        date: payment.date,
        type: transactionType,
        amount: payment.amount,
        category_id: categoryId,
        payment_method: payment.method || 'cash',
        notes: `${payment.payment_type === 'collection' ? 'تحصيل نقدي' : 'دفع نقدي'} - ${payment.id}`,
        reference_id: payment.id,
        reference_type: 'payment'
      };
      
      const { error: transactionError } = await supabase
        .from('financial_transactions')
        .insert(transactionData);
      
      if (transactionError) throw transactionError;
      
      // Update financial balance
      await this.updateFinancialBalance(payment.amount, transactionType);
      
      return true;
    } catch (error) {
      console.error('Error handling payment confirmation:', error);
      toast.error('حدث خطأ أثناء إنشاء المعاملة المالية للدفعة');
      return false;
    }
  }
}

export default FinancialService;
