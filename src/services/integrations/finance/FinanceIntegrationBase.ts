
import { FinancialIntegration } from '@/services/interfaces/FinancialIntegration';
import FinancialService from '@/services/financial/FinancialService';
import { ErrorHandler } from '@/utils/errorHandler';

/**
 * الفئة الأساسية للتكامل المالي
 * توفر الوظائف المشتركة لجميع خدمات التكامل المالي
 */
export abstract class FinanceIntegrationBase implements FinancialIntegration {
  protected financialService: FinancialService;

  constructor() {
    this.financialService = FinancialService.getInstance();
  }

  /**
   * تسجيل معاملة مالية مرتبطة بالحركات التجارية
   * @param transactionData بيانات المعاملة المالية
   */
  public async recordFinancialTransaction(transactionData: {
    type: 'income' | 'expense';
    amount: number;
    payment_method: 'cash' | 'bank' | 'other';
    category_id: string;
    reference_id?: string;
    reference_type?: string;
    date: string;
    notes?: string;
  }): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      async () => {
        // إنشاء المعاملة المالية
        const result = await this.financialService.createTransaction({
          date: transactionData.date,
          type: transactionData.type,
          category_id: transactionData.category_id,
          amount: transactionData.amount,
          payment_method: transactionData.payment_method,
          notes: transactionData.notes,
          reference_id: transactionData.reference_id,
          reference_type: transactionData.reference_type
        });

        // تحديث رصيد الخزينة
        if (result && (transactionData.payment_method === 'cash' || transactionData.payment_method === 'bank')) {
          const amount = transactionData.type === 'income' ? transactionData.amount : -transactionData.amount;
          await this.updateBalance(amount, transactionData.payment_method);
        }

        return !!result;
      },
      "recordFinancialTransaction",
      "حدث خطأ أثناء تسجيل المعاملة المالية",
      false
    );
  }

  /**
   * تحديث رصيد الخزينة
   * @param amount المبلغ (موجب للإضافة، سالب للخصم)
   * @param method طريقة الدفع (نقدي أو بنك)
   */
  public async updateBalance(amount: number, method: 'cash' | 'bank'): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      async () => {
        // استخدام دالة updateBalance المخفية في FinancialService
        if (typeof (this.financialService as any).updateBalance === 'function') {
          return await (this.financialService as any).updateBalance(amount, method);
        } else {
          throw new Error('updateBalance method is not available in FinancialService');
        }
      },
      "updateBalance",
      "حدث خطأ أثناء تحديث رصيد الخزينة",
      false
    );
  }

  /**
   * حساب الأرباح من فاتورة مبيعات
   * @param invoiceId معرف الفاتورة
   * @param itemsData بيانات عناصر الفاتورة
   */
  public abstract calculateInvoiceProfit(
    invoiceId: string,
    itemsData: Array<{
      item_id: number;
      item_type: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
      quantity: number;
      unit_price: number;
      cost_price?: number;
    }>
  ): Promise<{
    totalCost: number;
    totalPrice: number;
    profit: number;
    profitMargin: number;
  }>;

  /**
   * تسجيل معاملة في سجل الحساب
   * هذه دالة مجردة يجب تنفيذها في الفئات الفرعية
   */
  public abstract recordLedgerEntry(ledgerEntry: {
    party_id: string;
    transaction_id: string;
    transaction_type: string;
    date: string;
    debit: number;
    credit: number;
    notes?: string;
  }): Promise<boolean>;
}
