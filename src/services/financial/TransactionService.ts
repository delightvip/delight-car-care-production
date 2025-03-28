import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Transaction, Category, Balance } from './FinancialTypes';

/**
 * خدمة إدارة المعاملات المالية
 */
class TransactionService {
  private static instance: TransactionService;
  
  private constructor() {}
  
  public static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }
  
  /**
   * الحصول على جميع المعاملات المالية
   */
  public async getTransactions(): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          categories:category_id (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Map the data to include category name
      const transactions = data.map(transaction => ({
        id: transaction.id,
        date: transaction.date,
        type: transaction.type as 'income' | 'expense',
        category_id: transaction.category_id,
        category_name: transaction.categories?.name,
        amount: transaction.amount,
        payment_method: transaction.payment_method as 'cash' | 'bank' | 'other',
        notes: transaction.notes,
        reference_id: transaction.reference_id,
        reference_type: transaction.reference_type,
        created_at: transaction.created_at
      }));
      
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('حدث خطأ أثناء جلب المعاملات المالية');
      return [];
    }
  }
  
  /**
   * إنشاء معاملة مالية جديدة
   * @param transactionData بيانات المعاملة
   */
  public async createTransaction(transactionData: Omit<Transaction, 'id' | 'created_at' | 'category_name'>): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({
          date: transactionData.date,
          type: transactionData.type,
          category_id: transactionData.category_id,
          amount: transactionData.amount,
          payment_method: transactionData.payment_method,
          notes: transactionData.notes,
          reference_id: transactionData.reference_id,
          reference_type: transactionData.reference_type
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update cash or bank balance based on transaction type
      await this.updateBalance(
        transactionData.type === 'income' ? transactionData.amount : -transactionData.amount,
        this.normalizePaymentMethod(transactionData.payment_method)
      );
      
      // Get category name for response
      const { data: category } = await supabase
        .from('financial_categories')
        .select('name')
        .eq('id', transactionData.category_id)
        .single();
      
      toast.success('تم إنشاء المعاملة المالية بنجاح');
      
      return {
        ...data,
        category_name: category?.name
      } as Transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('حدث خطأ أثناء إنشاء المعاملة المالية');
      return null;
    }
  }
  
  /**
   * تحديث معاملة مالية
   * @param id معرف المعاملة
   * @param transactionData بيانات المعاملة المحدثة
   */
  public async updateTransaction(id: string, transactionData: Partial<Omit<Transaction, 'id' | 'created_at' | 'category_name'>>): Promise<boolean> {
    try {
      // Get the original transaction to calculate balance adjustment
      const { data: originalTransaction, error: fetchError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error } = await supabase
        .from('financial_transactions')
        .update({
          date: transactionData.date,
          type: transactionData.type,
          category_id: transactionData.category_id,
          amount: transactionData.amount,
          payment_method: transactionData.payment_method,
          notes: transactionData.notes,
          reference_id: transactionData.reference_id,
          reference_type: transactionData.reference_type
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // If amount, type, or payment method changed, update the balance
      if (
        transactionData.amount !== undefined && transactionData.amount !== originalTransaction.amount ||
        transactionData.type !== undefined && transactionData.type !== originalTransaction.type ||
        transactionData.payment_method !== undefined && transactionData.payment_method !== originalTransaction.payment_method
      ) {
        // First reverse the original transaction effect on balance
        await this.updateBalance(
          originalTransaction.type === 'income' ? -originalTransaction.amount : originalTransaction.amount,
          this.normalizePaymentMethod(originalTransaction.payment_method)
        );
        
        // Then apply the new transaction effect
        const amount = transactionData.amount || originalTransaction.amount;
        const type = transactionData.type || originalTransaction.type;
        const method = transactionData.payment_method || originalTransaction.payment_method;
        
        await this.updateBalance(
          type === 'income' ? amount : -amount,
          this.normalizePaymentMethod(method)
        );
      }
      
      toast.success('تم تحديث المعاملة المالية بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('حدث خطأ أثناء تحديث المعاملة المالية');
      return false;
    }
  }
  
  /**
   * حذف معاملة مالية
   * @param id معرف المعاملة
   */
  public async deleteTransaction(id: string): Promise<boolean> {
    try {
      // Get the transaction before deleting to adjust balance
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
      
      // Reverse the transaction effect on balance
      await this.updateBalance(
        transaction.type === 'income' ? -transaction.amount : transaction.amount,
        this.normalizePaymentMethod(transaction.payment_method)
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
   * تحديث رصيد الخزينة
   * @param amount المبلغ (موجب للإيراد، سالب للمصروف)
   * @param method طريقة الدفع
   */
  public async updateBalance(amount: number, method: 'cash' | 'bank' | 'other'): Promise<boolean> {
    try {
      // Skip balance update for 'other' payment methods
      if (method === 'other') {
        return true;
      }
      
      // Get current balance
      const { data: balance, error: fetchError } = await supabase
        .from('financial_balance')
        .select('*')
        .single();
      
      if (fetchError) {
        // If no balance record exists, create one
        if (fetchError.code === 'PGRST116') {
          const initialBalance = {
            cash_balance: method === 'cash' ? amount : 0,
            bank_balance: method === 'bank' ? amount : 0,
            id: '1' // Using '1' as a singleton record ID
          };
          
          const { error: insertError } = await supabase
            .from('financial_balance')
            .insert(initialBalance);
          
          if (insertError) throw insertError;
          return true;
        }
        
        throw fetchError;
      }
      
      // Calculate new balance
      const updateData: Partial<Balance> = {
        last_updated: new Date().toISOString()
      };
      
      if (method === 'cash') {
        updateData.cash_balance = balance.cash_balance + amount;
      } else if (method === 'bank') {
        updateData.bank_balance = balance.bank_balance + amount;
      }
      
      // Update balance
      const { error: updateError } = await supabase
        .from('financial_balance')
        .update(updateData)
        .eq('id', balance.id);
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('حدث خطأ أثناء تحديث رصيد الخزينة');
      return false;
    }
  }
  
  /**
   * تحويل نوع طريقة الدفع إلى الأنواع المقبولة للخزينة
   * @param method طريقة الدفع
   * @returns طريقة الدفع المحولة
   */
  private normalizePaymentMethod(method: string): 'cash' | 'bank' | 'other' {
    if (method === 'cash') return 'cash';
    if (method === 'bank' || method === 'bank_transfer' || method === 'check') return 'bank';
    return 'other';
  }
  
  /**
   * الحصول على رصيد الخزينة الحالي
   */
  public async getBalance(): Promise<Balance | null> {
    try {
      const { data, error } = await supabase
        .from('financial_balance')
        .select('*')
        .single();
      
      if (error) {
        // If no balance record exists, create one
        if (error.code === 'PGRST116') {
          const initialBalance = {
            cash_balance: 0,
            bank_balance: 0,
            id: '1' // Using '1' as a singleton record ID
          };
          
          const { data: newBalance, error: insertError } = await supabase
            .from('financial_balance')
            .insert(initialBalance)
            .select()
            .single();
          
          if (insertError) throw insertError;
          return newBalance as Balance;
        }
        
        throw error;
      }
      
      return data as Balance;
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast.error('حدث خطأ أثناء جلب رصيد الخزينة');
      return null;
    }
  }
}

export default TransactionService;
