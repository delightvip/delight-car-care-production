import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FinancialTransactionService from "./FinancialTransactionService";
import ReturnFinancialService from "./ReturnFinancialService";
import { format } from "date-fns";

/**
 * جسر ربط بين المعاملات التجارية والمعاملات المالية
 * يتولى مسؤولية ترجمة المعاملات التجارية إلى معاملات مالية
 */
class FinancialCommercialBridge {
  private static instance: FinancialCommercialBridge;
  private transactionService: FinancialTransactionService;
  private returnFinancialService: ReturnFinancialService;
  
  private constructor() {
    this.transactionService = FinancialTransactionService.getInstance();
    this.returnFinancialService = ReturnFinancialService.getInstance();
  }
  
  public static getInstance(): FinancialCommercialBridge {
    if (!FinancialCommercialBridge.instance) {
      FinancialCommercialBridge.instance = new FinancialCommercialBridge();
    }
    return FinancialCommercialBridge.instance;
  }
  
  /**
   * معالجة تأكيد فاتورة تجارية
   * @param invoice بيانات الفاتورة
   */
  public async handleInvoiceConfirmation(invoice: any): Promise<boolean> {
    try {
      // تحديد التصنيف المالي المناسب بناءً على نوع الفاتورة
      const categoryName = invoice.invoice_type === 'sale' ? 'إيرادات المبيعات' : 'مصروفات المشتريات';
      const categoryType = invoice.invoice_type === 'sale' ? 'income' : 'expense';
      
      // البحث عن التصنيف المالي
      const { data: categories } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('name', categoryName)
        .eq('type', categoryType)
        .limit(1);
      
      let categoryId;
      if (categories && categories.length > 0) {
        categoryId = categories[0].id;
      } else {
        // إنشاء تصنيف جديد إذا لم يكن موجودًا
        const { data: newCategory, error } = await supabase
          .from('financial_categories')
          .insert({
            name: categoryName,
            type: categoryType,
            description: `تسجيل ${categoryName.replace('إيرادات', 'الإيرادات').replace('مصروفات', 'المصروفات')}`
          })
          .select()
          .single();
          
        if (error) throw error;
        categoryId = newCategory.id;
      }
      
      // تسجيل المعاملة المالية
      const transactionType = invoice.invoice_type === 'sale' ? 'income' : 'expense';
      const paymentMethod = invoice.payment_method || 'cash';
      const notes = `فاتورة ${invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'} رقم ${invoice.id} للعميل ${invoice.party_name || 'غير محدد'}`;
      
      await this.transactionService.createTransactionFromCommercial(
        invoice.total_amount,
        transactionType,
        categoryId,
        paymentMethod,
        invoice.id,
        'invoice',
        notes,
        new Date(invoice.date)
      );
      
      return true;
    } catch (error) {
      console.error('Error handling invoice confirmation:', error);
      toast.error('حدث خطأ أثناء معالجة تأكيد الفاتورة ماليًا');
      return false;
    }
  }
  
