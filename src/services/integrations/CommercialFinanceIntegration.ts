
import { FinanceIntegrationBase } from './finance/FinanceIntegrationBase';
import ProfitCalculationService from './finance/ProfitCalculationService';
import { FinancialTransaction } from '@/services/interfaces/FinancialIntegration';
import { LedgerEntryData, BalanceUpdateData } from './finance/FinanceIntegrationTypes';
import { FinancialTransactionService } from './finance/FinancialTransactionService';
import { LedgerIntegrationService } from './finance/LedgerIntegrationService';
import { toast } from 'sonner';

/**
 * خدمة التكامل بين النظام التجاري والنظام المالي
 * تقوم بتنفيذ واجهة التكامل المالي وربط العمليات التجارية بالعمليات المالية
 */
export class CommercialFinanceIntegration extends FinanceIntegrationBase {
  private static instance: CommercialFinanceIntegration;
  private profitCalculationService: ProfitCalculationService;
  private financialTransactionService: FinancialTransactionService;
  private ledgerIntegrationService: LedgerIntegrationService;

  private constructor() {
    super();
    this.profitCalculationService = ProfitCalculationService.getInstance();
    this.financialTransactionService = FinancialTransactionService.getInstance();
    this.ledgerIntegrationService = LedgerIntegrationService.getInstance();
  }

  public static getInstance(): CommercialFinanceIntegration {
    if (!CommercialFinanceIntegration.instance) {
      CommercialFinanceIntegration.instance = new CommercialFinanceIntegration();
    }
    return CommercialFinanceIntegration.instance;
  }

  /**
   * تسجيل معاملة مالية مرتبطة بمعاملة تجارية
   */
  public async recordFinancialTransaction(transactionData: FinancialTransaction): Promise<boolean> {
    try {
      // تسجيل المعاملة المالية
      const success = await this.financialTransactionService.recordTransaction(transactionData);
      
      if (success) {
        // تحديث رصيد الخزينة إذا كانت طريقة الدفع نقدية أو بنكية
        if (transactionData.payment_method === 'cash' || transactionData.payment_method === 'bank_transfer' || transactionData.payment_method === 'check') {
          const amount = transactionData.type === 'income' ? transactionData.amount : -transactionData.amount;
          const paymentMethod = transactionData.payment_method === 'cash' ? 'cash' : 'bank';
          await this.updateBalance(amount, paymentMethod);
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error recording financial transaction:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة المالية');
      return false;
    }
  }

  /**
   * حساب الأرباح من فاتورة مبيعات
   * @param invoiceId معرف الفاتورة
   * @param itemsData بيانات عناصر الفاتورة
   */
  public async calculateInvoiceProfit(
    invoiceId: string,
    itemsData: Array<{
      item_id: number;
      item_type: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
      quantity: number;
      unit_price: number;
      cost_price?: number;
    }>
  ): Promise<{ totalCost: number; totalPrice: number; profit: number; profitMargin: number; }> {
    return this.profitCalculationService.calculateInvoiceProfit(invoiceId, itemsData);
  }

  /**
   * تسجيل معاملة في سجل الحساب
   * @param ledgerEntry بيانات القيد
   */
  public async recordLedgerEntry(ledgerEntry: LedgerEntryData): Promise<boolean> {
    return this.ledgerIntegrationService.recordLedgerEntry(ledgerEntry);
  }
  
  /**
   * تحديث رصيد الخزينة
   * @param amount المبلغ (موجب للزيادة، سالب للنقصان)
   * @param paymentMethod طريقة الدفع
   */
  public async updateBalance(amount: number, paymentMethod: 'cash' | 'bank' | 'other'): Promise<boolean> {
    return this.financialTransactionService.updateBalance(amount, paymentMethod);
  }
}

export default CommercialFinanceIntegration;
