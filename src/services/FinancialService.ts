
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

class FinancialService {
  private static instance: FinancialService;
  
  private constructor() {}
  
  public static getInstance(): FinancialService {
    if (!FinancialService.instance) {
      FinancialService.instance = new FinancialService();
    }
    return FinancialService.instance;
  }
  
  // Category methods
  async getCategories(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('حدث خطأ أثناء جلب التصنيفات المالية');
      return [];
    }
  }
  
  async createCategory(category: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('تم إنشاء التصنيف بنجاح');
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('حدث خطأ أثناء إنشاء التصنيف');
      return null;
    }
  }
  
  async updateCategory(id: string, category: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('financial_categories')
        .update(category)
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث التصنيف بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('حدث خطأ أثناء تحديث التصنيف');
      return false;
    }
  }
  
  async deleteCategory(id: string): Promise<boolean> {
    try {
      // Check if category is used in transactions
      const { count, error: countError } = await supabase
        .from('financial_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        toast.error('لا يمكن حذف التصنيف لأنه مرتبط بمعاملات مالية');
        return false;
      }
      
      const { error } = await supabase
        .from('financial_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف التصنيف بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('حدث خطأ أثناء حذف التصنيف');
      return false;
    }
  }
  
  // Transaction methods
  async getTransactions(filters?: any): Promise<any[]> {
    try {
      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          categories:category_id (name, type)
        `)
        .order('date', { ascending: false });
      
      if (filters) {
        if (filters.type) {
          query = query.eq('type', filters.type);
        }
        
        if (filters.category_id) {
          query = query.eq('category_id', filters.category_id);
        }
        
        if (filters.startDate && filters.endDate) {
          query = query
            .gte('date', filters.startDate)
            .lte('date', filters.endDate);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('حدث خطأ أثناء جلب المعاملات المالية');
      return [];
    }
  }
  
  async createTransaction(transaction: any): Promise<any> {
    try {
      // Update financial balance based on transaction type
      await this.updateFinancialBalance(transaction);
      
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert(transaction)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('تم تسجيل المعاملة بنجاح');
      return data;
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة');
      return null;
    }
  }
  
  async updateTransaction(id: string, transaction: any): Promise<boolean> {
    try {
      // Get original transaction
      const { data: originalTransaction, error: originalError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (originalError) throw originalError;
      
      // Reverse the effect of the original transaction on financial balance
      await this.reverseFinancialBalance(originalTransaction);
      
      // Update financial balance based on new transaction values
      await this.updateFinancialBalance(transaction);
      
      // Update the transaction record
      const { error } = await supabase
        .from('financial_transactions')
        .update(transaction)
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('حدث خطأ أثناء تحديث المعاملة');
      return false;
    }
  }
  
  async deleteTransaction(id: string): Promise<boolean> {
    try {
      // Get transaction details
      const { data: transaction, error: fetchError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Reverse the effect of the transaction on financial balance
      await this.reverseFinancialBalance(transaction);
      
      // Delete the transaction
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('حدث خطأ أثناء حذف المعاملة');
      return false;
    }
  }
  
  // Financial summary methods
  async getFinancialSummary(startDate?: string, endDate?: string): Promise<any> {
    try {
      // Default to current month if no dates provided
      const now = new Date();
      const end = endDate || now.toISOString().split('T')[0];
      
      const start = startDate || 
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      
      // Get financial balance
      const { data: balance, error: balanceError } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .single();
      
      if (balanceError && balanceError.code !== 'PGRST116') throw balanceError;
      
      // Get income transactions
      const { data: income, error: incomeError } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'income')
        .gte('date', start)
        .lte('date', end);
      
      if (incomeError) throw incomeError;
      
      // Get expense transactions
      const { data: expenses, error: expensesError } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end);
      
      if (expensesError) throw expensesError;
      
      // Calculate totals
      const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
      const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
      const netCashflow = totalIncome - totalExpenses;
      
      // Get income by category
      const { data: incomeByCategory, error: incomeByCategoryError } = await supabase
        .from('financial_transactions')
        .select(`
          amount,
          categories:category_id (name)
        `)
        .eq('type', 'income')
        .gte('date', start)
        .lte('date', end);
      
      if (incomeByCategoryError) throw incomeByCategoryError;
      
      // Get expenses by category
      const { data: expensesByCategory, error: expensesByCategoryError } = await supabase
        .from('financial_transactions')
        .select(`
          amount,
          categories:category_id (name)
        `)
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end);
      
      if (expensesByCategoryError) throw expensesByCategoryError;
      
      // Group by category
      const incomeCategoryMap = new Map();
      incomeByCategory.forEach(item => {
        const categoryName = item.categories?.name || 'Unknown';
        const amount = item.amount;
        
        if (incomeCategoryMap.has(categoryName)) {
          incomeCategoryMap.set(categoryName, incomeCategoryMap.get(categoryName) + amount);
        } else {
          incomeCategoryMap.set(categoryName, amount);
        }
      });
      
      const expenseCategoryMap = new Map();
      expensesByCategory.forEach(item => {
        const categoryName = item.categories?.name || 'Unknown';
        const amount = item.amount;
        
        if (expenseCategoryMap.has(categoryName)) {
          expenseCategoryMap.set(categoryName, expenseCategoryMap.get(categoryName) + amount);
        } else {
          expenseCategoryMap.set(categoryName, amount);
        }
      });
      
      // Convert maps to arrays for the response
      const incomeCategories = Array.from(incomeCategoryMap.entries()).map(([name, amount]) => ({
        name,
        amount
      }));
      
      const expenseCategories = Array.from(expenseCategoryMap.entries()).map(([name, amount]) => ({
        name,
        amount
      }));
      
      return {
        balance: balance || { cash_balance: 0, bank_balance: 0 },
        period: {
          start,
          end
        },
        totalIncome,
        totalExpenses,
        netCashflow,
        incomeCategories,
        expenseCategories
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      toast.error('حدث خطأ أثناء جلب الملخص المالي');
      
      return {
        balance: { cash_balance: 0, bank_balance: 0 },
        period: {},
        totalIncome: 0,
        totalExpenses: 0,
        netCashflow: 0,
        incomeCategories: [],
        expenseCategories: []
      };
    }
  }
  
  // Commercial-Financial linkage methods
  async findLinkedFinancialTransactions(referenceId: string, referenceType: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          categories:category_id (name, type)
        `)
        .eq('reference_id', referenceId)
        .eq('reference_type', referenceType);
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching linked transactions:', error);
      return [];
    }
  }
  
  async handleInvoiceConfirmation(invoice: any): Promise<boolean> {
    try {
      const transactionData = {
        date: invoice.date,
        type: invoice.invoice_type === 'sale' ? 'income' : 'expense',
        amount: invoice.total_amount,
        payment_method: 'other',
        category_id: invoice.invoice_type === 'sale' ? 
          await this.getDefaultIncomeCategoryId() : 
          await this.getDefaultExpenseCategoryId(),
        notes: `${invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'} - فاتورة رقم: ${invoice.id}`,
        reference_type: `${invoice.invoice_type}_invoice`,
        reference_id: invoice.id
      };
      
      await this.createTransaction(transactionData);
      
      return true;
    } catch (error) {
      console.error('Error handling invoice confirmation:', error);
      return false;
    }
  }
  
  async handlePaymentConfirmation(payment: any): Promise<boolean> {
    try {
      const transactionData = {
        date: payment.date,
        type: payment.payment_type === 'payment' ? 'expense' : 'income',
        amount: payment.amount,
        payment_method: payment.method || 'cash',
        category_id: payment.payment_type === 'payment' ? 
          await this.getDefaultExpenseCategoryId() : 
          await this.getDefaultIncomeCategoryId(),
        notes: `${payment.payment_type === 'payment' ? 'دفعة' : 'تحصيل'} - رقم: ${payment.id}`,
        reference_type: 'payment',
        reference_id: payment.id
      };
      
      await this.createTransaction(transactionData);
      
      return true;
    } catch (error) {
      console.error('Error handling payment confirmation:', error);
      return false;
    }
  }
  
  // Helper methods
  private async updateFinancialBalance(transaction: any): Promise<void> {
    try {
      // Determine which balance to update (cash or bank)
      const balanceField = transaction.payment_method === 'bank' ? 'bank_balance' : 'cash_balance';
      
      // Get current balance
      const { data: currentBalance, error: balanceError } = await supabase
        .from('financial_balance')
        .select(balanceField)
        .eq('id', '1')
        .single();
      
      if (balanceError && balanceError.code !== 'PGRST116') throw balanceError;
      
      let newBalance = 0;
      
      if (currentBalance) {
        newBalance = transaction.type === 'income'
          ? currentBalance[balanceField] + transaction.amount
          : currentBalance[balanceField] - transaction.amount;
      } else {
        // No existing balance record, create one
        newBalance = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        
        const insertData = {
          id: '1',
          cash_balance: balanceField === 'cash_balance' ? newBalance : 0,
          bank_balance: balanceField === 'bank_balance' ? newBalance : 0,
        };
        
        await supabase
          .from('financial_balance')
          .insert(insertData);
        
        return;
      }
      
      // Update balance
      const updateData = {
        [balanceField]: newBalance,
        last_updated: new Date().toISOString()
      };
      
      await supabase
        .from('financial_balance')
        .update(updateData)
        .eq('id', '1');
    } catch (error) {
      console.error('Error updating financial balance:', error);
      throw error;
    }
  }
  
  private async reverseFinancialBalance(transaction: any): Promise<void> {
    try {
      // Determine which balance to update (cash or bank)
      const balanceField = transaction.payment_method === 'bank' ? 'bank_balance' : 'cash_balance';
      
      // Get current balance
      const { data: currentBalance, error: balanceError } = await supabase
        .from('financial_balance')
        .select(balanceField)
        .eq('id', '1')
        .single();
      
      if (balanceError) throw balanceError;
      
      // Calculate new balance by reversing the effect of the transaction
      const newBalance = transaction.type === 'income'
        ? currentBalance[balanceField] - transaction.amount
        : currentBalance[balanceField] + transaction.amount;
      
      // Update balance
      const updateData = {
        [balanceField]: newBalance,
        last_updated: new Date().toISOString()
      };
      
      await supabase
        .from('financial_balance')
        .update(updateData)
        .eq('id', '1');
    } catch (error) {
      console.error('Error reversing financial balance:', error);
      throw error;
    }
  }
  
  private async getDefaultIncomeCategoryId(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('type', 'income')
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data[0].id;
      }
      
      // Create default income category if none exists
      const { data: newCategory, error: createError } = await supabase
        .from('financial_categories')
        .insert({
          name: 'إيرادات عامة',
          type: 'income',
          description: 'تصنيف افتراضي للإيرادات'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      return newCategory.id;
    } catch (error) {
      console.error('Error getting default income category:', error);
      throw error;
    }
  }
  
  private async getDefaultExpenseCategoryId(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('type', 'expense')
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data[0].id;
      }
      
      // Create default expense category if none exists
      const { data: newCategory, error: createError } = await supabase
        .from('financial_categories')
        .insert({
          name: 'مصروفات عامة',
          type: 'expense',
          description: 'تصنيف افتراضي للمصروفات'
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      return newCategory.id;
    } catch (error) {
      console.error('Error getting default expense category:', error);
      throw error;
    }
  }
  
  // Record a new transaction
  async recordTransaction(transactionData: any): Promise<any> {
    return this.createTransaction(transactionData);
  }
}

export default FinancialService;
