
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Transaction } from "./FinancialTypes";
import { format } from 'date-fns';

/**
 * خدمة للربط بين المعاملات المالية والمعاملات التجارية (فواتير، مدفوعات)
 * تعالج هذه الخدمة إنشاء المعاملات المالية المرتبطة تلقائيًا عند تأكيد الفواتير والمدفوعات التجارية،
 * بالإضافة إلى معالجة إلغاء هذه المعاملات عند إلغاء الفواتير والمدفوعات.
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
