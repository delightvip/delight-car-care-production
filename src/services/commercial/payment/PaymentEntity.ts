
import { supabase } from "@/integrations/supabase/client";
import { Payment } from "@/services/CommercialTypes";
import { toast } from "sonner";
import { format } from "date-fns";

export class PaymentEntity {
  /**
   * جلب جميع المدفوعات
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
        payment_type: payment.payment_type as "collection" | "disbursement",
        method: payment.method as "cash" | "check" | "bank_transfer" | "other",
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status as "draft" | "confirmed" | "cancelled" || 'draft',
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
   * جلب مدفوعات طرف محدد
   */
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
        payment_type: payment.payment_type as "collection" | "disbursement",
        method: payment.method as "cash" | "check" | "bank_transfer" | "other",
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status as "draft" | "confirmed" | "cancelled" || 'draft',
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
   * جلب مدفوعة محددة بواسطة المعرف
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
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        party_id: data.party_id,
        party_name: data.parties?.name,
        date: data.date,
        amount: data.amount,
        payment_type: data.payment_type as "collection" | "disbursement",
        method: data.method as "cash" | "check" | "bank_transfer" | "other",
        related_invoice_id: data.related_invoice_id,
        payment_status: data.payment_status as "draft" | "confirmed" | "cancelled" || 'draft',
        notes: data.notes,
        created_at: data.created_at
      };
    } catch (error) {
      console.error(`Error fetching payment with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب معلومات المدفوعة');
      return null;
    }
  }
  
  /**
   * إنشاء مدفوعة جديدة
   */
  public static async create(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      // تنسيق التاريخ إذا كان كائن Date
      const formattedDate = typeof paymentData.date === 'object' ? 
        format(paymentData.date, 'yyyy-MM-dd') : 
        paymentData.date;
        
      // تعيين حالة الدفع الافتراضية إلى مسودة
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
      
      // الحصول على تفاصيل الطرف للرد
      const { data: party } = await supabase
        .from('parties')
        .select('name')
        .eq('id', paymentData.party_id)
        .single();
      
      toast.success('تم تسجيل المعاملة بنجاح');
      
      return {
        id: payment.id,
        party_id: payment.party_id,
        party_name: party?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type as "collection" | "disbursement",
        method: payment.method as "cash" | "check" | "bank_transfer" | "other",
        related_invoice_id: payment.related_invoice_id,
        payment_status: paymentStatus as "draft" | "confirmed" | "cancelled",
        notes: payment.notes,
        created_at: payment.created_at
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة');
      return null;
    }
  }
  
  /**
   * تحديث مدفوعة موجودة
   */
  public static async update(id: string, paymentData: Partial<Payment>): Promise<boolean> {
    try {
      // تنسيق التاريخ إذا كان كائن Date
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
          payment_status: paymentData.payment_status,
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
  
  /**
   * حذف مدفوعة
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
      console.error('Error deleting payment:', error);
      toast.error('حدث خطأ أثناء حذف المعاملة');
      return false;
    }
  }
}
