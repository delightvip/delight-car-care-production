
import TransactionService from '@/services/financial/TransactionService';
import { FinancialTransaction } from '@/services/interfaces/FinancialIntegration';
import { toast } from 'sonner';

/**
 * خدمة مسؤولة عن إدارة المعاملات المالية
 */
export class FinancialTransactionService {
  private static instance: FinancialTransactionService;
  private transactionService: TransactionService;
  
  private constructor() {
    this.transactionService = TransactionService.getInstance();
  }
  
  public static getInstance(): FinancialTransactionService {
    if (!FinancialTransactionService.instance) {
      FinancialTransactionService.instance = new FinancialTransactionService();
    }
    return FinancialTransactionService.instance;
  }
  
  /**
   * تسجيل معاملة مالية جديدة
   * @param transactionData بيانات المعاملة
   */
  public async recordTransaction(transactionData: FinancialTransaction): Promise<boolean> {
    try {
      // تحويل طريقة الدفع لتتوافق مع المتوقع في النظام المالي
      const paymentMethod = this.convertPaymentMethod(transactionData.payment_method);
      
      // إنشاء المعاملة المالية
      const result = await this.transactionService.createTransaction({
        date: transactionData.date,
        type: transactionData.type,
        category_id: transactionData.category_id,
        amount: transactionData.amount,
        payment_method: paymentMethod,
        reference_id: transactionData.reference_id,
        reference_type: transactionData.reference_type,
        notes: transactionData.notes
      });
      
      return !!result;
    } catch (error) {
      console.error('Error recording financial transaction:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة المالية');
      return false;
    }
  }
  
  /**
   * تحديث رصيد الخزينة
   * @param amount المبلغ (موجب للزيادة، سالب للنقصان)
   * @param paymentMethod طريقة الدفع
   */
  public async updateBalance(amount: number, paymentMethod: 'cash' | 'bank' | 'other'): Promise<boolean> {
    try {
      // تجاوز تحديث الرصيد لطرق الدفع 'other'
      if (paymentMethod === 'other') {
        return true;
      }
      
      await this.transactionService.updateBalance(amount, paymentMethod);
      return true;
    } catch (error) {
      console.error('Error updating financial balance:', error);
      toast.error('حدث خطأ أثناء تحديث رصيد الخزينة');
      return false;
    }
  }
  
  /**
   * تحويل طريقة الدفع من نظام المبيعات إلى نظام المالية
   */
  private convertPaymentMethod(method: string): 'cash' | 'bank' | 'other' {
    switch (method) {
      case 'cash':
        return 'cash';
      case 'bank_transfer':
      case 'check':
        return 'bank';
      default:
        return 'other';
    }
  }
}
