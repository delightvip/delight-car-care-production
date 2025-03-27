
import { FinanceIntegrationBase } from './finance/FinanceIntegrationBase';
import ProfitCalculationService from './finance/ProfitCalculationService';
import { toast } from 'sonner';
import LedgerService from '@/services/commercial/ledger/LedgerService';

/**
 * خدمة التكامل بين النظام التجاري والنظام المالي
 * تقوم بتنفيذ واجهة التكامل المالي وربط العمليات التجارية بالعمليات المالية
 */
export class CommercialFinanceIntegration extends FinanceIntegrationBase {
  private static instance: CommercialFinanceIntegration;
  private profitCalculationService: ProfitCalculationService;
  private ledgerService: LedgerService;

  private constructor() {
    super();
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
