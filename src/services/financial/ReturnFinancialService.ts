
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Return } from "@/types/returns";
import FinancialTransactionService from "./FinancialTransactionService";
import ProfitService from "@/services/commercial/profit/ProfitService";

/**
 * خدمة للتعامل مع الآثار المالية للمرتجعات
 * تطبق المبادئ المحاسبية الصحيحة للمرتجعات
 */
class ReturnFinancialService {
  private static instance: ReturnFinancialService;
  private transactionService: FinancialTransactionService;
  private profitService: ProfitService;
  
  private constructor() {
    this.transactionService = FinancialTransactionService.getInstance();
    this.profitService = ProfitService.getInstance();
  }
  
  public static getInstance(): ReturnFinancialService {
    if (!ReturnFinancialService.instance) {
      ReturnFinancialService.instance = new ReturnFinancialService();
    }
    return ReturnFinancialService.instance;
  }
  
  /**
   * معالجة الأثر المالي لتأكيد مرتجع
   * تتبع المبادئ المحاسبية الصحيحة:
   * - مرتجع مبيعات: تخفيض الإيرادات والأرباح
   * - مرتجع مشتريات: تخفيض المصروفات
   */
  public async handleReturnConfirmation(returnData: Return): Promise<boolean> {
    try {
      if (!returnData.invoice_id) {
        console.log("لا يوجد فاتورة مرتبطة بالمرتجع، سيتم معالجته كمعاملة مستقلة");
        return await this.handleStandaloneReturn(returnData);
      }
      
      // الحصول على معلومات الفاتورة المرتبطة
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('invoice_type, date, total_amount, payment_status')
        .eq('id', returnData.invoice_id)
        .single();
      
      if (invoiceError) {
        console.error("خطأ في الحصول على بيانات الفاتورة المرتبطة:", invoiceError);
        return false;
      }
      
      if (returnData.return_type === 'sales_return') {
        // مرتجع مبيعات - تخفيض الإيرادات والأرباح
        return await this.handleSalesReturn(returnData, invoice);
      } else {
        // مرتجع مشتريات - تخفيض المصروفات
        return await this.handlePurchaseReturn(returnData, invoice);
      }
    } catch (error) {
      console.error("خطأ في معالجة الأثر المالي للمرتجع:", error);
      toast.error("حدث خطأ أثناء معالجة الأثر المالي للمرتجع");
      return false;
    }
  }
  
  /**
   * معالجة مرتجع مبيعات - تخفيض الإيرادات والأرباح
   */
  private async handleSalesReturn(returnData: Return, invoice: any): Promise<boolean> {
    try {
      // 1. تخفيض الأرباح المرتبطة بالفاتورة
      await this.reduceInvoiceProfit(returnData);
      
      // 2. إنشاء معاملة تخفيض للإيرادات (وليس مصروف)
      const adjustmentNote = `تخفيض إيرادات بسبب مرتجع مبيعات رقم ${returnData.id} للعميل ${returnData.party_name || 'غير محدد'}`;
      
      // البحث عن تصنيف مخصص لتخفيض الإيرادات، أو استخدام تصنيف افتراضي
      const { data: categories } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('name', 'تخفيض إيرادات المبيعات')
        .eq('type', 'income')
        .limit(1);
      
      let categoryId;
      if (categories && categories.length > 0) {
        categoryId = categories[0].id;
      } else {
        // إنشاء تصنيف جديد إذا لم يكن موجودًا
        const { data: newCategory, error } = await supabase
          .from('financial_categories')
          .insert({
            name: 'تخفيض إيرادات المبيعات',
            type: 'income',
            description: 'تخفيض الإيرادات بسبب مرتجعات المبيعات'
          })
          .select()
          .single();
          
        if (error) throw error;
        categoryId = newCategory.id;
      }
      
      // إنشاء معاملة تخفيض للإيرادات (بقيمة سالبة)
      await this.transactionService.createTransaction({
        date: returnData.date,
        amount: returnData.amount,
        type: 'income',
        category_id: categoryId,
        payment_method: 'cash', // يمكن تعديله حسب طريقة الدفع الأصلية
        reference_id: returnData.id,
        reference_type: 'return',
        notes: adjustmentNote,
        // هذه العلامة تشير إلى أن هذه معاملة تخفيض وليست إيراد عادي
        is_reduction: true
      });
      
      return true;
    } catch (error) {
      console.error("خطأ في معالجة مرتجع المبيعات:", error);
      return false;
    }
  }
  
