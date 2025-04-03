
import { supabase } from "@/integrations/supabase/client";
import { Payment } from "@/services/commercial/CommercialTypes";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import InvoiceService from "../invoice/InvoiceService";
import FinancialBalanceService from "@/services/financial/FinancialBalanceService";
import { toast } from "sonner";

export class PaymentProcessor {
  private inventoryService: InventoryService;
  private partyService: PartyService;
  private invoiceService: InvoiceService;
  private financialBalanceService: FinancialBalanceService;

  constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.partyService = PartyService.getInstance();
    this.invoiceService = InvoiceService.getInstance();
    this.financialBalanceService = FinancialBalanceService.getInstance();
  }

  /**
   * تأكيد الدفعة وتحديث الحسابات ذات الصلة
   */
  public async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      // التحقق من حالة الدفعة
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*, parties(name)')
        .eq('id', paymentId)
        .single();
      
      if (paymentError) throw paymentError;
      
      if (payment.payment_status === 'confirmed') {
        toast({
          title: "تنبيه",
          description: "الدفعة مؤكدة بالفعل",
          variant: "default"
        });
        return true;
      }
      
      // تحديث سجل الطرف (العميل/المورد)
      if (payment.party_id) {
        const isCredit = payment.payment_type === 'collection';
        
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          !isCredit, // مدين إذا كان disbursement، دائن إذا كان collection
          isCredit ? 'تحصيل دفعة' : 'تسديد دفعة',
          isCredit ? 'payment_collection' : 'payment_disbursement',
          paymentId
        );
      }
      
      // إذا كانت الدفعة مرتبطة بفاتورة، قم بتحديث حالة الفاتورة
      if (payment.related_invoice_id) {
        await this.invoiceService.updateInvoiceStatusAfterPayment(
          payment.related_invoice_id,
          payment.amount
        );
      }
      
      // تحديث أرصدة الخزينة (النقدية أو البنكية) بناءً على نوع الدفعة وطريقة الدفع
      const isIncome = payment.payment_type === 'collection'; // تحصيل من العميل يعني دخل للخزينة
      const partyName = payment.parties?.name || 'غير محدد';
      const reason = isIncome 
        ? `تحصيل دفعة من ${partyName}` 
        : `تسديد دفعة إلى ${partyName}`;
        
      const balanceUpdated = await this.financialBalanceService.updateBalanceByPaymentMethod(
        payment.amount,
        payment.method,
        isIncome,
        reason
      );
      
      if (!balanceUpdated) {
        console.warn('تم تأكيد الدفعة ولكن فشل تحديث رصيد الخزينة');
      }
      
      // تحديث حالة الدفعة إلى "مؤكدة"
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_status: 'confirmed' })
        .eq('id', paymentId);
      
      if (updateError) throw updateError;
      
      // استخدام setTimeout لتجنب تعليق واجهة المستخدم
      setTimeout(() => {
        toast.success('تم تأكيد الدفعة بنجاح');
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('حدث خطأ أثناء تأكيد الدفعة');
      return false;
    }
  }
  
  /**
   * إلغاء الدفعة وعكس التغييرات ذات الصلة
   */
  public async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      // التحقق من حالة الدفعة
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*, parties(name)')
        .eq('id', paymentId)
        .single();
      
      if (paymentError) throw paymentError;
      
      if (payment.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء الدفعات المؤكدة فقط');
        return false;
      }
      
      // عكس تحديث سجل الطرف (العميل/المورد)
      if (payment.party_id) {
        const isCredit = payment.payment_type === 'collection';
        
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          isCredit, // عكس التأثير الأصلي
          isCredit ? 'إلغاء تحصيل دفعة' : 'إلغاء تسديد دفعة',
          isCredit ? 'cancel_payment_collection' : 'cancel_payment_disbursement',
          paymentId
        );
      }
      
      // إذا كانت الدفعة مرتبطة بفاتورة، قم بعكس تحديث حالة الفاتورة
      if (payment.related_invoice_id) {
        await this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(
          payment.related_invoice_id,
          payment.amount
        );
      }
      
      // عكس تحديث أرصدة الخزينة (النقدية أو البنكية)
      const isIncome = payment.payment_type === 'collection'; // عكس التأثير على الخزينة
      const partyName = payment.parties?.name || 'غير محدد';
      const reason = isIncome 
        ? `إلغاء تحصيل دفعة من ${partyName}` 
        : `إلغاء تسديد دفعة إلى ${partyName}`;
        
      const balanceUpdated = await this.financialBalanceService.updateBalanceByPaymentMethod(
        payment.amount,
        payment.method,
        !isIncome, // عكس الإيراد/المصروف
        reason
      );
      
      if (!balanceUpdated) {
        console.warn('تم إلغاء الدفعة ولكن فشل تحديث رصيد الخزينة');
      }
      
      // تحديث حالة الدفعة إلى "ملغاة"
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_status: 'cancelled' })
        .eq('id', paymentId);
      
      if (updateError) throw updateError;
      
      // استخدام setTimeout لتجنب تعليق واجهة المستخدم
      setTimeout(() => {
        toast.success('تم إلغاء الدفعة بنجاح');
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error('حدث خطأ أثناء إلغاء الدفعة');
      return false;
    }
  }
}
