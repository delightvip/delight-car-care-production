
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Transaction } from "./FinancialTypes";
import { format } from 'date-fns';

/**
 * خدمة للربط بين المعاملات المالية والمعاملات التجارية (فواتير، مدفوعات، مرتجعات)
 * تعالج هذه الخدمة إنشاء المعاملات المالية المرتبطة تلقائيًا عند تأكيد الفواتير والمدفوعات والمرتجعات التجارية،
 * بالإضافة إلى معالجة إلغاء هذه المعاملات عند إلغاء الفواتير والمدفوعات والمرتجعات.
 */
class FinancialCommercialBridge {
  private static instance: FinancialCommercialBridge;
  
  private constructor() {}
  
  public static getInstance(): FinancialCommercialBridge {
    if (!FinancialCommercialBridge.instance) {
      FinancialCommercialBridge.instance = new FinancialCommercialBridge();
    }
    return FinancialCommercialBridge.instance;
  }
  
  /**
   * معالجة تأكيد فاتورة تجارية
   * عند تأكيد فاتورة، يتم إنشاء معاملة مالية مقابلة (إيراد)
   */
  public async handleInvoiceConfirmation(invoice: any): Promise<boolean> {
    try {
      const formattedDate = typeof invoice.invoice_date === 'object' && invoice.invoice_date
        ? format(invoice.invoice_date, 'yyyy-MM-dd')
        : invoice.invoice_date;

      const transactionData: Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'> = {
        type: 'income',
        amount: invoice.total_amount,
        category_id: 'c69949b5-2969-4984-9f99-93a377fca8ff', // فئة "إيرادات المبيعات"
        date: formattedDate,
        payment_method: invoice.payment_method,
        notes: `فاتورة مبيعات رقم ${invoice.invoice_number} للعميل ${invoice.party_name}`,
        reference_id: invoice.id,
        reference_type: 'invoice'
      };
      
      const { data: transaction, error: transactionError } = await supabase
        .from('financial_transactions')
        .insert(transactionData)
        .select()
        .single();
      
      if (transactionError) {
        throw transactionError;
      }
      
      toast.success(`تم تسجيل إيراد فاتورة رقم ${invoice.invoice_number} تلقائيًا`);
      return true;
    } catch (error) {
      console.error('Error handling invoice confirmation:', error);
      toast.error('حدث خطأ أثناء تسجيل إيراد الفاتورة');
      return false;
    }
  }
  
  /**
   * معالجة تأكيد دفعة تجارية
   * عند تأكيد دفعة، يتم إنشاء معاملة مالية مقابلة (إيراد أو مصروف حسب نوع الدفعة)
   */
  public async handlePaymentConfirmation(payment: any): Promise<boolean> {
    try {
      const transactionType = payment.type === 'receipt' ? 'income' : 'expense';
      const categoryId = payment.type === 'receipt' ? 'c69949b5-2969-4984-9f99-93a377fca8ff' : 'd4439564-5a92-4e95-a889-19c449989181'; // فئة "إيرادات المبيعات" أو "مدفوعات الموردين"
      
      const formattedDate = typeof payment.payment_date === 'object' && payment.payment_date
        ? format(payment.payment_date, 'yyyy-MM-dd')
        : payment.payment_date;

      const transactionData: Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'> = {
        type: transactionType,
        amount: payment.amount,
        category_id: categoryId,
        date: formattedDate,
        payment_method: payment.payment_method,
        notes: `دفعة ${payment.type === 'receipt' ? 'مستلمة' : 'مدفوعة'} رقم ${payment.payment_number} من/إلى ${payment.party_name}`,
        reference_id: payment.id,
        reference_type: 'payment'
      };
      
      const { data: transaction, error: transactionError } = await supabase
        .from('financial_transactions')
        .insert(transactionData)
        .select()
        .single();
      
      if (transactionError) {
        throw transactionError;
      }
      
      toast.success(`تم تسجيل معاملة دفعة رقم ${payment.payment_number} تلقائيًا`);
      return true;
    } catch (error) {
      console.error('Error handling payment confirmation:', error);
      toast.error('حدث خطأ أثناء تسجيل معاملة الدفعة');
      return false;
    }
  }
  
  /**
   * معالجة تأكيد مرتجع
   * عند تأكيد مرتجع، يتم إنشاء معاملة مالية مقابلة (مصروف لمرتجع المبيعات، إيراد لمرتجع المشتريات)
   */
  public async handleReturnConfirmation(returnData: any): Promise<boolean> {
    try {
      // 1. تحديد نوع المعاملة والفئة المالية المناسبة
      const isSalesReturn = returnData.return_type === 'sales_return';
      const transactionType = isSalesReturn ? 'expense' : 'income';
      
      // فئات المعاملات المالية
      // مرتجعات مبيعات = مصروفات مرتجعات مبيعات
      // مرتجعات مشتريات = إيرادات مرتجعات مشتريات
      const categoryId = isSalesReturn 
        ? '2f7d9e5a-9c1d-4b5e-8f7c-3a2b7e8d9c1d' // فئة مصروفات مرتجعات المبيعات - تحتاج لتعديل للقيمة الصحيحة
        : '3e8c7f6d-5b2a-4c9e-9f8b-2d3e7c9f8b2d'; // فئة إيرادات مرتجعات المشتريات - تحتاج لتعديل للقيمة الصحيحة
      
      // 2. إنشاء المعاملة المالية
      const formattedDate = typeof returnData.date === 'object' 
        ? format(returnData.date, 'yyyy-MM-dd')
        : returnData.date;

      const transactionData: Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'> = {
        type: transactionType,
        amount: returnData.amount,
        category_id: categoryId,
        date: formattedDate,
        payment_method: 'cash', // افتراضي، يمكن تعديله لاحقًا
        notes: returnData.notes || `مرتجع ${isSalesReturn ? 'مبيعات' : 'مشتريات'} من/إلى ${returnData.party_name || 'غير محدد'}`,
        reference_id: returnData.id,
        reference_type: 'return'
      };
      
      // 3. حفظ المعاملة في قاعدة البيانات
      const { data: transaction, error: transactionError } = await supabase
        .from('financial_transactions')
        .insert(transactionData)
        .select()
        .single();
      
      if (transactionError) {
        throw transactionError;
      }
      
      // 4. تحديث حساب الطرف (العميل/المورد) إذا وجد
      if (returnData.party_id) {
        await this.updatePartyBalanceAfterReturn(
          returnData.party_id, 
          returnData.amount, 
          returnData.return_type
        );
      }
      
      toast.success(`تم تسجيل معاملة مالية لمرتجع تلقائيًا`);
      return true;
    } catch (error) {
      console.error('Error handling return confirmation:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة المالية للمرتجع');
      return false;
    }
  }
  
  /**
   * تحديث رصيد الطرف (العميل/المورد) بعد تأكيد المرتجع
   */
  private async updatePartyBalanceAfterReturn(
    partyId: string, 
    amount: number, 
    returnType: 'sales_return' | 'purchase_return'
  ): Promise<void> {
    try {
      // 1. جلب رصيد الطرف الحالي
      const { data: balanceData, error: balanceError } = await supabase
        .from('party_balances')
        .select('balance')
        .eq('party_id', partyId)
        .single();
      
      if (balanceError && balanceError.code !== 'PGRST116') {
        // خطأ غير "لا توجد نتائج"
        throw balanceError;
      }
      
      let currentBalance = balanceData?.balance || 0;
      let newBalance = currentBalance;
      
      // 2. حساب الرصيد الجديد
      // - مرتجع مبيعات: خصم من رصيد العميل (العميل مدين لنا بمبلغ أقل)
      // - مرتجع مشتريات: إضافة إلى رصيد المورد (نحن مدينون للمورد بمبلغ أكبر)
      if (returnType === 'sales_return') {
        // مرتجع مبيعات - تقليل مديونية العميل
        newBalance = currentBalance - amount; // القيمة السالبة تمثل ما لنا عند العميل
      } else {
        // مرتجع مشتريات - زيادة مديونية المورد
        newBalance = currentBalance + amount; // القيمة الموجبة تمثل ما علينا للمورد
      }
      
      // 3. تحديث الرصيد في قاعدة البيانات
      if (balanceData) {
        // تحديث السجل الموجود
        const { error: updateError } = await supabase
          .from('party_balances')
          .update({ 
            balance: newBalance,
            last_updated: new Date().toISOString()
          })
          .eq('party_id', partyId);
          
        if (updateError) {
          throw updateError;
        }
      } else {
        // إنشاء سجل جديد
        const { error: insertError } = await supabase
          .from('party_balances')
          .insert({ 
            party_id: partyId,
            balance: newBalance,
            last_updated: new Date().toISOString()
          });
          
        if (insertError) {
          throw insertError;
        }
      }
      
      // 4. إضافة سجل في دفتر الحسابات
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          party_id: partyId,
          transaction_id: crypto.randomUUID(),
          transaction_type: returnType === 'sales_return' ? 'sales_return' : 'purchase_return',
          date: new Date().toISOString().split('T')[0],
          debit: returnType === 'sales_return' ? 0 : amount,
          credit: returnType === 'sales_return' ? amount : 0,
          balance_after: newBalance
        });
        
      if (ledgerError) {
        throw ledgerError;
      }
      
    } catch (error) {
      console.error(`Error updating party balance after return:`, error);
      toast.error('حدث خطأ أثناء تحديث رصيد الطرف بعد المرتجع');
    }
  }
  
  /**
   * معالجة إلغاء مرتجع
   * عند إلغاء مرتجع، يتم عكس المعاملة المالية المرتبطة به
   */
  public async handleReturnCancellation(returnData: any): Promise<boolean> {
    try {
      // 1. البحث عن المعاملة المالية المرتبطة
      const { data: linkedTransactions, error: findError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('reference_id', returnData.id)
        .eq('reference_type', 'return');
      
      if (findError) {
        throw findError;
      }
      
      if (!linkedTransactions || linkedTransactions.length === 0) {
        toast.error(`لم يتم العثور على أي معاملات مالية مرتبطة بالمرتجع رقم ${returnData.id}`);
        return false;
      }
      
      // نفترض وجود معاملة واحدة فقط مرتبطة
      const transaction = linkedTransactions[0];
      
      // 2. إنشاء معاملة عكسية
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const formattedDate = typeof returnData.date === 'object' 
        ? format(returnData.date, 'yyyy-MM-dd')
        : returnData.date;

      const reverseTransactionData: Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'> = {
        type: transaction.type === 'income' ? 'expense' : 'income', // عكس النوع
        amount: returnData.amount,
        category_id: transaction.category_id,
        date: currentDate,
        payment_method: transaction.payment_method,
        notes: `عكس ${transaction.type === 'income' ? 'إيراد' : 'مصروف'} مرتجع ملغي رقم ${returnData.id} ${returnData.party_name ? 'لـ/من ' + returnData.party_name : ''}`,
        reference_id: returnData.id,
        reference_type: `reverse_return` // نوع مرجعي يشير إلى أنها معاملة عكسية
      };
      
      const { data: reverseTransaction, error: reverseError } = await supabase
        .from('financial_transactions')
        .insert(reverseTransactionData)
        .select()
        .single();
      
      if (reverseError) {
        throw reverseError;
      }
      
      // 3. عكس تأثير المرتجع على رصيد الطرف
      if (returnData.party_id) {
        await this.reversePartyBalanceAfterReturnCancellation(
          returnData.party_id, 
          returnData.amount, 
          returnData.return_type
        );
      }
      
      toast.success(`تم تسجيل معاملة عكسية لمرتجع ملغي رقم ${returnData.id}`);
      return true;
    } catch (error) {
      console.error(`Error handling return cancellation:`, error);
      toast.error(`حدث خطأ أثناء معالجة إلغاء المرتجع رقم ${returnData.id}`);
      return false;
    }
  }
  
  /**
   * عكس تأثير المرتجع على رصيد الطرف بعد إلغاء المرتجع
   */
  private async reversePartyBalanceAfterReturnCancellation(
    partyId: string, 
    amount: number, 
    returnType: 'sales_return' | 'purchase_return'
  ): Promise<void> {
    try {
      // 1. جلب رصيد الطرف الحالي
      const { data: balanceData, error: balanceError } = await supabase
        .from('party_balances')
        .select('balance')
        .eq('party_id', partyId)
        .single();
      
      if (balanceError) {
        throw balanceError;
      }
      
      let currentBalance = balanceData.balance;
      let newBalance = currentBalance;
      
      // 2. حساب الرصيد الجديد (عكس التغيير السابق)
      // - إلغاء مرتجع مبيعات: إضافة إلى رصيد العميل (العميل مدين لنا بمبلغ أكبر)
      // - إلغاء مرتجع مشتريات: خصم من رصيد المورد (نحن مدينون للمورد بمبلغ أقل)
      if (returnType === 'sales_return') {
        // إلغاء مرتجع مبيعات - زيادة مديونية العميل
        newBalance = currentBalance + amount;
      } else {
        // إلغاء مرتجع مشتريات - تقليل مديونية المورد
        newBalance = currentBalance - amount;
      }
      
      // 3. تحديث الرصيد في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('party_balances')
        .update({ 
          balance: newBalance,
          last_updated: new Date().toISOString()
        })
        .eq('party_id', partyId);
        
      if (updateError) {
        throw updateError;
      }
      
      // 4. إضافة سجل في دفتر الحسابات
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          party_id: partyId,
          transaction_id: crypto.randomUUID(),
          transaction_type: `${returnType}_cancellation`,
          date: new Date().toISOString().split('T')[0],
          debit: returnType === 'sales_return' ? amount : 0, // عكس المدين والدائن
          credit: returnType === 'sales_return' ? 0 : amount,
          balance_after: newBalance
        });
        
      if (ledgerError) {
        throw ledgerError;
      }
      
    } catch (error) {
      console.error(`Error reversing party balance after return cancellation:`, error);
      toast.error('حدث خطأ أثناء عكس تأثير المرتجع على رصيد الطرف');
    }
  }
  
  /**
   * معالجة إلغاء معاملة تجارية (فاتورة أو دفعة)
   * عند إلغاء فاتورة أو دفعة، يتم عكس المعاملة المالية المرتبطة بها
   */
  public async handleCommercialCancellation(
    id: string,
    type: 'invoice' | 'payment',
    commercialType: string,
    amount: number,
    partyName?: string,
    date?: string
  ): Promise<boolean> {
    try {
      // 1. البحث عن المعاملة المالية المرتبطة
      const { data: linkedTransactions, error: findError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('reference_id', id)
        .eq('reference_type', type);
      
      if (findError) {
        throw findError;
      }
      
      if (!linkedTransactions || linkedTransactions.length === 0) {
        toast.error(`لم يتم العثور على أي معاملات مالية مرتبطة ب${commercialType} رقم ${id}`);
        return true; // لا يوجد خطأ، ولكن لا توجد معاملات مرتبطة
      }
      
      // نفترض وجود معاملة واحدة فقط مرتبطة
      const transaction = linkedTransactions[0];
      
      // 2. إنشاء معاملة عكسية
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const transactionDate = date || currentDate;

      const reverseTransactionData: Omit<Transaction, 'id' | 'created_at' | 'category_name' | 'category_type'> = {
        type: transaction.type === 'income' ? 'expense' : 'income',
        amount: amount,
        category_id: transaction.category_id,
        date: transactionDate,
        payment_method: transaction.payment_method,
        notes: `عكس ${transaction.type === 'income' ? 'إيراد' : 'مصروف'} ${commercialType} ملغاة رقم ${id} ${partyName ? 'لـ/من ' + partyName : ''}`,
        reference_id: id,
        reference_type: `reverse_${type}` // نوع مرجعي يشير إلى أنها معاملة عكسية
      };
      
      const { data: reverseTransaction, error: reverseError } = await supabase
        .from('financial_transactions')
        .insert(reverseTransactionData)
        .select()
        .single();
      
      if (reverseError) {
        throw reverseError;
      }
      
      // 3. حذف المعاملة الأصلية (اختياري)
      const { error: deleteError } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', transaction.id);
      
      if (deleteError) {
        console.error(`Error deleting original transaction ${transaction.id}:`, deleteError);
        toast.error(`حدث خطأ أثناء حذف المعاملة الأصلية رقم ${transaction.id}`);
        return false;
      }
      
      toast.success(`تم تسجيل معاملة عكسية ل${commercialType} ملغاة رقم ${id}`);
      return true;
    } catch (error) {
      console.error(`Error handling ${commercialType} cancellation:`, error);
      toast.error(`حدث خطأ أثناء معالجة إلغاء ${commercialType} رقم ${id}`);
      return false;
    }
  }
  
  /**
   * البحث عن المعاملات المالية المرتبطة بمعاملة تجارية
   */
  public async findLinkedFinancialTransactions(commercialId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .or(`reference_id.eq.${commercialId},reference_type.eq.${commercialId}`);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error finding linked financial transactions:', error);
      toast.error('حدث خطأ أثناء البحث عن المعاملات المالية المرتبطة');
      return [];
    }
  }
}

export default FinancialCommercialBridge;