  /**
   * معالجة مرتجع مشتريات - تخفيض المصروفات
   */
  private async handlePurchaseReturn(returnData: Return, invoice: any): Promise<boolean> {
    try {
      const adjustmentNote = `تخفيض مصروفات بسبب مرتجع مشتريات رقم ${returnData.id} للمورد ${returnData.party_name || 'غير محدد'}`;
      
      // البحث عن تصنيف مخصص لتخفيض المصروفات، أو استخدام تصنيف افتراضي
      const { data: categories } = await supabase
        .from('financial_categories')
        .select('id')
        .eq('name', 'تخفيض مصروفات المشتريات')
        .eq('type', 'expense')
        .limit(1);
      
      let categoryId;
      if (categories && categories.length > 0) {
        categoryId = categories[0].id;
      } else {
        // إنشاء تصنيف جديد إذا لم يكن موجودًا
        const { data: newCategory, error } = await supabase
          .from('financial_categories')
          .insert({
            name: 'تخفيض مصروفات المشتريات',
            type: 'expense',
            description: 'تخفيض المصروفات بسبب مرتجعات المشتريات'
          })
          .select()
          .single();
          
        if (error) throw error;
        categoryId = newCategory.id;
      }
      
      // إنشاء معاملة تخفيض للمصروفات (بقيمة سالبة)
      await this.transactionService.createTransaction({
        date: returnData.date,
        amount: returnData.amount,
        type: 'expense',
        category_id: categoryId,
        payment_method: 'cash', // يمكن تعديله حسب طريقة الدفع الأصلية
        reference_id: returnData.id,
        reference_type: 'return',
        notes: adjustmentNote,
        // هذه العلامة تشير إلى أن هذه معاملة تخفيض وليست مصروف عادي
        is_reduction: true
      });
      
      return true;
    } catch (error) {
      console.error("خطأ في معالجة مرتجع المشتريات:", error);
      return false;
    }
  }
  
  /**
   * معالجة مرتجع غير مرتبط بفاتورة
   */
  private async handleStandaloneReturn(returnData: Return): Promise<boolean> {
    try {
      // ملاحظة: في هذه الحالة، قد نحتاج إلى معالجة أكثر تخصصًا
      // لكن المبدأ نفسه ينطبق: تخفيض الإيرادات أو المصروفات وليس إنشاء معاملة معاكسة
      
      if (returnData.return_type === 'sales_return') {
        // مرتجع مبيعات مستقل
        const adjustmentNote = `تخفيض إيرادات بسبب مرتجع مبيعات مستقل رقم ${returnData.id}`;
        
        // البحث عن تصنيف مناسب
        const { data: categories } = await supabase
          .from('financial_categories')
          .select('id')
          .eq('name', 'تخفيض إيرادات متنوعة')
          .eq('type', 'income')
          .limit(1);
        
        let categoryId;
        if (categories && categories.length > 0) {
          categoryId = categories[0].id;
        } else {
          // إنشاء تصنيف جديد
          const { data: newCategory, error } = await supabase
            .from('financial_categories')
            .insert({
              name: 'تخفيض إيرادات متنوعة',
              type: 'income',
              description: 'تخفيض إيرادات بسبب مرتجعات غير مرتبطة بفواتير'
            })
            .select()
            .single();
            
          if (error) throw error;
          categoryId = newCategory.id;
        }
        
        // إنشاء معاملة تخفيض للإيرادات
        await this.transactionService.createTransaction({
          date: returnData.date,
          amount: returnData.amount,
          type: 'income',
          category_id: categoryId,
          payment_method: 'cash',
          reference_id: returnData.id,
          reference_type: 'return',
          notes: adjustmentNote,
          is_reduction: true
        });
      } else {
        // مرتجع مشتريات مستقل
        const adjustmentNote = `تخفيض مصروفات بسبب مرتجع مشتريات مستقل رقم ${returnData.id}`;
        
        // البحث عن تصنيف مناسب
        const { data: categories } = await supabase
          .from('financial_categories')
          .select('id')
          .eq('name', 'تخفيض مصروفات متنوعة')
          .eq('type', 'expense')
          .limit(1);
        
        let categoryId;
        if (categories && categories.length > 0) {
          categoryId = categories[0].id;
        } else {
          // إنشاء تصنيف جديد
          const { data: newCategory, error } = await supabase
            .from('financial_categories')
            .insert({
              name: 'تخفيض مصروفات متنوعة',
              type: 'expense',
              description: 'تخفيض مصروفات بسبب مرتجعات غير مرتبطة بفواتير'
            })
            .select()
            .single();
            
          if (error) throw error;
          categoryId = newCategory.id;
        }
        
        // إنشاء معاملة تخفيض للمصروفات
        await this.transactionService.createTransaction({
          date: returnData.date,
          amount: returnData.amount,
          type: 'expense',
          category_id: categoryId,
          payment_method: 'cash',
          reference_id: returnData.id,
          reference_type: 'return',
          notes: adjustmentNote,
          is_reduction: true
        });
      }
      
      return true;
    } catch (error) {
      console.error("خطأ في معالجة المرتجع المستقل:", error);
      return false;
    }
  }
  
