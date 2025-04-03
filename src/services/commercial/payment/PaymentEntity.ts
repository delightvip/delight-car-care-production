
import { supabase } from "@/integrations/supabase/client";
import { Payment } from '@/services/commercial/CommercialTypes';
import { toast } from "sonner";

// تكاملية وصول البيانات للمدفوعات
export class PaymentEntity {
  /**
   * جلب كافة المدفوعات
   * @returns قائمة بكل المدفوعات
   */
  public static async fetchAll(): Promise<Payment[]> {
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
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        method: payment.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status as 'draft' | 'confirmed' | 'cancelled',
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
   * جلب معاملة دفع محددة بواسطة المعرف
   * @param id معرف معاملة الدفع
   * @returns بيانات معاملة الدفع إذا وجدت، أو null إذا لم توجد
   */
  public static async fetchById(id: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties (name)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) return null;
      
      return {
        id: data.id,
        party_id: data.party_id,
        party_name: data.parties?.name,
        date: data.date,
        amount: data.amount,
        payment_type: data.payment_type as 'collection' | 'disbursement',
        method: data.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        related_invoice_id: data.related_invoice_id,
        payment_status: data.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: data.notes,
        created_at: data.created_at
      };
    } catch (error) {
      console.error(`Error fetching payment ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات المعاملة');
      return null;
    }
  }
  
  /**
   * جلب المدفوعات الخاصة بطرف تجاري محدد
   * @param partyId معرف الطرف التجاري
   * @returns قائمة بالمدفوعات المرتبطة بالطرف
   */
  public static async fetchByPartyId(partyId: string): Promise<Payment[]> {
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
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        method: payment.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status as 'draft' | 'confirmed' | 'cancelled',
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
   * إنشاء معاملة دفع جديدة
   * @param paymentData بيانات الدفع
   * @returns بيانات المعاملة المنشأة إذا نجحت العملية، أو null إذا فشلت
   */
  public static async create(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      // Set default payment status to draft
      const paymentStatus = paymentData.payment_status || 'draft';
      
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          party_id: paymentData.party_id,
          date: paymentData.date,
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
      
      return {
        ...payment,
        party_name: '',  // سيتم تعبئته عند الحاجة في الخدمات العليا
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        method: payment.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        payment_status: payment.payment_status as 'draft' | 'confirmed' | 'cancelled'
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('حدث خطأ أثناء إنشاء معاملة جديدة');
      return null;
    }
  }
  
  /**
   * تحديث معاملة دفع
   * @param id معرف معاملة الدفع
   * @param paymentData بيانات التحديث
   * @returns نجاح العملية
   */
  public static async update(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          party_id: paymentData.party_id,
          date: paymentData.date,
          amount: paymentData.amount,
          payment_type: paymentData.payment_type,
          method: paymentData.method,
          related_invoice_id: paymentData.related_invoice_id,
          payment_status: paymentData.payment_status,
          notes: paymentData.notes
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error(`Error updating payment ${id}:`, error);
      toast.error('حدث خطأ أثناء تحديث المعاملة');
      return false;
    }
  }
  
  /**
   * حذف معاملة دفع
   * @param id معرف معاملة الدفع
   * @returns نجاح العملية
   */
  public static async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف المعاملة بنجاح');
      return true;
    } catch (error) {
      console.error(`Error deleting payment ${id}:`, error);
      toast.error('حدث خطأ أثناء حذف المعاملة');
      return false;
    }
  }
}

export default PaymentEntity;
