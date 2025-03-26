
import { supabase } from "@/integrations/supabase/client";
import { Payment } from "@/services/CommercialTypes";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import { PaymentEntity } from "./PaymentEntity";
import { toast } from "sonner";
import InvoiceService from "../invoice/InvoiceService";

export class PaymentProcessor {
  private inventoryService: InventoryService;
  private partyService: PartyService;
  private invoiceService: InvoiceService;

  constructor() {
    // استخدام getInstance() بدلاً من الإنشاء المباشر
    this.inventoryService = InventoryService.getInstance();
    this.partyService = PartyService.getInstance();
    this.invoiceService = InvoiceService.getInstance();
  }

  /**
   * تأكيد دفعة وتحديث سجلات العميل المالية
   */
  public async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      const payment = await PaymentEntity.fetchById(paymentId);
      if (!payment) {
        console.error('Payment not found');
        toast.error('لم يتم العثور على المعاملة');
        return false;
      }
      
      if (payment.payment_status === 'confirmed') {
        console.log('Payment already confirmed');
        toast.info('المعاملة مؤكدة بالفعل');
        return true;
      }
      
      // تحديث رصيد الطرف بناءً على نوع الدفعة
      if (payment.payment_type === 'collection') {
        // تحصيل (العميل يدفع لنا)
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          false, // دائن للتحصيلات (تقليل دين العميل)
          'دفعة مستلمة',
          'payment_received',
          payment.id
        );
        
        // إذا كانت مرتبطة بفاتورة، تحديث حالة الفاتورة
        if (payment.related_invoice_id) {
          await this.invoiceService.updateInvoiceStatusAfterPayment(payment.related_invoice_id, payment.amount);
        }
      } else if (payment.payment_type === 'disbursement') {
        // صرف (نحن ندفع للمورد)
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          true, // مدين للمدفوعات (تقليل ديننا)
          'دفعة مدفوعة',
          'payment_made',
          payment.id
        );
        
        // إذا كانت مرتبطة بفاتورة، تحديث حالة الفاتورة
        if (payment.related_invoice_id) {
          await this.invoiceService.updateInvoiceStatusAfterPayment(payment.related_invoice_id, payment.amount);
        }
      }
      
      // تحديث حالة الدفعة إلى مؤكدة
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'confirmed' })
        .eq('id', paymentId);
      
      if (error) throw error;
      
      toast.success('تم تأكيد المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('حدث خطأ أثناء تأكيد المعاملة');
      return false;
    }
  }
  
  /**
   * إلغاء دفعة وعكس التغييرات على سجلات العميل المالية
   */
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      const payment = await PaymentEntity.fetchById(paymentId);
      if (!payment) {
        console.error('Payment not found');
        toast.error('لم يتم العثور على المعاملة');
        return false;
      }
      
      if (payment.payment_status !== 'confirmed') {
        console.error('Can only cancel confirmed payments');
        toast.error('يمكن إلغاء المعاملات المؤكدة فقط');
        return false;
      }
      
      // عكس تحديث رصيد الطرف بناءً على نوع الدفعة
      if (payment.payment_type === 'collection') {
        // عكس التحصيل (العميل يدفع لنا)
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          true, // مدين لإلغاء التحصيلات (إعادة دين العميل)
          'إلغاء دفعة مستلمة',
          'cancel_payment_received',
          payment.id
        );
        
        // إذا كانت مرتبطة بفاتورة، تحديث حالة الفاتورة
        if (payment.related_invoice_id) {
          await this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(payment.related_invoice_id, payment.amount);
        }
      } else if (payment.payment_type === 'disbursement') {
        // عكس الصرف (نحن ندفع للمورد)
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          false, // دائن لإلغاء المدفوعات (إعادة ديننا)
          'إلغاء دفعة مدفوعة',
          'cancel_payment_made',
          payment.id
        );
        
        // إذا كانت مرتبطة بفاتورة، تحديث حالة الفاتورة
        if (payment.related_invoice_id) {
          await this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(payment.related_invoice_id, payment.amount);
        }
      }
      
      // تحديث حالة الدفعة إلى ملغاة
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: 'cancelled' })
        .eq('id', paymentId);
      
      if (error) throw error;
      
      toast.success('تم إلغاء المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error('حدث خطأ أثناء إلغاء المعاملة');
      return false;
    }
  }
}
