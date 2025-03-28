import BaseCommercialService from '../BaseCommercialService';
import { Payment } from '../../CommercialTypes';
import { toast } from "sonner";
import { format } from 'date-fns';
import InvoiceService from '../invoice/InvoiceService';
import { ErrorHandler } from '@/utils/errorHandler';
import PaymentDataAccess from './PaymentDataAccess';
import PaymentValidator from './PaymentValidator';
import { CommercialFinanceIntegration } from '@/services/integrations/CommercialFinanceIntegration';

/**
 * خدمة إدارة المدفوعات والتحصيلات
 */
class PaymentService extends BaseCommercialService {
  
  private static instance: PaymentService;
  private invoiceService: InvoiceService;
  private dataAccess: PaymentDataAccess;
  private validator: PaymentValidator;
  private financeIntegration: CommercialFinanceIntegration;
  
  private constructor() {
    super();
    this.invoiceService = InvoiceService.getInstance();
    this.dataAccess = new PaymentDataAccess();
    this.validator = new PaymentValidator();
    this.financeIntegration = CommercialFinanceIntegration.getInstance();
  }
  
  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }
  
  /**
   * الحصول على جميع المدفوعات
   */
  public async getPayments(): Promise<Payment[]> {
    return await this.dataAccess.getPayments();
  }
  
  /**
   * الحصول على مدفوعات طرف معين
   * @param partyId معرف الطرف
   */
  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    return await this.dataAccess.getPaymentsByParty(partyId);
  }
  
  /**
   * تسجيل دفعة جديدة
   * @param paymentData بيانات الدفعة
   */
  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    return await ErrorHandler.wrapOperation(
      async () => {
        this.validator.validatePaymentData(paymentData);
        
        const payment = await this.dataAccess.recordPayment(paymentData);
        
        if (payment) {
          toast.success('تم تسجيل المعاملة بنجاح');
        }
        
        return payment;
      },
      "recordPayment",
      "حدث خطأ أثناء تسجيل المعاملة",
      null
    );
  }
  
  /**
   * تأكيد دفعة
   * @param paymentId معرف الدفعة
   */
  public async confirmPayment(paymentId: string): Promise<boolean> {
    return await ErrorHandler.wrapOperation(
      async () => {
        const payment = await this.dataAccess.getPaymentById(paymentId);
        
        if (!payment) {
          throw new Error('المعاملة غير موجودة');
        }
        
        if (payment.payment_status === 'confirmed') {
          toast.info('المعاملة مؤكدة بالفعل');
          return true;
        }
        
        // تحديث سجل الحركة المالية
        const categoryId = payment.payment_type === 'collection' ? 
          '5f5b3ce0-1e87-4654-afef-c9cab5d59ef4' : // فئة التحصيلات
          'f8dcea05-c2e8-4bef-8ca4-a73473e23e34';  // فئة المدفوعات
        
        // تسجيل المعاملة المالية
        await this.financeIntegration.recordFinancialTransaction({
          type: payment.payment_type === 'collection' ? 'income' : 'expense',
          amount: payment.amount,
          payment_method: payment.method === 'cash' ? 'cash' : 
                          payment.method === 'bank_transfer' ? 'bank' : 'other',
          category_id: categoryId,
          reference_id: payment.id,
          reference_type: 'payment',
          date: payment.date,
          notes: `معاملة ${payment.payment_type === 'collection' ? 'تحصيل' : 'دفع'} - ${payment.party_name || ''}`
        });
        
        // تحديث رصيد الطرف
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          payment.payment_type === 'disbursement', // قيد مدين لعمليات الدفع
          payment.payment_type === 'collection' ? 'دفعة مستلمة' : 'دفعة مدفوعة',
          `payment_${payment.payment_type}`,
          payment.id
        );
        
        // تحديث حالة الفاتورة المرتبطة إذا وجدت
        if (payment.related_invoice_id) {
          await this.invoiceService.updateInvoiceStatusAfterPayment(
            payment.related_invoice_id, 
            payment.amount
          );
        }
        
        // تحديث حالة الدفعة إلى مؤكدة
        const updated = await this.dataAccess.updatePaymentStatus(paymentId, 'confirmed');
        
        if (updated) {
          toast.success('تم تأكيد المعاملة بنجاح');
        }
        
        return updated;
      },
      "confirmPayment",
      "حدث خطأ أثناء تأكيد المعاملة",
      false
    );
  }
  
  /**
   * إلغاء دفعة
   * @param paymentId معرف الدفعة
   */
  public async cancelPayment(paymentId: string): Promise<boolean> {
    return await ErrorHandler.wrapOperation(
      async () => {
        const payment = await this.dataAccess.getPaymentById(paymentId);
        
        if (!payment) {
          throw new Error('المعاملة غير موجودة');
        }
        
        if (payment.payment_status !== 'confirmed') {
          toast.error('يمكن إلغاء المعاملات المؤكدة فقط');
          return false;
        }
        
        // تسجيل معاملة عكسية في النظام المالي
        const categoryId = payment.payment_type === 'collection' ? 
          'f8dcea05-c2e8-4bef-8ca4-a73473e23e34' : // فئة المدفوعات (عكس التحصيل)
          '5f5b3ce0-1e87-4654-afef-c9cab5d59ef4';  // فئة التحصيلات (عكس الدفع)
        
        // تسجيل المعاملة المالية العكسية
        await this.financeIntegration.recordFinancialTransaction({
          type: payment.payment_type === 'collection' ? 'expense' : 'income',
          amount: payment.amount,
          payment_method: payment.method === 'cash' ? 'cash' : 
                          payment.method === 'bank_transfer' ? 'bank' : 'other',
          category_id: categoryId,
          reference_id: payment.id,
          reference_type: 'payment_cancel',
          date: format(new Date(), 'yyyy-MM-dd'),
          notes: `إلغاء معاملة ${payment.payment_type === 'collection' ? 'تحصيل' : 'دفع'} - ${payment.party_name || ''}`
        });
        
        // تحديث رصيد الطرف (عكس العملية السابقة)
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          payment.payment_type === 'collection', // عكس العملية السابقة
          payment.payment_type === 'collection' ? 'إلغاء دفعة مستلمة' : 'إلغاء دفعة مدفوعة',
          `cancel_payment_${payment.payment_type}`,
          payment.id
        );
        
        // عكس تأثير الدفعة على الفاتورة المرتبطة إذا وجدت
        if (payment.related_invoice_id) {
          await this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(
            payment.related_invoice_id,
            payment.amount
          );
        }
        
        // تحديث حالة الدفعة إلى ملغاة
        const updated = await this.dataAccess.updatePaymentStatus(paymentId, 'cancelled');
        
        if (updated) {
          toast.success('تم إلغاء المعاملة بنجاح');
        }
        
        return updated;
      },
      "cancelPayment",
      "حدث خطأ أثناء إلغاء المعاملة",
      false
    );
  }
  
  /**
   * تحديث دفعة
   * @param id معرف الدفعة
   * @param paymentData بيانات الدفعة المحدثة
   */
  public async updatePayment(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<boolean> {
    return await this.dataAccess.updatePayment(id, paymentData);
  }
  
  /**
   * حذف دفعة
   * @param id معرف الدفعة
   */
  public async deletePayment(id: string): Promise<boolean> {
    return await this.dataAccess.deletePayment(id);
  }
}

export default PaymentService;
