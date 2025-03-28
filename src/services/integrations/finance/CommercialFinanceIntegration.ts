
import { FinanceIntegrationBase } from './FinanceIntegrationBase';
import TransactionService from '@/services/financial/TransactionService';
import { FinancialTransaction } from '@/services/interfaces/FinancialIntegration';
import LedgerService from '@/services/commercial/ledger/LedgerService';
import ProfitCalculationService from './ProfitCalculationService';
import { toast } from 'sonner';

/**
 * تكامل وحدة المبيعات والمشتريات مع النظام المالي
 */
export class CommercialFinanceIntegration extends FinanceIntegrationBase {
  private static instance: CommercialFinanceIntegration;
  private transactionService: TransactionService;
  private profitCalculationService: ProfitCalculationService;
  private ledgerService: LedgerService;
  
  private constructor() {
    super();
    this.transactionService = TransactionService.getInstance();
    this.profitCalculationService = ProfitCalculationService.getInstance();
    this.ledgerService = LedgerService.getInstance();
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
      // Convert payment method to match the financial system's expected types
      const paymentMethod = this.convertPaymentMethod(transactionData.payment_method);
      
      // Create financial transaction
      await this.transactionService.createTransaction({
        date: transactionData.date,
        type: transactionData.type,
        category_id: transactionData.category_id,
        amount: transactionData.amount,
        payment_method: paymentMethod,
        reference_id: transactionData.reference_id,
        reference_type: transactionData.reference_type,
        notes: transactionData.notes
      });
      
      return true;
    } catch (error) {
      console.error('Error recording financial transaction:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة المالية');
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
        return 'bank';
      case 'check':
        return 'bank'; // Treating checks as bank transactions
      default:
        return 'other';
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
  public async recordLedgerEntry(ledgerEntry: {
    party_id: string;
    transaction_id: string;
    transaction_type: string;
    date: string;
    debit: number;
    credit: number;
    notes?: string;
  }): Promise<boolean> {
    try {
      return await this.ledgerService.addLedgerEntry(ledgerEntry);
    } catch (error) {
      console.error('Error recording ledger entry:', error);
      toast.error('حدث خطأ أثناء تسجيل معاملة في دفتر الحسابات');
      return false;
    }
  }
}

export default CommercialFinanceIntegration;
