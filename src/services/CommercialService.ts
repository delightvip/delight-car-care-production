import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Invoice, 
  InvoiceItem, 
  Payment, 
  Return, 
  ReturnItem, 
  LedgerEntry 
} from "./CommercialTypes";
import { ErrorHandler } from "@/utils/errorHandler";
import { OperationLocks, runAsyncOperation } from "@/utils/asyncUtils";

// Import other service classes
import InvoiceService from './commercial/invoice/InvoiceService';
import PaymentService from './commercial/payment/PaymentService';
import LedgerService from './commercial/ledger/LedgerService';
import ReturnService from './commercial/return/ReturnService';

// الواجهة الرئيسية لخدمات الحركات التجارية
class CommercialService {
  private static instance: CommercialService;
  private invoiceService: InvoiceService;
  private paymentService: PaymentService;
  private ledgerService: LedgerService;
  private returnService: ReturnService;
  
  private constructor() {
    this.invoiceService = InvoiceService.getInstance();
    this.paymentService = PaymentService.getInstance();
    this.ledgerService = LedgerService.getInstance();
    this.returnService = ReturnService.getInstance();
  }
  
  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }
  
  // ============ خدمات الفواتير ============
  
  /**
   * الحصول على جميع الفواتير
   */
  public async getInvoices(): Promise<Invoice[]> {
    return ErrorHandler.wrapOperation(
      () => this.invoiceService.getInvoices(),
      "getInvoices",
      "حدث خطأ أثناء جلب الفواتير",
      []
    ) as Promise<Invoice[]>;
  }
  
  /**
   * الحصول على فواتير طرف معين
   * @param partyId معرف الطرف
   */
  public async getInvoicesByParty(partyId: string): Promise<Invoice[]> {
    return ErrorHandler.wrapOperation(
      () => this.invoiceService.getInvoicesByParty(partyId),
      `getInvoicesByParty(${partyId})`,
      "حدث خطأ أثناء جلب فواتير الطرف",
      []
    ) as Promise<Invoice[]>;
  }
  
  /**
   * الحصول على فاتورة معينة بواسطة المعرف
   * @param id معرف الفاتورة
   */
  public async getInvoiceById(id: string): Promise<Invoice | null> {
    return ErrorHandler.wrapOperation(
      () => this.invoiceService.getInvoiceById(id),
      `getInvoiceById(${id})`,
      "حدث خطأ أثناء جلب بيانات الفاتورة",
      null
    );
  }
  
  /**
   * إنشاء فاتورة جديدة
   * @param invoiceData بيانات الفاتورة
   */
  public async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    return ErrorHandler.wrapOperation(
      async () => {
        const invoice = await this.invoiceService.createInvoice(invoiceData);
        
        if (!invoice) {
          console.error('Failed to create invoice');
          return null;
        }
        
        return invoice;
      },
      "createInvoice",
      "حدث خطأ أثناء إنشاء الفاتورة",
      null
    );
  }
  
  /**
   * تأكيد فاتورة
   * @param invoiceId معرف الفاتورة
   */
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    return OperationLocks.runWithLock(`confirm-invoice-${invoiceId}`, async () => {
      return runAsyncOperation(async () => {
        try {
          const result = await this.invoiceService.confirmInvoice(invoiceId);
          return result;
        } catch (error) {
          ErrorHandler.handleError(
            error,
            `confirmInvoice(${invoiceId})`,
            "حدث خطأ أثناء تأكيد الفاتورة"
          );
          return false;
        }
      });
    });
  }
  
  /**
   * إلغاء فاتورة
   * @param invoiceId معرف الفاتورة
   */
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    return OperationLocks.runWithLock(`cancel-invoice-${invoiceId}`, async () => {
      return runAsyncOperation(async () => {
        try {
          const result = await this.invoiceService.cancelInvoice(invoiceId);
          return result;
        } catch (error) {
          ErrorHandler.handleError(
            error,
            `cancelInvoice(${invoiceId})`,
            "حدث خطأ أثناء إلغاء الفاتورة"
          );
          return false;
        }
      });
    });
  }
  
  /**
   * حذف فاتورة
   * @param id معرف الفاتورة
   */
  public async deleteInvoice(id: string): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      () => this.invoiceService.deleteInvoice(id),
      `deleteInvoice(${id})`,
      "حدث خطأ أثناء حذف الفاتورة",
      false
    ) as Promise<boolean>;
  }
  
  /**
   * تحديث حالة الفاتورة بعد إجراء دفعة
   * @param invoiceId معرف الفاتورة
   * @param paymentAmount مبلغ الدفعة
   */
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    return ErrorHandler.wrapOperation(
      () => this.invoiceService.updateInvoiceStatusAfterPayment(invoiceId, paymentAmount),
      `updateInvoiceStatusAfterPayment(${invoiceId}, ${paymentAmount})`,
      "حدث خطأ أثناء تحديث حالة الفاتورة بعد الدفع",
      undefined
    ) as Promise<void>;
  }
  
  /**
   * عكس تحديث حالة الفاتورة بعد إلغاء دفعة
   * @param invoiceId معرف الفاتورة
   * @param paymentAmount مبلغ الدفعة
   */
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    return ErrorHandler.wrapOperation(
      () => this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(invoiceId, paymentAmount),
      `reverseInvoiceStatusAfterPaymentCancellation(${invoiceId}, ${paymentAmount})`,
      "حدث خطأ أثناء عكس حالة الفاتورة بعد إلغاء الدفع",
      undefined
    ) as Promise<void>;
  }
  
  // ============ خدمات المدفوعات ============
  
  /**
   * الحصول على جميع المدفوعات
   */
  public async getPayments(): Promise<Payment[]> {
    return ErrorHandler.wrapOperation(
      () => this.paymentService.getPayments(),
      "getPayments",
      "حدث خطأ أثناء جلب المدفوعات",
      []
    ) as Promise<Payment[]>;
  }
  
  /**
   * الحصول على مدفوعات طرف معين
   * @param partyId معرف الطرف
   */
  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    return ErrorHandler.wrapOperation(
      () => this.paymentService.getPaymentsByParty(partyId),
      `getPaymentsByParty(${partyId})`,
      "حدث خطأ أثناء جلب مدفوعات الطرف",
      []
    ) as Promise<Payment[]>;
  }
  
  /**
   * تسجيل دفعة جديدة
   * @param paymentData بيانات الدفعة
   */
  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    return ErrorHandler.wrapOperation(
      () => this.paymentService.recordPayment(paymentData),
      "recordPayment",
      "حدث خطأ أثناء تسجيل الدفعة",
      null
    );
  }
  
  /**
   * تأكيد دفعة
   * @param paymentId معرف الدفعة
   */
  public async confirmPayment(paymentId: string): Promise<boolean> {
    return OperationLocks.runWithLock(`confirm-payment-${paymentId}`, async () => {
      return runAsyncOperation(async () => {
        try {
          const result = await this.paymentService.confirmPayment(paymentId);
          return result;
        } catch (error) {
          ErrorHandler.handleError(
            error,
            `confirmPayment(${paymentId})`,
            "حدث خطأ أثناء تأكيد الدفعة"
          );
          return false;
        }
      });
    });
  }
  
  /**
   * إلغاء دفعة
   * @param paymentId معرف الدفعة
   */
  public async cancelPayment(paymentId: string): Promise<boolean> {
    return OperationLocks.runWithLock(`cancel-payment-${paymentId}`, async () => {
      return runAsyncOperation(async () => {
        try {
          const result = await this.paymentService.cancelPayment(paymentId);
          return result;
        } catch (error) {
          ErrorHandler.handleError(
            error,
            `cancelPayment(${paymentId})`,
            "حدث خطأ أثناء إلغاء الدفعة"
          );
          return false;
        }
      });
    });
  }
  
  /**
   * تحديث دفعة
   * @param id معرف الدفعة
   * @param paymentData بيانات الدفعة المحدثة
   */
  public async updatePayment(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      () => this.paymentService.updatePayment(id, paymentData),
      `updatePayment(${id})`,
      "حدث خطأ أثناء تحديث الدفعة",
      false
    ) as Promise<boolean>;
  }
  
  /**
   * حذف دفعة
   * @param id معرف الدفعة
   */
  public async deletePayment(id: string): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      () => this.paymentService.deletePayment(id),
      `deletePayment(${id})`,
      "حدث خطأ أثناء حذف الدفعة",
      false
    ) as Promise<boolean>;
  }
  
  // ============ خدمات المرتجعات ============
  
  /**
   * الحصول على جميع المرتجعات
   */
  public async getReturns(): Promise<Return[]> {
    return ErrorHandler.wrapOperation(
      () => this.returnService.getReturns(),
      "getReturns",
      "حدث خطأ أثناء جلب المرتجعات",
      []
    ) as Promise<Return[]>;
  }
  
  /**
   * الحصول على مرتجع محدد بواسطة المعرف
   * @param id معرف المرتجع
   */
  public async getReturnById(id: string): Promise<Return | null> {
    return ErrorHandler.wrapOperation(
      () => this.returnService.getReturnById(id),
      `getReturnById(${id})`,
      "حدث خطأ أثناء جلب بيانات المرتجع",
      null
    );
  }
  
  /**
   * إنشاء مرتجع جديد
   * @param returnData بيانات المرتجع
   */
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    return ErrorHandler.wrapOperation(
      () => this.returnService.createReturn(returnData),
      "createReturn",
      "حدث خطأ أثناء إنشاء المرتجع",
      null
    );
  }
  
  /**
   * تحديث مرتجع
   * @param id معرف المرتجع
   * @param returnData بيانات المرتجع المحدثة
   */
  public async updateReturn(id: string, returnData: Partial<Return>): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      () => this.returnService.updateReturn(id, returnData),
      `updateReturn(${id})`,
      "حدث خطأ أثناء تحديث المرتجع",
      false
    ) as Promise<boolean>;
  }
  
  /**
   * تأكيد مرتجع
   * @param returnId معرف المرتجع
   */
  public async confirmReturn(returnId: string): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      () => this.returnService.confirmReturn(returnId),
      `confirmReturn(${returnId})`,
      "حدث خطأ أثناء تأكيد المرتجع",
      false
    ) as Promise<boolean>;
  }
  
  /**
   * إلغاء مرتجع
   * @param returnId معرف المرتجع
   */
  public async cancelReturn(returnId: string): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      () => this.returnService.cancelReturn(returnId),
      `cancelReturn(${returnId})`,
      "حدث خطأ أثناء إلغاء المرتجع",
      false
    ) as Promise<boolean>;
  }
  
  /**
   * حذف مرتجع
   * @param id معرف المرتجع
   */
  public async deleteReturn(id: string): Promise<boolean> {
    return ErrorHandler.wrapOperation(
      () => this.returnService.deleteReturn(id),
      `deleteReturn(${id})`,
      "حدث خطأ أثناء حذف المرتجع",
      false
    ) as Promise<boolean>;
  }
  
  // ============ خدمات سجل الحساب ============
  
  /**
   * الحصول على قيود سجل الحساب لطرف معين
   * @param partyId معرف الطرف
   * @param startDate تاريخ البداية (اختياري)
   * @param endDate تاريخ النهاية (اختياري)
   */
  public async getLedgerEntries(partyId: string, startDate?: string, endDate?: string): Promise<LedgerEntry[]> {
    return ErrorHandler.wrapOperation(
      () => this.ledgerService.getLedgerEntries(partyId, startDate, endDate),
      `getLedgerEntries(${partyId})`,
      "حدث خطأ أثناء جلب سجلات الحساب",
      []
    ) as Promise<LedgerEntry[]>;
  }
  
  /**
   * إنشاء كشف حساب
   * @param startDate تاريخ البداية
   * @param endDate تاريخ النهاية
   * @param partyType نوع الطرف (اختياري)
   */
  public async generateAccountStatement(startDate: string, endDate: string, partyType?: string): Promise<any> {
    return ErrorHandler.wrapOperation(
      () => this.ledgerService.generateAccountStatement(startDate, endDate, partyType),
      `generateAccountStatement(${startDate}, ${endDate}, ${partyType})`,
      "حدث خطأ أثناء إنشاء كشف الحساب",
      null
    );
  }
}

// إعادة تصدير الأنواع ليتم استيرادها من هذا الوحدة أيضًا
export type { 
  Invoice, 
  InvoiceItem, 
  Payment, 
  Return, 
  ReturnItem, 
  LedgerEntry 
};

export default CommercialService;
