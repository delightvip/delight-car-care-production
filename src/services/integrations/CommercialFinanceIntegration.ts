
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
    // Make sure notes is always defined to match our updated interface
    const entryWithNotes = {
      ...ledgerEntry,
      notes: ledgerEntry.notes || ''
    };
    return this.ledgerIntegrationService.recordLedgerEntry(entryWithNotes);
  }
  
  /**
   * تحديث رصيد الخزينة
   * @param amount المبلغ (موجب للزيادة، سالب للنقصان)
   * @param paymentMethod طريقة الدفع
   */
  public async updateBalance(amount: number, paymentMethod: 'cash' | 'bank' | 'other'): Promise<boolean> {
    return this.financialTransactionService.updateBalance(amount, paymentMethod);
  }

  /**
   * تسجيل مدفوعات الفاتورة في النظام المالي
   * @param invoiceId معرف الفاتورة
   * @param invoiceType نوع الفاتورة (مبيعات/مشتريات)
   * @param amount المبلغ
   * @param paymentMethod طريقة الدفع
   * @param date تاريخ الدفع
   * @param partyName اسم الطرف (العميل/المورد)
   */
  public async recordInvoicePayment(
    invoiceId: string, 
    invoiceType: 'sale' | 'purchase', 
    amount: number, 
    paymentMethod: string, 
    date: string,
    partyName?: string
  ): Promise<boolean> {
    const categoryId = invoiceType === 'sale' ? 
      '5f5b3ce0-1e87-4654-afef-c9cab5d59ef4' : // فئة التحصيلات/المبيعات
      'f8dcea05-c2e8-4bef-8ca4-a73473e23e34';  // فئة المدفوعات/المشتريات
    
    return this.recordFinancialTransaction({
      type: invoiceType === 'sale' ? 'income' : 'expense',
      amount: amount,
      payment_method: this.convertPaymentMethod(paymentMethod),
      category_id: categoryId,
      reference_id: invoiceId,
      reference_type: invoiceType,
      date: date,
      notes: `فاتورة ${invoiceType === 'sale' ? 'مبيعات' : 'مشتريات'} - ${partyName || ''}`
    });
  }

  /**
   * تسجيل حركة سداد للطرف التجاري في دفتر الحسابات
   */
  public async recordPartyPayment(
    partyId: string,
    paymentId: string,
    paymentType: 'collection' | 'disbursement',
    amount: number,
    date: string,
    notes: string = ''
  ): Promise<boolean> {
    // تحديد النوع (مدين/دائن) بناءً على نوع الدفعة
    const isDebit = paymentType === 'disbursement';
    
    return this.recordLedgerEntry({
      party_id: partyId,
      transaction_id: paymentId,
      transaction_type: `payment_${paymentType}`,
      date: date,
      debit: isDebit ? amount : 0,
      credit: !isDebit ? amount : 0,
      notes: notes,
      description: paymentType === 'collection' ? 'تحصيل دفعة' : 'تسديد دفعة'
    });
  }

  /**
   * تحويل طريقة الدفع إلى النوع المتوافق مع النظام المالي
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

export default CommercialFinanceIntegration;
