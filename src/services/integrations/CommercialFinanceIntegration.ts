
import { FinancialIntegration } from '@/services/interfaces/FinancialIntegration';
import FinancialService from '@/services/financial/FinancialService';
import { toast } from 'sonner';
import { ErrorHandler } from '@/utils/errorHandler';
import InventoryService from '@/services/InventoryService';
import LedgerService from '@/services/commercial/ledger/LedgerService';

/**
 * خدمة التكامل بين النظام التجاري والنظام المالي
 * تقوم بتنفيذ واجهة التكامل المالي وربط العمليات التجارية بالعمليات المالية
 */
export class CommercialFinanceIntegration implements FinancialIntegration {
  private static instance: CommercialFinanceIntegration;
  private financialService: FinancialService;
  private inventoryService: InventoryService;
  private ledgerService: LedgerService;

  private constructor() {
    this.financialService = FinancialService.getInstance();
    this.inventoryService = InventoryService.getInstance();
    this.ledgerService = LedgerService.getInstance();
  }

  public static getInstance(): CommercialFinanceIntegration {
    if (!CommercialFinanceIntegration.instance) {
      CommercialFinanceIntegration.instance = new CommercialFinanceIntegration();
    }
    return CommercialFinanceIntegration.instance;
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
    return ErrorHandler.wrapOperation(
      async () => {
        let totalCost = 0;
        let totalPrice = 0;

        for (const item of itemsData) {
          // استخدام cost_price إذا كان مُحدد، وإلا نحصل عليه من المخزون
          let costPrice = item.cost_price || 0;
          
          if (!costPrice) {
            try {
              costPrice = await this.getItemCostPrice(item.item_type, item.item_id);
            } catch (error) {
              console.error(`Error getting cost price for item ${item.item_id}:`, error);
              // استمر في العملية حتى مع وجود خطأ في سعر التكلفة
            }
          }

          totalCost += costPrice * item.quantity;
          totalPrice += item.unit_price * item.quantity;
        }

        const profit = totalPrice - totalCost;
        const profitMargin = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;

        return {
          totalCost,
          totalPrice,
          profit,
          profitMargin
        };
      },
      "calculateInvoiceProfit",
      "حدث خطأ أثناء حساب أرباح الفاتورة",
      {
        totalCost: 0,
        totalPrice: 0,
        profit: 0,
        profitMargin: 0
      }
    );
  }

  /**
   * الحصول على سعر التكلفة لعنصر من المخزون
   * @param itemType نوع العنصر
   * @param itemId معرف العنصر
   * @returns سعر التكلفة للوحدة
   */
  private async getItemCostPrice(
    itemType: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products",
    itemId: number
  ): Promise<number> {
    try {
      let item;
      
      // استخدام الطريقة المناسبة وفقاً لنوع العنصر
      switch (itemType) {
        case "raw_materials":
          try {
            const rawMaterials = await this.inventoryService.getRawMaterials();
            if (!rawMaterials) return 0;
            item = rawMaterials.find(m => m.id === itemId);
          } catch (error) {
            console.error('Error fetching raw materials:', error);
            return 0;
          }
          break;
          
        case "packaging_materials":
          try {
            const packagingMaterials = await this.inventoryService.getPackagingMaterials();
            if (!packagingMaterials) return 0;
            item = packagingMaterials.find(m => m.id === itemId);
          } catch (error) {
            console.error('Error fetching packaging materials:', error);
            return 0;
          }
          break;
          
        case "semi_finished_products":
          try {
            const semiFinishedProducts = await this.inventoryService.getSemiFinishedProducts();
            if (!semiFinishedProducts) return 0;
            item = semiFinishedProducts.find(p => p.id === itemId);
          } catch (error) {
            console.error('Error fetching semi-finished products:', error);
            return 0;
          }
          break;
          
        case "finished_products":
          try {
            const finishedProducts = await this.inventoryService.getFinishedProducts();
            if (!finishedProducts) return 0;
            item = finishedProducts.find(p => p.id === itemId);
          } catch (error) {
            console.error('Error fetching finished products:', error);
            return 0;
          }
          break;
          
        default:
          return 0;
      }
      
      return item?.unit_cost || 0;
    } catch (error) {
      console.error(`Error in getItemCostPrice for ${itemType} ${itemId}:`, error);
      return 0;
    }
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
      return false;
    }
  }
}

export default CommercialFinanceIntegration;