  /**
   * إلغاء الأثر المالي لمرتجع تم إلغاؤه
   */
  public async handleReturnCancellation(returnData: Return): Promise<boolean> {
    try {
      // البحث عن المعاملات المالية المرتبطة بالمرتجع
      const { data: transactions, error } = await supabase
        .from('financial_transactions')
        .select('id')
        .eq('reference_id', returnData.id)
        .eq('reference_type', 'return');
      
      if (error) throw error;
      
      // حذف المعاملات المالية المرتبطة
      if (transactions && transactions.length > 0) {
        for (const transaction of transactions) {
          await this.transactionService.deleteTransaction(transaction.id);
        }
      }
      
      // إذا كان مرتجع مبيعات، نعيد الأرباح إلى ما كانت عليه
      if (returnData.return_type === 'sales_return' && returnData.invoice_id) {
        await this.restoreInvoiceProfit(returnData);
      }
      
      return true;
    } catch (error) {
      console.error("خطأ في إلغاء الأثر المالي للمرتجع:", error);
      toast.error("حدث خطأ أثناء إلغاء الأثر المالي للمرتجع");
      return false;
    }
  }
  
  /**
   * تخفيض الأرباح المرتبطة بفاتورة البيع
   */
  private async reduceInvoiceProfit(returnData: Return): Promise<void> {
    if (!returnData.invoice_id) return;
    
    try {
      // الحصول على بيانات الربح الحالية
      const profitData = await this.profitService.getProfitByInvoiceId(returnData.invoice_id);
      
      if (!profitData) {
        console.log("لا توجد بيانات ربح مسجلة للفاتورة المرتبطة بالمرتجع");
        return;
      }
      
      // حساب نسبة المرتجع من إجمالي الفاتورة
      const returnPercentage = returnData.amount / profitData.total_sales;
      
      // تخفيض الأرباح والمبيعات بنسبة المرتجع
      const profitReduction = profitData.profit_amount * returnPercentage;
      const salesReduction = returnData.amount;
      
      // تحديث بيانات الربح
      const { error } = await supabase
        .from('profits')
        .update({
          total_sales: profitData.total_sales - salesReduction,
          profit_amount: profitData.profit_amount - profitReduction,
          profit_percentage: (profitData.profit_amount - profitReduction) / (profitData.total_sales - salesReduction) * 100
        })
        .eq('invoice_id', returnData.invoice_id);
      
      if (error) throw error;
      
      console.log(`تم تخفيض الأرباح بمقدار ${profitReduction} نتيجة المرتجع`);
    } catch (error) {
      console.error("خطأ في تخفيض الأرباح:", error);
      throw error;
    }
  }
  
  /**
   * استعادة الأرباح بعد إلغاء المرتجع
   */
  private async restoreInvoiceProfit(returnData: Return): Promise<void> {
    if (!returnData.invoice_id) return;
    
    try {
      // الحصول على بيانات الربح الحالية
      const profitData = await this.profitService.getProfitByInvoiceId(returnData.invoice_id);
      
      if (!profitData) {
        console.log("لا توجد بيانات ربح مسجلة للفاتورة المرتبطة بالمرتجع");
        return;
      }
      
      // الحصول على بيانات الفاتورة الأصلية
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('id', returnData.invoice_id)
        .single();
      
      if (invoiceError) throw invoiceError;
      
      // إعادة حساب إجمالي المبيعات والأرباح
      const originalSales = invoice.total_amount;
      const currentCost = profitData.total_cost;
      const newProfit = originalSales - currentCost;
      const newProfitPercentage = newProfit / originalSales * 100;
      
      // تحديث بيانات الربح
      const { error } = await supabase
        .from('profits')
        .update({
          total_sales: originalSales,
          profit_amount: newProfit,
          profit_percentage: newProfitPercentage
        })
        .eq('invoice_id', returnData.invoice_id);
      
      if (error) throw error;
      
      console.log(`تم استعادة الأرباح بعد إلغاء المرتجع`);
    } catch (error) {
      console.error("خطأ في استعادة الأرباح:", error);
      throw error;
    }
  }
}

export default ReturnFinancialService;
