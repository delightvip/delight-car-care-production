import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Transaction } from "./FinancialTypes";
import { format } from "date-fns";

/**
 * خدمة مخصصة للتعامل مع المعاملات المالية فقط
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
   * الحصول على جميع المعاملات المالية
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
        date: typeof item.date === 'string' ? item.date : format(new Date(item.date), 'yyyy-MM-dd'),
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
   * الحصول على معاملة مالية بواسطة المعرف
   */
  public async getTransactionById(id: string): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories (name, type)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        return null;
      }
      
      return {
        id: data.id,
        date: typeof data.date === 'string' ? data.date : format(new Date(data.date), 'yyyy-MM-dd'),
        amount: data.amount,
        type: data.type as 'income' | 'expense',
        category_id: data.category_id,
        category_name: data.financial_categories?.name || '',
        category_type: data.financial_categories?.type || data.type,
        payment_method: data.payment_method,
        reference_id: data.reference_id,
        reference_type: data.reference_type,
        notes: data.notes,
        created_at: data.created_at
      } as Transaction;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast.error('حدث خطأ أثناء جلب بيانات المعاملة المالية');
      return null;
    }
  }
  
  /**
   * إنشاء معاملة مالية جديدة
   */
  public async createTransaction(transactionData: Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'>): Promise<Transaction | null> {
    try {
      // تنسيق التاريخ إذا كان كائن Date
      const formattedDate = typeof transactionData.date === 'object' 
        ? format(new Date(transactionData.date as any), 'yyyy-MM-dd')
        : transactionData.date;
        
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({
          date: formattedDate,
          amount: transactionData.amount,
          type: transactionData.type,
          category_id: transactionData.category_id,
          payment_method: transactionData.payment_method,
          reference_id: transactionData.reference_id,
          reference_type: transactionData.reference_type,
          notes: transactionData.notes
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // جلب معلومات الفئة
      const { data: categoryData, error: categoryError } = await supabase
        .from('financial_categories')
        .select('name, type')
        .eq('id', data.category_id)
        .maybeSingle();
      
      if (categoryError) {
        console.error('Error fetching category details:', categoryError);
      }
      
      // تحديث رصيد الخزينة
      await this.updateFinancialBalance(transactionData.amount, transactionData.type, transactionData.payment_method);
      
      toast.success('تم تسجيل المعاملة المالية بنجاح');
      
      return {
        id: data.id,
        date: data.date,
        amount: data.amount,
        type: data.type as 'income' | 'expense',
        category_id: data.category_id,
        category_name: categoryData?.name || '',
        category_type: categoryData?.type || data.type,
        payment_method: data.payment_method,
        reference_id: data.reference_id,
        reference_type: data.reference_type,
        notes: data.notes,
        created_at: data.created_at
      } as Transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة المالية');
      return null;
    }
  }
  
  /**
   * تحديث معاملة مالية
   */
  public async updateTransaction(id: string, transactionData: Partial<Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'>>): Promise<boolean> {
    try {
      // الحصول على بيانات المعاملة الحالية للمقارنة
      const currentTransaction = await this.getTransactionById(id);
      
      if (!currentTransaction) {
        toast.error('لم يتم العثور على المعاملة المالية');
        return false;
      }
      
      // تنسيق التاريخ إذا كان كائن Date
      const formattedDate = typeof transactionData.date === 'object' 
        ? format(new Date(transactionData.date as any), 'yyyy-MM-dd')
        : transactionData.date;
        
      const { error } = await supabase
        .from('financial_transactions')
        .update({
          date: formattedDate || currentTransaction.date,
          amount: transactionData.amount !== undefined ? transactionData.amount : currentTransaction.amount,
          type: transactionData.type || currentTransaction.type,
          category_id: transactionData.category_id || currentTransaction.category_id,
          payment_method: transactionData.payment_method || currentTransaction.payment_method,
          reference_id: transactionData.reference_id,
          reference_type: transactionData.reference_type,
          notes: transactionData.notes
        })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // إذا تغير المبلغ أو النوع، تحديث الرصيد
      if ((transactionData.amount !== undefined && transactionData.amount !== currentTransaction.amount) || 
          (transactionData.type !== undefined && transactionData.type !== currentTransaction.type) ||
          (transactionData.payment_method !== undefined && transactionData.payment_method !== currentTransaction.payment_method)) {
        
        // إلغاء تأثير المعاملة القديمة
        await this.reverseFinancialBalanceUpdate(
          currentTransaction.amount,
          currentTransaction.type,
          currentTransaction.payment_method
        );
        
        // تطبيق تأثير المعاملة الجديدة
        await this.updateFinancialBalance(
          transactionData.amount !== undefined ? transactionData.amount : currentTransaction.amount,
          transactionData.type || currentTransaction.type,
          transactionData.payment_method || currentTransaction.payment_method
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
   */
  public async deleteTransaction(id: string): Promise<boolean> {
    try {
      // الحصول على بيانات المعاملة قبل الحذف
      const transaction = await this.getTransactionById(id);
      
      if (!transaction) {
        toast.error('لم يتم العثور على المعاملة المالية');
        return false;
      }
      
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // عكس تأثير المعاملة على الرصيد
      await this.reverseFinancialBalanceUpdate(
        transaction.amount,
        transaction.type,
        transaction.payment_method
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
   * تحديث أرصدة الخزينة
   */
  private async updateFinancialBalance(amount: number, type: string, paymentMethod: string): Promise<void> {
    try {
      // تحديد نوع الرصيد المطلوب تحديثه
      const balanceField = paymentMethod === 'bank' ? 'bank_balance' : 'cash_balance';
      
      // الحصول على الرصيد الحالي
      const { data: balanceData, error: balanceError } = await supabase
        .from('financial_balance')
        .select(balanceField)
        .eq('id', '1')
        .single();
      
      if (balanceError) {
        throw balanceError;
      }
      
      // حساب الرصيد الجديد
      let newBalance = balanceData[balanceField] || 0;
      
      if (type === 'income') {
        newBalance += amount;
      } else if (type === 'expense') {
        newBalance -= amount;
      }
      
      // تحديث الرصيد
      const { error } = await supabase
        .from('financial_balance')
        .update({ [balanceField]: newBalance, last_updated: format(new Date(), 'yyyy-MM-dd') })
        .eq('id', '1');
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating financial balance:', error);
    }
  }
  
  /**
   * عكس تأثير معاملة على أرصدة الخزينة
   */
  private async reverseFinancialBalanceUpdate(amount: number, type: string, paymentMethod: string): Promise<void> {
    try {
      // تحديد نوع الرصيد المطلوب تحديثه
      const balanceField = paymentMethod === 'bank' ? 'bank_balance' : 'cash_balance';
      
      // الحصول على الرصيد الحالي
      const { data: balanceData, error: balanceError } = await supabase
        .from('financial_balance')
        .select(balanceField)
        .eq('id', '1')
        .single();
      
      if (balanceError) {
        throw balanceError;
      }
      
      // حساب الرصيد الجديد (عكس التأثير)
      let newBalance = balanceData[balanceField] || 0;
      
      if (type === 'income') {
        newBalance -= amount;  // عكس تأثير الإيراد
      } else if (type === 'expense') {
        newBalance += amount;  // عكس تأثير المصروف
      }
      
      // تحديث الرصيد
      const { error } = await supabase
        .from('financial_balance')
        .update({ [balanceField]: newBalance, last_updated: format(new Date(), 'yyyy-MM-dd') })
        .eq('id', '1');
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error reversing financial balance update:', error);
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
    notes?: string,
    date?: Date
  ): Promise<Transaction | null> {
    const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    
    const transactionData: Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'> = {
      date: formattedDate,
      amount,
      type,
      category_id: categoryId,
      payment_method: paymentMethod,
      reference_id: referenceId,
      reference_type: referenceType,
      notes: notes || 'تم إنشاؤها تلقائيًا من معاملة تجارية'
    };
    
    return this.createTransaction(transactionData);
  }
}

export default FinancialTransactionService;
