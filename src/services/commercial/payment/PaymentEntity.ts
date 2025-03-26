
import { supabase } from "@/integrations/supabase/client";
import { Payment } from '@/services/CommercialTypes';
import { toast } from "sonner";
import { format } from 'date-fns';

// خدمة تُعنى بعمليات جلب وإنشاء الدفعات المالية
export class PaymentEntity {
  // جلب كافة المدفوعات
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
  
  // جلب المدفوعات حسب الطرف
  public static async fetchByParty(partyId: string): Promise<Payment[]> {
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
  
  // إنشاء دفعة جديدة
  public static async create(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
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
      
      console.log("تم إنشاء الدفعة بنجاح:", payment);
      
      return payment;
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة');
      return null;
    }
  }
  
  // تحديث دفعة موجودة
  public static async update(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<boolean> {
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
      const formattedDate = typeof paymentData.date === 'object' ? 
        format(paymentData.date, 'yyyy-MM-dd') : 
        paymentData.date;
        
      const { error } = await supabase
        .from('payments')
        .update({
          party_id: paymentData.party_id,
          date: formattedDate,
          amount: paymentData.amount,
          payment_type: paymentData.payment_type,
          method: paymentData.method,
          related_invoice_id: paymentData.related_invoice_id,
          notes: paymentData.notes
        })
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
  
  // حذف دفعة
  public static async delete(id: string): Promise<boolean> {
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
