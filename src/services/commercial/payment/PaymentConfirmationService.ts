
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PartyService from "@/services/PartyService";
import FinancialService from "@/services/financial/FinancialService";

interface Payment {
  id: string;
  party_id: string;
  amount: number;
  date: string;
  payment_type: string;
  payment_status?: string;
  status?: string;
  account_id?: string;
  related_invoice_id?: string;
  notes?: string;
}

export class PaymentConfirmationService {
  private partyService: PartyService;
  private financialService: FinancialService;
  
  constructor() {
    this.partyService = PartyService.getInstance();
    this.financialService = FinancialService.getInstance();
  }
  
  /**
   * Confirm a payment
   */
  async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (error) {
        console.error("Error fetching payment:", error);
        toast.error("حدث خطأ أثناء جلب بيانات الدفع");
        return false;
      }
      
      if (!payment) {
        toast.error("لم يتم العثور على الدفعة");
        return false;
      }
      
      if (payment.payment_status === 'confirmed') {
        toast.info("الدفعة مؤكدة بالفعل");
        return true;
      }
      
      let success = false;
      
      if (payment.payment_type === 'receipt') {
        success = await this.confirmReceiptFromCustomer(payment);
      } else if (payment.payment_type === 'payment') {
        success = await this.confirmPaymentToSupplier(payment);
      }
      
      if (!success) {
        return false;
      }
      
      // Update payment status to confirmed
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_status: 'confirmed'
        })
        .eq('id', paymentId);
      
      if (updateError) {
        console.error("Error updating payment status:", updateError);
        toast.error("حدث خطأ أثناء تحديث حالة الدفع");
        return false;
      }
      
      toast.success("تم تأكيد الدفعة بنجاح");
      return true;
    } catch (error) {
      console.error("Error confirming payment:", error);
      toast.error("حدث خطأ أثناء تأكيد الدفعة");
      return false;
    }
  }
  
  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (error) {
        console.error("Error fetching payment:", error);
        toast.error("حدث خطأ أثناء جلب بيانات الدفع");
        return false;
      }
      
      if (!payment) {
        toast.error("لم يتم العثور على الدفعة");
        return false;
      }
      
      if (payment.payment_status === 'cancelled') {
        toast.info("الدفعة ملغاة بالفعل");
        return true;
      }
      
      let success = false;
      
      if (payment.payment_type === 'receipt') {
        success = await this.cancelReceiptFromCustomer(payment);
      } else if (payment.payment_type === 'payment') {
        success = await this.cancelPaymentToSupplier(payment);
      }
      
      if (!success) {
        return false;
      }
      
      // Update payment status to cancelled
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_status: 'cancelled'
        })
        .eq('id', paymentId);
      
      if (updateError) {
        console.error("Error updating payment status:", updateError);
        toast.error("حدث خطأ أثناء تحديث حالة الدفع");
        return false;
      }
      
      toast.success("تم إلغاء الدفعة بنجاح");
      return true;
    } catch (error) {
      console.error("Error cancelling payment:", error);
      toast.error("حدث خطأ أثناء إلغاء الدفعة");
      return false;
    }
  }

  private async confirmReceiptFromCustomer(payment: Payment): Promise<boolean> {
    try {
      // Update party balance
      await this.partyService.updatePartyBalance(
        payment.party_id,
        payment.amount,
        false // isDebit=false decreases customer's debt
      );
      
      // Record financial transaction
      const transactionData = {
        date: new Date().toISOString(),
        account_id: payment.account_id,
        type: 'receipt',
        amount: payment.amount,
        description: `Receipt from customer ${payment.party_id} - Payment ID: ${payment.id}`,
        reference_id: payment.id,
        reference_type: 'payment'
      };
      
      const financialResult = await this.financialService.recordTransaction(transactionData);
      
      if (!financialResult) {
        toast.error("حدث خطأ أثناء تسجيل المعاملة المالية");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error confirming receipt:', error);
      return false;
    }
  }

  private async cancelReceiptFromCustomer(payment: Payment): Promise<boolean> {
    try {
      // Update party balance by reversing the payment
      await this.partyService.updatePartyBalance(
        payment.party_id,
        payment.amount,
        true // isDebit=true increases customer's debt again
      );
      
      // Reverse financial transaction
      const transactionData = {
        date: new Date().toISOString(),
        account_id: payment.account_id,
        type: 'receipt_cancellation',
        amount: -payment.amount,
        description: `Cancellation of receipt from customer ${payment.party_id} - Payment ID: ${payment.id}`,
        reference_id: payment.id,
        reference_type: 'payment'
      };
      
      const financialResult = await this.financialService.recordTransaction(transactionData);
      
      if (!financialResult) {
        toast.error("حدث خطأ أثناء عكس المعاملة المالية");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error cancelling receipt:', error);
      return false;
    }
  }

  private async confirmPaymentToSupplier(payment: Payment): Promise<boolean> {
    try {
      // Update party balance
      await this.partyService.updatePartyBalance(
        payment.party_id,
        payment.amount,
        true // isDebit=true decreases supplier's debt (or increases our credit)
      );
      
      // Record financial transaction
      const transactionData = {
        date: new Date().toISOString(),
        account_id: payment.account_id,
        type: 'payment',
        amount: payment.amount,
        description: `Payment to supplier ${payment.party_id} - Payment ID: ${payment.id}`,
        reference_id: payment.id,
        reference_type: 'payment'
      };
      
      const financialResult = await this.financialService.recordTransaction(transactionData);
      
      if (!financialResult) {
        toast.error("حدث خطأ أثناء تسجيل المعاملة المالية");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      return false;
    }
  }

  private async cancelPaymentToSupplier(payment: Payment): Promise<boolean> {
    try {
      // Update party balance by reversing the payment
      await this.partyService.updatePartyBalance(
        payment.party_id,
        payment.amount,
        false // isDebit=false increases supplier's debt again (or decreases our credit)
      );
      
      // Reverse financial transaction
      const transactionData = {
        date: new Date().toISOString(),
        account_id: payment.account_id,
        type: 'payment_cancellation',
        amount: -payment.amount,
        description: `Cancellation of payment to supplier ${payment.party_id} - Payment ID: ${payment.id}`,
        reference_id: payment.id,
        reference_type: 'payment'
      };
      
      const financialResult = await this.financialService.recordTransaction(transactionData);
      
      if (!financialResult) {
        toast.error("حدث خطأ أثناء عكس المعاملة المالية");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      return false;
    }
  }
}