  /**
   * معالجة تأكيد دفعة تجارية
   * @param payment بيانات الدفعة
   */
  public async handlePaymentConfirmation(payment: any): Promise<boolean> {
    try {
      // تحديد نوع المعاملة (إيراد أو مصروف) بناءً على نوع الدفعة
      const categoryName = payment.payment_type === 'payment_received' ? 'مدفوعات مستلمة' : 'مدفوعات صادرة';
      const categoryType = payment.payment_type === 'payment_received' ? 'income' : 'expense';
      
      // البحث عن التصنيف المالي
      const { data: categories } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('name', categoryName)
        .eq('type', categoryType)
        .limit(1);
      
      let categoryId;
      if (categories && categories.length > 0) {
        categoryId = categories[0].id;
      } else {
        // إنشاء تصنيف جديد إذا لم يكن موجودًا
        const { data: newCategory, error } = await supabase
          .from('financial_categories')
          .insert({
            name: categoryName,
            type: categoryType,
            description: `تسجيل ${categoryName.replace('مدفوعات', 'المدفوعات')}`
          })
          .select()
          .single();
          
        if (error) throw error;
        categoryId = newCategory.id;
      }
      
      // تسجيل المعاملة المالية
      const transactionType = payment.payment_type === 'payment_received' ? 'income' : 'expense';
      const paymentMethod = payment.payment_method || 'cash';
      const notes = `دفعة ${payment.payment_type === 'payment_received' ? 'مستلمة' : 'صادرة'} رقم ${payment.id} من/إلى ${payment.party_name || 'غير محدد'}`;
      
      await this.transactionService.createTransactionFromCommercial(
        payment.amount,
        transactionType,
        categoryId,
        paymentMethod,
        payment.id,
        'payment',
        notes,
        new Date(payment.date)
      );
      
      return true;
    } catch (error) {
      console.error('Error handling payment confirmation:', error);
      toast.error('حدث خطأ أثناء معالجة تأكيد الدفعة ماليًا');
      return false;
    }
  }
  
  /**
   * معالجة تأكيد مرتجع
   * @param returnData بيانات المرتجع
   */
  public async handleReturnConfirmation(returnData: any): Promise<boolean> {
    try {
      // استخدام الخدمة المخصصة للمرتجعات
      return await this.returnFinancialService.handleReturnConfirmation(returnData);
    } catch (error) {
      console.error('Error handling return confirmation:', error);
      toast.error('حدث خطأ أثناء معالجة تأكيد المرتجع ماليًا');
      return false;
    }
  }
  
  /**
   * معالجة إلغاء مرتجع
   * @param returnData بيانات المرتجع
   */
  public async handleReturnCancellation(returnData: any): Promise<boolean> {
    try {
      // استخدام الخدمة المخصصة للمرتجعات
      return await this.returnFinancialService.handleReturnCancellation(returnData);
    } catch (error) {
      console.error('Error handling return cancellation:', error);
      toast.error('حدث خطأ أثناء معالجة إلغاء المرتجع ماليًا');
      return false;
    }
  }
  
  /**
   * معالجة إلغاء معاملة تجارية
   * @param id معرف المعاملة
   * @param type نوع المعاملة (فاتورة أو دفعة)
   * @param commercialType نوع المعاملة التجارية (بيع، شراء، إلخ)
   * @param amount مبلغ المعاملة
   * @param partyName اسم الطرف (اختياري)
   * @param date تاريخ المعاملة (اختياري)
   */
  public async handleCommercialCancellation(
    id: string,
    type: 'invoice' | 'payment' | 'return',
    commercialType: string,
    amount: number,
    partyName?: string,
    date?: string
  ): Promise<boolean> {
    try {
      // البحث عن المعاملات المالية المرتبطة
      const { data: transactions, error } = await supabase
        .from('financial_transactions')
        .select('id')
        .eq('reference_id', id)
        .eq('reference_type', type);
      
      if (error) throw error;
      
      // حذف المعاملات المالية المرتبطة
      if (transactions && transactions.length > 0) {
        for (const transaction of transactions) {
          await this.transactionService.deleteTransaction(transaction.id);
        }
        
        console.log(`تم إلغاء ${transactions.length} معاملة مالية مرتبطة`);
      }
      
      return true;
    } catch (error) {
      console.error('Error handling commercial cancellation:', error);
      toast.error('حدث خطأ أثناء معالجة إلغاء المعاملة التجارية ماليًا');
      return false;
    }
  }
  
  /**
   * البحث عن المعاملات المالية المرتبطة بمعاملة تجارية
   * @param commercialId معرف المعاملة التجارية
   * @returns مصفوفة من المعاملات المالية المرتبطة
   */
  public async findLinkedFinancialTransactions(commercialId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories (name, type)
        `)
        .eq('reference_id', commercialId);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error finding linked financial transactions:', error);
      return [];
    }
  }
}

export default FinancialCommercialBridge;
