
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category_id: string;
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
  created_at: string;
}

export interface FinancialSummary {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  cash_balance: number;
  bank_balance: number;
  sales_profit: number;
}

class FinancialService {
  private static instance: FinancialService;
  
  private constructor() {}
  
  public static getInstance(): FinancialService {
    if (!FinancialService.instance) {
      FinancialService.instance = new FinancialService();
    }
    return FinancialService.instance;
  }
  
  public async getTransactions(
    startDate?: string, 
    endDate?: string,
    type?: 'income' | 'expense',
    categoryId?: string
  ): Promise<Transaction[]> {
    try {
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
      
      if (error) throw error;
      
      return data.map(transaction => ({
        id: transaction.id,
        date: transaction.date,
        type: transaction.type,
        category_id: transaction.category_id,
        category_name: transaction.financial_categories?.name,
        amount: transaction.amount,
        payment_method: transaction.payment_method,
        notes: transaction.notes,
        reference_id: transaction.reference_id,
        reference_type: transaction.reference_type,
        created_at: transaction.created_at
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب المعاملات المالية",
        variant: "destructive"
      });
      return [];
    }
  }
  
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
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب فئات المعاملات",
        variant: "destructive"
      });
      return [];
    }
  }
  
  public async createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category | null> {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: "تم بنجاح",
        description: "تم إنشاء فئة جديدة بنجاح",
        variant: "default"
      });
      
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنشاء فئة جديدة",
        variant: "destructive"
      });
      return null;
    }
  }
  
  public async updateCategory(id: string, category: Partial<Omit<Category, 'id' | 'created_at'>>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('financial_categories')
        .update(category)
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "تم بنجاح",
        description: "تم تحديث الفئة بنجاح",
        variant: "default"
      });
      
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الفئة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async deleteCategory(id: string): Promise<boolean> {
    try {
      // Check if category is used in any transactions
      const { count, error: countError } = await supabase
        .from('financial_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        toast({
          title: "غير مسموح",
          description: "لا يمكن حذف هذه الفئة لأنها مستخدمة في معاملات موجودة",
          variant: "destructive"
        });
        return false;
      }
      
      const { error } = await supabase
        .from('financial_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "تم بنجاح",
        description: "تم حذف الفئة بنجاح",
        variant: "default"
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الفئة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async recordTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert(transaction)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update cash or bank balance
      if (transaction.payment_method === 'cash') {
        await this.updateCashBalance(
          transaction.type === 'income' ? transaction.amount : -transaction.amount
        );
      } else if (transaction.payment_method === 'bank') {
        await this.updateBankBalance(
          transaction.type === 'income' ? transaction.amount : -transaction.amount
        );
      }
      
      toast({
        title: "تم بنجاح",
        description: "تم تسجيل المعاملة بنجاح",
        variant: "default"
      });
      
      return data;
    } catch (error) {
      console.error('Error recording transaction:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل المعاملة",
        variant: "destructive"
      });
      return null;
    }
  }
  
  public async updateTransaction(id: string, transaction: Partial<Omit<Transaction, 'id' | 'created_at'>>): Promise<boolean> {
    try {
      // Get original transaction to calculate balance adjustments
      const { data: originalTransaction, error: fetchError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from('financial_transactions')
        .update(transaction)
        .eq('id', id);
      
      if (error) throw error;
      
      // Handle balance updates if payment method or amount changed
      if (
        transaction.payment_method !== undefined ||
        transaction.amount !== undefined ||
        transaction.type !== undefined
      ) {
        // Reverse original transaction effect
        if (originalTransaction.payment_method === 'cash') {
          await this.updateCashBalance(
            originalTransaction.type === 'income' ? -originalTransaction.amount : originalTransaction.amount
          );
        } else if (originalTransaction.payment_method === 'bank') {
          await this.updateBankBalance(
            originalTransaction.type === 'income' ? -originalTransaction.amount : originalTransaction.amount
          );
        }
        
        // Apply new transaction effect
        const newAmount = transaction.amount ?? originalTransaction.amount;
        const newType = transaction.type ?? originalTransaction.type;
        const newMethod = transaction.payment_method ?? originalTransaction.payment_method;
        
        if (newMethod === 'cash') {
          await this.updateCashBalance(
            newType === 'income' ? newAmount : -newAmount
          );
        } else if (newMethod === 'bank') {
          await this.updateBankBalance(
            newType === 'income' ? newAmount : -newAmount
          );
        }
      }
      
      toast({
        title: "تم بنجاح",
        description: "تم تحديث المعاملة بنجاح",
        variant: "default"
      });
      
      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المعاملة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  public async deleteTransaction(id: string): Promise<boolean> {
    try {
      // Get transaction details before deleting
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
      
      if (error) throw error;
      
      // Reverse effect on balances
      if (transaction.payment_method === 'cash') {
        await this.updateCashBalance(
          transaction.type === 'income' ? -transaction.amount : transaction.amount
        );
      } else if (transaction.payment_method === 'bank') {
        await this.updateBankBalance(
          transaction.type === 'income' ? -transaction.amount : transaction.amount
        );
      }
      
      toast({
        title: "تم بنجاح",
        description: "تم حذف المعاملة بنجاح",
        variant: "default"
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف المعاملة",
        variant: "destructive"
      });
      return false;
    }
  }
  
  private async updateCashBalance(amount: number): Promise<void> {
    try {
      const { data, error: fetchError } = await supabase
        .from('financial_balance')
        .select('cash_balance')
        .eq('id', '1')
        .single();
      
      if (fetchError) throw fetchError;
      
      const newBalance = (data?.cash_balance || 0) + amount;
      
      const { error } = await supabase
        .from('financial_balance')
        .update({ cash_balance: newBalance })
        .eq('id', '1');
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating cash balance:', error);
    }
  }
  
  private async updateBankBalance(amount: number): Promise<void> {
    try {
      const { data, error: fetchError } = await supabase
        .from('financial_balance')
        .select('bank_balance')
        .eq('id', '1')
        .single();
      
      if (fetchError) throw fetchError;
      
      const newBalance = (data?.bank_balance || 0) + amount;
      
      const { error } = await supabase
        .from('financial_balance')
        .update({ bank_balance: newBalance })
        .eq('id', '1');
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating bank balance:', error);
    }
  }
  
  public async getFinancialSummary(startDate?: string, endDate?: string): Promise<FinancialSummary> {
    try {
      // Get balances
      const { data: balanceData, error: balanceError } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .single();
      
      if (balanceError) throw balanceError;
      
      // Build filter for transactions
      let query = supabase
        .from('financial_transactions')
        .select('*');
      
      if (startDate) {
        query = query.gte('date', startDate);
      }
      
      if (endDate) {
        query = query.lte('date', endDate);
      }
      
      const { data: transactions, error: transactionsError } = await query;
      
      if (transactionsError) throw transactionsError;
      
      // Calculate totals
      let totalIncome = 0;
      let totalExpenses = 0;
      let salesProfit = 0;
      
      transactions.forEach(transaction => {
        if (transaction.type === 'income') {
          totalIncome += transaction.amount;
          
          // If reference type is sales, add to sales profit
          if (transaction.reference_type === 'sales') {
            salesProfit += transaction.amount;
          }
        } else {
          totalExpenses += transaction.amount;
        }
      });
      
      // For the selected period, get the sales cost from invoices
      const { data: invoiceItems, error: invoiceItemsError } = await supabase
        .from('invoice_items')
        .select(`
          *,
          invoices!inner(*)
        `)
        .eq('invoices.invoice_type', 'sales')
        .gte('invoices.date', startDate || '1900-01-01')
        .lte('invoices.date', endDate || '2100-12-31');
      
      if (invoiceItemsError) throw invoiceItemsError;
      
      // Calculate cost of sold products
      let salesCost = 0;
      
      if (invoiceItems && invoiceItems.length > 0) {
        for (const item of invoiceItems) {
          if (item.item_type === 'finished_products') {
            // Get unit cost for the finished product
            const { data: product, error: productError } = await supabase
              .from('finished_products')
              .select('unit_cost')
              .eq('id', item.item_id)
              .single();
            
            if (!productError && product) {
              salesCost += (product.unit_cost * item.quantity);
            }
          }
        }
        
        // Subtract cost from sales revenue to get real sales profit
        salesProfit -= salesCost;
      }
      
      return {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_profit: totalIncome - totalExpenses,
        cash_balance: balanceData?.cash_balance || 0,
        bank_balance: balanceData?.bank_balance || 0,
        sales_profit: salesProfit
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب ملخص الحالة المالية",
        variant: "destructive"
      });
      
      return {
        total_income: 0,
        total_expenses: 0,
        net_profit: 0,
        cash_balance: 0,
        bank_balance: 0,
        sales_profit: 0
      };
    }
  }
}

export default FinancialService;
