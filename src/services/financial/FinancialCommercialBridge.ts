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

      // فحص ما إذا كانت هناك معاملة مالية مرتبطة بالفعل
      const { data: existingTransactions, error: checkError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('reference_id', invoice.id)
        .eq('reference_type', 'invoice');
      
      if (checkError) {
        throw checkError;
      }
      
      // إذا كانت هناك معاملة موجودة بالفعل، فلا نضيف معاملة جديدة
      if (existingTransactions && existingTransactions.length > 0) {
        console.log(`معاملة مالية موجودة بالفعل للفاتورة رقم ${invoice.invoice_number}`);
        this.notifyFinancialDataChange('invoice_already_processed');
        return true;
      }

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
      
      // إرسال إشعار بتغيير البيانات المالية
      this.notifyFinancialDataChange('invoice_confirmation');
      
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

      // فحص ما إذا كانت هناك معاملة مالية مرتبطة بالفعل
      const { data: existingTransactions, error: checkError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('reference_id', payment.id)
        .eq('reference_type', 'payment');
      
      if (checkError) {
        throw checkError;
      }
      
      // إذا كانت هناك معاملة موجودة بالفعل، فلا نضيف معاملة جديدة
      if (existingTransactions && existingTransactions.length > 0) {
        console.log(`معاملة مالية موجودة بالفعل للدفعة رقم ${payment.payment_number}`);
        this.notifyFinancialDataChange('payment_already_processed');
        return true;
      }

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
      
      // إرسال إشعار بتغيير البيانات المالية
      this.notifyFinancialDataChange('payment_confirmation');
      
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
   * تم تعديلها لإلغاء تأثيرها على لوحة التحكم المالية مع الاحتفاظ بتأثيرها على أرصدة العملاء/الموردين
   */
  public async handleReturnConfirmation(returnData: any): Promise<boolean> {
    try {
      // تحديد نوع المرتجع
      const isSalesReturn = returnData.return_type === 'sales_return';
      
      console.log(`معالجة تأكيد مرتجع ${isSalesReturn ? 'مبيعات' : 'مشتريات'} رقم ${returnData.id}`);
      
      // تحديث رصيد الطرف (العميل/المورد) فقط، بدون إنشاء معاملة مالية
      if (returnData.party_id) {
        await this.updatePartyBalanceAfterReturn(
          returnData.party_id, 
          returnData.amount, 
          returnData.return_type
        );
      }
      
      // تم إزالة كود إنشاء المعاملة المالية هنا لإلغاء تأثير المرتجعات على لوحة التحكم المالية
      
      // إرسال إشعار بتغيير البيانات المالية
      this.notifyFinancialDataChange('return_confirmation');
      
      return true;
    } catch (error) {
      console.error('Error handling return confirmation:', error);
      toast.error('حدث خطأ أثناء معالجة تأكيد المرتجع');
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
      
      if (balanceError) {
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
   * التحقق مما إذا كان يجب إنشاء معاملة مالية للعملية المحددة
   * @param referenceType نوع المعاملة المرجعي (مثل invoice, payment, return, return_cancellation)
   * @private
   */
  private shouldCreateFinancialTransaction(referenceType: string): boolean {
    // قائمة بأنواع المعاملات المرتبطة بالمرتجعات التي يجب استبعادها
    const excludedTypes = [
      'return',
      'reverse_return',
      'sales_return',
      'purchase_return',
      'return_cancellation',
      'sales_return_cancellation',
      'purchase_return_cancellation',
      'cancel_sales_return',
      'cancel_purchase_return'
    ];
    
    // فحص ما إذا كان نوع المعاملة مدرجًا في القائمة المستبعدة
    if (excludedTypes.includes(referenceType) || 
        referenceType.includes('_return_') || 
        referenceType.includes('return_') ||
        referenceType.includes('_return')) {
      console.log(`تم منع إنشاء معاملة مالية للعملية من نوع: ${referenceType}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * معالجة إلغاء مرتجع
   * تم تعديلها لإلغاء تأثيرها على لوحة التحكم المالية مع الاحتفاظ بتأثيرها على أرصدة العملاء/الموردين
   */
  public async handleReturnCancellation(returnData: any): Promise<boolean> {
    try {
      // تحديد نوع المرتجع
      const isSalesReturn = returnData.return_type === 'sales_return';
      
      console.log(`معالجة إلغاء مرتجع ${isSalesReturn ? 'مبيعات' : 'مشتريات'} رقم ${returnData.id}`);
      
      // خطوة 1: حذف أي معاملات مالية مرتبطة بهذا المرتجع تمامًا
      if (returnData.id) {
        const cleanupResult = await this.cleanupSpecificReturnTransactions(returnData.id);
        console.log(`نتيجة تنظيف المعاملات المالية للمرتجع ${returnData.id}: ${cleanupResult ? 'ناجح' : 'فشل'}`);
      }
      
      // خطوة 2: عكس تأثير المرتجع على رصيد الطرف (العميل/المورد) فقط
      if (returnData.party_id) {
        await this.reversePartyBalanceAfterReturnCancellation(
          returnData.party_id, 
          returnData.amount, 
          returnData.return_type
        );
      }
      
      // خطوة 3: ضمان إزالة أي معاملات مالية جديدة قد تم إنشاؤها بطريق الخطأ
      setTimeout(async () => {
        console.log('فحص إضافي للتأكد من عدم وجود معاملات مالية متعلقة بالمرتجع الملغي');
        await this.cleanupSpecificReturnTransactions(returnData.id);
      }, 500);
      
      // تحذير: لا تقم بإنشاء أي معاملات مالية عند إلغاء المرتجعات
      console.log('تم منع إنشاء معاملات مالية جديدة عند إلغاء المرتجع');
      
      // إرسال إشعار بتغيير البيانات المالية
      this.notifyFinancialDataChange('return_cancellation');
      
      return true;
    } catch (error) {
      console.error(`Error handling return cancellation:`, error);
      toast.error(`حدث خطأ أثناء معالجة إلغاء المرتجع رقم ${returnData.id}`);
      return false;
    }
  }

  /**
   * تنظيف المعاملات المالية لمرتجع محدد
   * @param returnId معرف المرتجع
   * @private
   */
  private async cleanupSpecificReturnTransactions(returnId: string): Promise<boolean> {
    try {
      console.log(`تنظيف المعاملات المالية للمرتجع رقم ${returnId}`);
      
      // 1. البحث الشامل عن أي معاملات مالية مرتبطة بالمرتجع
      const { data: relatedTransactions, error: findError } = await supabase
        .from('financial_transactions')
        .select('id, type, amount, reference_id, reference_type, notes')
        .or(`reference_id.eq.${returnId},notes.ilike.%مرتجع%${returnId}%,reference_type.like.%return%`);
      
      if (findError) {
        console.error(`خطأ في البحث عن المعاملات المالية المرتبطة بالمرتجع ${returnId}:`, findError);
        return false;
      }
      
      // 2. معالجة المعاملات المرتبطة إذا وجدت
      if (relatedTransactions && relatedTransactions.length > 0) {
        console.log(`وجدت ${relatedTransactions.length} معاملة مالية مرتبطة بالمرتجع ${returnId}`);
        
        // حذف كل معاملة على حدة
        for (const transaction of relatedTransactions) {
          const { error: deleteError } = await supabase
            .from('financial_transactions')
            .delete()
            .eq('id', transaction.id);
          
          if (deleteError) {
            console.error(`خطأ في حذف المعاملة المالية ${transaction.id}:`, deleteError);
          } else {
            console.log(`تم حذف المعاملة المالية ${transaction.id} بنجاح`);
          }
        }
      } else {
        console.log(`لا توجد معاملات مالية مرتبطة بالمرتجع ${returnId}`);
      }
      
      // 3. بحث إضافي عن المعاملات التي تحتوي على كلمة "مرتجع" في الملاحظات
      const { data: notesTransactions, error: notesError } = await supabase
        .from('financial_transactions')
        .select('id')
        .ilike('notes', `%مرتجع%`);
        
      if (!notesError && notesTransactions && notesTransactions.length > 0) {
        console.log(`وجدت ${notesTransactions.length} معاملة تحتوي على كلمة مرتجع في الملاحظات`);
        
        for (const transaction of notesTransactions) {
          const { data: details } = await supabase
            .from('financial_transactions')
            .select('notes')
            .eq('id', transaction.id)
            .single();
            
          if (details && details.notes && details.notes.includes(returnId)) {
            const { error: deleteError } = await supabase
              .from('financial_transactions')
              .delete()
              .eq('id', transaction.id);
              
            if (deleteError) {
              console.error(`خطأ في حذف المعاملة المالية ${transaction.id}:`, deleteError);
            } else {
              console.log(`تم حذف المعاملة المالية الإضافية ${transaction.id} بنجاح`);
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error(`خطأ في تنظيف المعاملات المالية للمرتجع ${returnId}:`, error);
      return false;
    }
  }
  
  /**
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
      
      // إرسال إشعار بتغيير البيانات المالية
      this.notifyFinancialDataChange(`${type}_cancellation`);
      
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
  
  /**
   * تنظيف المعاملات المالية للمرتجعات
   * تستخدم هذه الدالة لحذف أي معاملات مالية مرتبطة بالمرتجعات
   * من أجل إزالة تأثير المرتجعات على لوحة التحكم المالية تمامًا
   */
  public async cleanupReturnFinancialTransactions(): Promise<boolean> {
    try {
      console.log('بدء عملية تنظيف المعاملات المالية المرتبطة بالمرتجعات');
      
      // البحث عن جميع المعاملات المالية المرتبطة بالمرتجعات
      const { data: returnTransactions, error: findError } = await supabase
        .from('financial_transactions')
        .select('id')
        .eq('reference_type', 'return');
      
      if (findError) {
        console.error('خطأ في البحث عن المعاملات المالية المرتبطة بالمرتجعات:', findError);
        throw findError;
      }
      
      // إذا لم توجد معاملات، نخرج مباشرة
      if (!returnTransactions || returnTransactions.length === 0) {
        console.log('لا توجد معاملات مالية مرتبطة بالمرتجعات للحذف');
        return true;
      }
      
      console.log(`تم العثور على ${returnTransactions.length} معاملة مالية مرتبطة بالمرتجعات`);
      
      // حذف جميع المعاملات المرتبطة بالمرتجعات
      const { error: deleteError } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('reference_type', 'return');
      
      if (deleteError) {
        console.error('خطأ في حذف المعاملات المالية المرتبطة بالمرتجعات:', deleteError);
        throw deleteError;
      }
      
      // البحث عن معاملات عكسية للمرتجعات
      const { data: reverseTransactions, error: findReverseError } = await supabase
        .from('financial_transactions')
        .select('id')
        .eq('reference_type', 'reverse_return');
      
      if (findReverseError) {
        console.error('خطأ في البحث عن المعاملات العكسية للمرتجعات:', findReverseError);
        throw findReverseError;
      }
      
      // حذف المعاملات العكسية للمرتجعات إذا وجدت
      if (reverseTransactions && reverseTransactions.length > 0) {
        console.log(`تم العثور على ${reverseTransactions.length} معاملة عكسية للمرتجعات`);
        
        const { error: deleteReverseError } = await supabase
          .from('financial_transactions')
          .delete()
          .eq('reference_type', 'reverse_return');
        
        if (deleteReverseError) {
          console.error('خطأ في حذف المعاملات العكسية للمرتجعات:', deleteReverseError);
          throw deleteReverseError;
        }
      }
      
      // إرسال إشعار بتغيير البيانات المالية
      this.notifyFinancialDataChange('return_transactions_cleanup');
      
      console.log('تم الانتهاء من تنظيف المعاملات المالية المرتبطة بالمرتجعات بنجاح');
      return true;
    } catch (error) {
      console.error('حدث خطأ أثناء تنظيف المعاملات المالية المرتبطة بالمرتجعات:', error);
      return false;
    }
  }
  
  /**
   * إرسال إشعار بتغيير البيانات المالية
   * @param source مصدر التغيير
   */
  private notifyFinancialDataChange(source: string): void {
    try {
      const event = new CustomEvent('financial-data-change', { 
        detail: { source: source }
      });
      window.dispatchEvent(event);
      console.log(`تم إرسال إشعار بتغيير البيانات المالية من مصدر: ${source}`);
    } catch (error) {
      console.error('خطأ في إرسال إشعار بتغيير البيانات المالية:', error);
    }
  }
}

export default FinancialCommercialBridge;
