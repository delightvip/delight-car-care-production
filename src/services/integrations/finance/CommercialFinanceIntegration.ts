
import { FinanceIntegrationBase } from './FinanceIntegrationBase';
import TransactionService from '@/services/financial/TransactionService';
import { FinancialTransaction } from '@/services/interfaces/FinancialIntegration';

/**
 * تكامل وحدة المبيعات والمشتريات مع النظام المالي
 */
export class CommercialFinanceIntegration extends FinanceIntegrationBase {
  private static instance: CommercialFinanceIntegration;
  private transactionService: TransactionService;
  
  private constructor() {
    super();
    this.transactionService = TransactionService.getInstance();
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
}

// Add FinancialTransaction interface to the financial interfaces file if needed
