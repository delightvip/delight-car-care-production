
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Transaction } from "./FinancialTypes";

// Add the is_reduction property to the Transaction interface in the model
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

/**
 * خدمة مخصصة للتعامل مع المعاملات المالية
 */
class FinancialTransactionService {
  private static instance: FinancialTransactionService;
  
  private constructor() {}
  
  public static getInstance(): FinancialTransactionService {
    if (!FinancialTransactionService.instance) {
      FinancialTransactionService.instance = new FinancialTransactionService();
    }
    return FinancialTransactionService.instance;
  }
  
  /**
   * الحصول على جميع المعاملات المالية مع امكانية التصفية
   */
  public async getTransactions(
    startDate?: string,
    endDate?: string,
    type?: 'income' | 'expense',
    categoryId?: string
  ): Promise<Transaction[]> {
    try {
      let query = supabase
        .from('financial_transactions')
        .select('*, financial_categories!inner(name, type)')
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
      
      // تنسيق البيانات للواجهة
      return data.map(item => ({
        id: item.id,
        date: item.date,
        amount: item.amount,
        type: item.type as 'income' | 'expense',
        category_id: item.category_id,
        category_name: item.financial_categories.name,
        category_type: item.financial_categories.type,
        payment_method: item.payment_method,
        reference_id: item.reference_id,
        reference_type: item.reference_type,
        notes: item.notes,
        created_at: item.created_at,
        is_reduction: item.is_reduction || false
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('حدث خطأ أثناء جلب المعاملات المالية');
      return [];
    }
  }
  
  /**
   * الحصول على معاملة مالية بواسطة المعرف
   */
  public async getTransactionById(id: string): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*, financial_categories!inner(name, type)')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        return null;
      }
      
      // تنسيق البيانات للواجهة
      return {
        id: data.id,
        date: data.date,
        amount: data.amount,
        type: data.type as 'income' | 'expense',
        category_id: data.category_id,
        category_name: data.financial_categories.name,
        category_type: data.financial_categories.type,
        payment_method: data.payment_method,
        reference_id: data.reference_id,
        reference_type: data.reference_type,
        notes: data.notes,
        created_at: data.created_at,
        is_reduction: data.is_reduction || false
      };
    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast.error('حدث خطأ أثناء جلب بيانات المعاملة المالية');
      return null;
    }
  }

  /**
   * الحصول على فئة بواسطة المعرف
   * وظيفة مساعدة داخلية
   */
  private async getCategoryById(id: string) {
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching category:', error);
      return null;
    }
  }
  
  /**
   * تحديث أرصدة الخزينة
   * وظيفة مساعدة داخلية
   */
  private async updateFinancialBalance(cashAmount: number, bankAmount: number) {
    try {
      const { data: existingBalance, error: fetchError } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .maybeSingle();
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!existingBalance) {
        // إنشاء سجل الأرصدة إذا لم يكن موجودًا
        const { error: insertError } = await supabase
          .from('financial_balance')
          .insert({
            id: '1',
            cash_balance: cashAmount,
            bank_balance: bankAmount,
            last_updated: new Date().toISOString()
          });
        
        if (insertError) {
          throw insertError;
        }
      } else {
        // تحديث سجل الأرصدة الموجود
        const { error: updateError } = await supabase
          .from('financial_balance')
          .update({
            cash_balance: existingBalance.cash_balance + cashAmount,
            bank_balance: existingBalance.bank_balance + bankAmount,
            last_updated: new Date().toISOString()
          })
          .eq('id', '1');
        
        if (updateError) {
          throw updateError;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating financial balance:', error);
      return false;
    }
  }
  
  /**
   * إنشاء معاملة مالية جديدة
   */
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
        is_reduction: data.is_reduction
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('حدث خطأ أثناء إنشاء المعاملة المالية');
      return null;
    }
  }
  
  /**
   * تحديث معاملة مالية
   */
  public async updateTransaction(
    id: string,
    transactionData: Partial<Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'>>
  ): Promise<boolean> {
    try {
      // Get existing transaction to calculate balance adjustment
      const existingTransaction = await this.getTransactionById(id);
      
      if (!existingTransaction) {
        toast.error('المعاملة المالية غير موجودة');
        return false;
      }
      
      const updateData: any = { ...transactionData };
      
      if (transactionData.category_id) {
        // التحقق من وجود الفئة الجديدة
        const category = await this.getCategoryById(transactionData.category_id);
        
        if (!category) {
          toast.error('فئة المعاملة غير موجودة');
          return false;
        }
      }
      
      // تحديث المعاملة
      const { error } = await supabase
        .from('financial_transactions')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // تعديل الرصيد المالي إذا تم تغيير المبلغ أو النوع
      if (transactionData.amount && transactionData.amount !== existingTransaction.amount) {
        const amountDifference = transactionData.amount - existingTransaction.amount;
        
        if (existingTransaction.type === 'income') {
          await this.updateFinancialBalance(amountDifference, 0);
        } else {
          await this.updateFinancialBalance(-amountDifference, 0);
        }
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
   */
  public async deleteTransaction(id: string): Promise<boolean> {
    try {
      // الحصول على بيانات المعاملة قبل الحذف لتعديل الرصيد المالي
      const transaction = await this.getTransactionById(id);
      
      if (!transaction) {
        toast.error('المعاملة المالية غير موجودة');
        return false;
      }
      
      // حذف المعاملة
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // تعديل الرصيد المالي
      if (transaction.type === 'income') {
        await this.updateFinancialBalance(-transaction.amount, 0);
      } else {
        await this.updateFinancialBalance(transaction.amount, 0);
      }
      
      toast.success('تم حذف المعاملة المالية بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('حدث خطأ أثناء حذف المعاملة المالية');
      return false;
    }
  }

  /**
   * إنشاء معاملة مالية من معاملة تجارية
   */
  public async createTransactionFromCommercial(
    amount: number,
    type: 'income' | 'expense',
    categoryId: string,
    paymentMethod: string,
    referenceId: string,
    referenceType: string,
    notes: string,
    date: Date
  ): Promise<Transaction | null> {
    return this.createTransaction({
      amount,
      type,
      category_id: categoryId,
      payment_method: paymentMethod,
      reference_id: referenceId,
      reference_type: referenceType,
      notes,
      date: date.toISOString().split('T')[0],
      is_reduction: false
    });
  }
}

export default FinancialTransactionService;
