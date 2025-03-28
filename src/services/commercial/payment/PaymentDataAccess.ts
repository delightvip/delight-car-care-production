
import { supabase } from '@/integrations/supabase/client';
import { Payment } from '@/services/CommercialTypes';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PartyService from '../party/PartyService';

/**
 * وصول البيانات للمدفوعات
 */
class PaymentDataAccess {
  private partyService: PartyService;
  
  constructor() {
    this.partyService = PartyService.getInstance();
  }

  /**
   * الحصول على جميع المدفوعات
   */
  public async getPayments(): Promise<Payment[]> {
    try {
      let { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const paymentsWithParties = data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type,
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status || 'draft',
        notes: payment.notes,
        created_at: payment.created_at
      }));
      
      return paymentsWithParties;
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }
  
  /**
   * الحصول على مدفوعات طرف معين
   * @param partyId معرف الطرف
   */
  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    try {
      let { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      const paymentsWithParties = data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type,
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status || 'draft',
        notes: payment.notes,
        created_at: payment.created_at
      }));
      
      return paymentsWithParties;
    } catch (error) {
      console.error(`Error fetching payments for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }

  /**
   * الحصول على دفعة بواسطة المعرف
   * @param paymentId معرف الدفعة
   */
  public async getPaymentById(paymentId: string): Promise<Payment | null> {
    try {
      let { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', paymentId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) return null;
      
      return {
        id: data.id,
        party_id: data.party_id,
        party_name: data.parties?.name,
        date: data.date,
        amount: data.amount,
        payment_type: data.payment_type,
        method: data.method,
        related_invoice_id: data.related_invoice_id,
        payment_status: data.payment_status || 'draft',
        notes: data.notes,
        created_at: data.created_at
      };
    } catch (error) {
      console.error(`Error fetching payment ${paymentId}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات المدفوعات');
      return null;
    }
  }

  /**
   * تسجيل دفعة جديدة
   * @param paymentData بيانات الدفعة
   */
  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      // Format date if it's a Date object
      const formattedDate = typeof paymentData.date === 'object' ? 
        format(paymentData.date, 'yyyy-MM-dd') : 
        paymentData.date;
        
      // Set default payment status to draft
      const paymentStatus = paymentData.payment_status || 'draft';
      
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          party_id: paymentData.party_id,
          date: formattedDate,
          amount: paymentData.amount,
          payment_type: paymentData.payment_type,
          method: paymentData.method,
          related_invoice_id: paymentData.related_invoice_id,
          payment_status: paymentStatus,
          notes: paymentData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Get party details for response
      const party = await this.partyService.getPartyById(paymentData.party_id);
      
      return {
        id: payment.id,
        party_id: payment.party_id,
        party_name: party?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type,
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        payment_status: paymentStatus,
        notes: payment.notes,
        created_at: payment.created_at
      };
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة');
      return null;
    }
  }

  /**
   * تحديث حالة الدفعة
   * @param id معرف الدفعة
   * @param status الحالة الجديدة
   */
  public async updatePaymentStatus(id: string, status: 'draft' | 'confirmed' | 'cancelled'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ payment_status: status })
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error(`Error updating payment status for ${id}:`, error);
      toast.error('حدث خطأ أثناء تحديث حالة المعاملة');
      return false;
    }
  }

  /**
   * تحديث دفعة
   * @param id معرف الدفعة
   * @param paymentData بيانات الدفعة المحدثة
   */
  public async updatePayment(id: string, paymentData: Partial<Omit<Payment, 'id' | 'created_at'>>): Promise<boolean> {
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
      
      // Format date if it's a Date object
      const formattedDate = paymentData.date && typeof paymentData.date === 'object' ? 
        format(paymentData.date, 'yyyy-MM-dd') : 
        paymentData.date;
        
      const updateData: any = {};
      
      if (paymentData.party_id) updateData.party_id = paymentData.party_id;
      if (formattedDate) updateData.date = formattedDate;
      if (paymentData.amount) updateData.amount = paymentData.amount;
      if (paymentData.payment_type) updateData.payment_type = paymentData.payment_type;
      if (paymentData.method) updateData.method = paymentData.method;
      if (paymentData.related_invoice_id !== undefined) updateData.related_invoice_id = paymentData.related_invoice_id;
      if (paymentData.notes !== undefined) updateData.notes = paymentData.notes;
      
      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('حدث خطأ أثناء تحديث المعاملة');
      return false;
    }
  }
  
  /**
   * حذف دفعة
   * @param id معرف الدفعة
   */
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
      
      toast.success('تم حذف المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('حدث خطأ أثناء حذف المعاملة');
      return false;
    }
  }
}

export default PaymentDataAccess;
