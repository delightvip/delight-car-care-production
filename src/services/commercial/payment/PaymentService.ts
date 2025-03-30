
import { supabase } from "@/integrations/supabase/client";
import { Payment } from "../CommercialTypes";
import { toast } from "sonner";
import FinancialPaymentBridge from "@/services/financial/FinancialPaymentBridge";
import PartyService from "@/services/PartyService";

class PaymentService {
  private static instance: PaymentService;
  private financialBridge: FinancialPaymentBridge;
  private partyService: PartyService;
  
  private constructor() {
    this.financialBridge = FinancialPaymentBridge.getInstance();
    this.partyService = PartyService.getInstance();
  }
  
  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }
  
  public async getPayments(): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(item => ({
        id: item.id,
        party_id: item.party_id || '',
        party_name: item.parties?.name || 'غير معروف',
        date: item.date,
        amount: item.amount,
        payment_type: item.payment_type as 'collection' | 'disbursement',
        method: item.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        payment_status: item.payment_status as 'draft' | 'confirmed' | 'cancelled',
        related_invoice_id: item.related_invoice_id || undefined,
        notes: item.notes || '',
        created_at: item.created_at
      }));
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }
  
  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(item => ({
        id: item.id,
        party_id: item.party_id || '',
        party_name: item.parties?.name || 'غير معروف',
        date: item.date,
        amount: item.amount,
        payment_type: item.payment_type as 'collection' | 'disbursement',
        method: item.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        payment_status: item.payment_status as 'draft' | 'confirmed' | 'cancelled',
        related_invoice_id: item.related_invoice_id || undefined,
        notes: item.notes || '',
        created_at: item.created_at
      }));
    } catch (error) {
      console.error(`Error fetching payments for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }
  
  public async getPaymentById(id: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        party_id: data.party_id,
        party_name: data.parties?.name || 'غير معروف',
        date: data.date,
        amount: data.amount,
        payment_type: data.payment_type as 'collection' | 'disbursement',
        method: data.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        payment_status: data.payment_status as 'draft' | 'confirmed' | 'cancelled',
        related_invoice_id: data.related_invoice_id,
        notes: data.notes,
        created_at: data.created_at
      };
    } catch (error) {
      console.error(`Error fetching payment with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات المدفوعة');
      return null;
    }
  }
  
  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          party_id: paymentData.party_id,
          date: paymentData.date,
          amount: paymentData.amount,
          payment_type: paymentData.payment_type,
          method: paymentData.method,
          payment_status: 'draft',
          related_invoice_id: paymentData.related_invoice_id,
          notes: paymentData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('تم تسجيل المدفوعة بنجاح');
      return this.getPaymentById(data.id);
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('حدث خطأ أثناء تسجيل المدفوعة');
      return null;
    }
  }
  
  public async confirmPayment(id: string): Promise<boolean> {
    try {
      // Get payment data with party name
      const payment = await this.getPaymentById(id);
      
      if (!payment) {
        toast.error('المدفوعة غير موجودة');
        return false;
      }
      
      if (payment.payment_status === 'confirmed') {
        toast.info('المدفوعة مؤكدة بالفعل');
        return true;
      }
      
      // Update party balance
      if (payment.party_id) {
        const isCredit = payment.payment_type === 'collection';
        
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          !isCredit, // مدين إذا كان disbursement، دائن إذا كان collection
          isCredit ? 'تحصيل دفعة' : 'تسديد دفعة',
          isCredit ? 'payment_collection' : 'payment_disbursement',
          payment.id
        );
      }
      
      // Update financial balances via bridge
      await this.financialBridge.handlePaymentConfirmation(payment);
      
      // Update payment status to confirmed
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_status: 'confirmed' })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast.success('تم تأكيد المدفوعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('حدث خطأ أثناء تأكيد المدفوعة');
      return false;
    }
  }
  
  public async cancelPayment(id: string): Promise<boolean> {
    try {
      // Get payment data with party name
      const payment = await this.getPaymentById(id);
      
      if (!payment) {
        toast.error('المدفوعة غير موجودة');
        return false;
      }
      
      if (payment.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء المدفوعات المؤكدة فقط');
        return false;
      }
      
      // Reverse party balance update
      if (payment.party_id) {
        const isCredit = payment.payment_type === 'collection';
        
        await this.partyService.updatePartyBalance(
          payment.party_id,
          payment.amount,
          isCredit, // عكس التأثير الأصلي
          isCredit ? 'إلغاء تحصيل دفعة' : 'إلغاء تسديد دفعة',
          isCredit ? 'cancel_payment_collection' : 'cancel_payment_disbursement',
          payment.id
        );
      }
      
      // Update financial balances via bridge
      await this.financialBridge.handlePaymentCancellation(payment);
      
      // Update payment status to cancelled
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_status: 'cancelled' })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      toast.success('تم إلغاء المدفوعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error('حدث خطأ أثناء إلغاء المدفوعة');
      return false;
    }
  }
  
  public async updatePayment(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<boolean> {
    try {
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('payment_status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (payment.payment_status !== 'draft') {
        toast.error('يمكن تعديل المدفوعات في حالة المسودة فقط');
        return false;
      }
      
      const { error } = await supabase
        .from('payments')
        .update({
          party_id: paymentData.party_id,
          date: paymentData.date,
          amount: paymentData.amount,
          payment_type: paymentData.payment_type,
          method: paymentData.method,
          related_invoice_id: paymentData.related_invoice_id,
          notes: paymentData.notes
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث المدفوعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('حدث خطأ أثناء تحديث المدفوعة');
      return false;
    }
  }
  
  public async deletePayment(id: string): Promise<boolean> {
    try {
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('payment_status')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (payment.payment_status !== 'draft') {
        toast.error('يمكن حذف المدفوعات في حالة المسودة فقط');
        return false;
      }
      
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف المدفوعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('حدث خطأ أثناء حذف المدفوعة');
      return false;
    }
  }
}

export default PaymentService;
