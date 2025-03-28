
import { Payment, Invoice, Return } from '@/services/commercial/CommercialTypes';
import FinancialTransactionService from './FinancialTransactionService';
import FinancialCategoryService from './FinancialCategoryService';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";

/**
 * خدمة ربط بين النظام المالي ونظام المعاملات التجارية
 * تتولى تحويل المعاملات التجارية إلى معاملات مالية
 */
class FinancialCommercialBridge {
  private static instance: FinancialCommercialBridge;
  private transactionService: FinancialTransactionService;
  private categoryService: FinancialCategoryService;
  
  private constructor() {
    this.transactionService = FinancialTransactionService.getInstance();
    this.categoryService = FinancialCategoryService.getInstance();
  }
  
  public static getInstance(): FinancialCommercialBridge {
    if (!FinancialCommercialBridge.instance) {
      FinancialCommercialBridge.instance = new FinancialCommercialBridge();
    }
    return FinancialCommercialBridge.instance;
  }
  
  /**
   * تحويل فاتورة تجارية إلى معاملة مالية
   */
  public async handleInvoiceConfirmation(invoice: Invoice): Promise<boolean> {
    try {
      // تحديد نوع المعاملة المالية (إيراد للمبيعات، مصروف للمشتريات)
      const transactionType: 'income' | 'expense' = invoice.invoice_type === 'sale' ? 'income' : 'expense';
      
      // تحديد نوع المعاملة التجارية
      const commercialType = invoice.invoice_type === 'sale' ? 'sale_invoice' : 'purchase_invoice';
      
      // الحصول على الفئة المناسبة
      const category = await this.categoryService.getDefaultCategoryForCommercialType(commercialType);
      
      if (!category) {
        console.error('No suitable category found for invoice type:', invoice.invoice_type);
        return false;
      }
      
      // إنشاء معاملة مالية
      const transaction = await this.transactionService.createTransactionFromCommercial(
        invoice.total_amount,
        transactionType,
        category.id,
        'cash', // افتراضي، يمكن تحديثه لاحقًا
        invoice.id,
        commercialType,
        `فاتورة ${invoice.invoice_type === 'sale' ? 'مبيعات' : 'مشتريات'} رقم: ${invoice.id.substring(0, 8)}`,
        new Date(invoice.date)
      );
      
      return !!transaction;
    } catch (error) {
      console.error('Error handling invoice confirmation:', error);
      toast.error('حدث خطأ أثناء تحويل الفاتورة إلى معاملة مالية');
      return false;
    }
  }
  
  /**
   * تحويل دفعة تجارية إلى معاملة مالية
   */
  public async handlePaymentConfirmation(payment: Payment): Promise<boolean> {
    try {
      // تحديد نوع المعاملة المالية (إيراد للتحصيل، مصروف للصرف)
      const transactionType: 'income' | 'expense' = payment.payment_type === 'collection' ? 'income' : 'expense';
      
      // تحديد نوع المعاملة التجارية
      const commercialType = payment.payment_type === 'collection' ? 'payment_collection' : 'payment_disbursement';
      
      // تحديد طريقة الدفع
      let paymentMethod = 'cash';
      if (payment.method === 'bank_transfer') {
        paymentMethod = 'bank';
      } else if (payment.method === 'check') {
        paymentMethod = 'bank'; // نفترض أن الشيكات تدخل في الحساب البنكي
      }
      
      // الحصول على الفئة المناسبة
      const category = await this.categoryService.getDefaultCategoryForCommercialType(commercialType);
      
      if (!category) {
        console.error('No suitable category found for payment type:', payment.payment_type);
        return false;
      }
      
      // إنشاء معاملة مالية
      const transaction = await this.transactionService.createTransactionFromCommercial(
        payment.amount,
        transactionType,
        category.id,
        paymentMethod,
        payment.id,
        commercialType,
        `${payment.payment_type === 'collection' ? 'تحصيل' : 'صرف'} دفعة من ${payment.party_name || 'طرف تجاري'}`,
        new Date(payment.date)
      );
      
      return !!transaction;
    } catch (error) {
      console.error('Error handling payment confirmation:', error);
      toast.error('حدث خطأ أثناء تحويل الدفعة إلى معاملة مالية');
      return false;
    }
  }
  
  /**
   * تحويل إلغاء فاتورة أو دفعة إلى معاملة مالية عكسية
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
      // تحديد نوع المعاملة المالية (نعكس نوع المعاملة الأصلية)
      let transactionType: 'income' | 'expense';
      let categoryComType: string;
      
      if (type === 'invoice') {
        if (commercialType === 'sale') {
          transactionType = 'expense'; // عكس الإيراد الأصلي
          categoryComType = 'purchase_invoice'; // نستخدم فئة المشتريات للعكس
        } else {
          transactionType = 'income'; // عكس المصروف الأصلي
          categoryComType = 'sale_invoice'; // نستخدم فئة المبيعات للعكس
        }
      } else { // payment
        if (commercialType === 'collection') {
          transactionType = 'expense'; // عكس الإيراد الأصلي
          categoryComType = 'payment_disbursement';
        } else {
          transactionType = 'income'; // عكس المصروف الأصلي
          categoryComType = 'payment_collection';
        }
      }
      
      // الحصول على الفئة المناسبة
      const category = await this.categoryService.getDefaultCategoryForCommercialType(categoryComType);
      
      if (!category) {
        console.error('No suitable category found for cancellation type:', categoryComType);
        return false;
      }
      
      // إنشاء معاملة مالية عكسية
      const notes = type === 'invoice'
        ? `إلغاء فاتورة ${commercialType === 'sale' ? 'مبيعات' : 'مشتريات'} رقم: ${id.substring(0, 8)}`
        : `إلغاء ${commercialType === 'collection' ? 'تحصيل' : 'صرف'} دفعة من ${partyName || 'طرف تجاري'}`;
      
      const transaction = await this.transactionService.createTransactionFromCommercial(
        amount,
        transactionType,
        category.id,
        'cash', // نستخدم نفس طريقة الدفع، لكن يمكن تحسينها لاحقًا
        id,
        `cancel_${type}_${commercialType}`,
        notes,
        date ? new Date(date) : new Date()
      );
      
      return !!transaction;
    } catch (error) {
      console.error('Error handling commercial cancellation:', error);
      toast.error('حدث خطأ أثناء تحويل إلغاء المعاملة التجارية إلى معاملة مالية');
      return false;
    }
  }
  
  /**
   * البحث عن المعاملات المالية المرتبطة بمعاملة تجارية
   */
  public async findLinkedFinancialTransactions(
    commercialId: string
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories (name, type)
        `)
        .eq('reference_id', commercialId)
        .order('date');
      
      if (error) {
        throw error;
      }
      
      return data.map(item => ({
        id: item.id,
        date: item.date,
        amount: item.amount,
        type: item.type,
        category_id: item.category_id,
        category_name: item.financial_categories?.name || '',
        category_type: item.financial_categories?.type || item.type,
        payment_method: item.payment_method,
        reference_id: item.reference_id,
        reference_type: item.reference_type,
        notes: item.notes
      }));
    } catch (error) {
      console.error('Error finding linked financial transactions:', error);
      return [];
    }
  }
}

export default FinancialCommercialBridge;
