import { supabase } from "@/integrations/supabase/client";
import { Payment } from '@/services/commercial/CommercialTypes';

export class PaymentEntity {
  /**
   * جلب جميع الدفعات
   */
  public static async fetchAll(): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties(name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to match Payment type
      const payments: Payment[] = data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id || '',
        party_name: payment.parties?.name || '',
        date: payment.date,
        amount: payment.amount,
        // Type assertion to ensure payment_type matches the expected union type
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        method: payment.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        related_invoice_id: payment.related_invoice_id || '',
        // Type assertion to ensure payment_status matches the expected union type
        payment_status: payment.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: payment.notes || '',
        created_at: payment.created_at
      }));
      
      return payments;
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  }
  
  /**
   * جلب جميع الدفعات الخاصة بعميل/مورد معين
   */
  public static async fetchByPartyId(partyId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties(name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to match Payment type
      const payments: Payment[] = data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id || '',
        party_name: payment.parties?.name || '',
        date: payment.date,
        amount: payment.amount,
        // Type assertion to ensure payment_type matches the expected union type
        payment_type: payment.payment_type as 'collection' | 'disbursement',
        method: payment.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        related_invoice_id: payment.related_invoice_id || '',
        // Type assertion to ensure payment_status matches the expected union type
        payment_status: payment.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: payment.notes || '',
        created_at: payment.created_at
      }));
      
      return payments;
    } catch (error) {
      console.error('Error fetching payments by party ID:', error);
      return [];
    }
  }
  
  /**
   * جلب دفعة بواسطة المعرف
   */
  public static async fetchById(id: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties(name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        party_id: data.party_id || '',
        party_name: data.parties?.name || '',
        date: data.date,
        amount: data.amount,
        // Type assertion to ensure payment_type matches the expected union type
        payment_type: data.payment_type as 'collection' | 'disbursement',
        method: data.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        related_invoice_id: data.related_invoice_id || '',
        // Type assertion to ensure payment_status matches the expected union type
        payment_status: data.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: data.notes || '',
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error fetching payment by ID:', error);
      return null;
    }
  }
  
  /**
   * إنشاء دفعة جديدة
   */
  public static async create(payment: Omit<Payment, 'id' | 'party_name' | 'created_at'>): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          party_id: payment.party_id,
          date: payment.date,
          amount: payment.amount,
          payment_type: payment.payment_type,
          method: payment.method,
          related_invoice_id: payment.related_invoice_id || null,
          payment_status: payment.payment_status,
          notes: payment.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Fetch party name
      const { data: partyData, error: partyError } = await supabase
        .from('parties')
        .select('name')
        .eq('id', payment.party_id)
        .single();
      
      if (partyError) {
        console.error('Error fetching party name:', partyError);
      }
      
      return {
        id: data.id,
        party_id: data.party_id || '',
        party_name: partyData?.name || '',
        date: data.date,
        amount: data.amount,
        payment_type: data.payment_type as 'collection' | 'disbursement',
        method: data.method as 'cash' | 'check' | 'bank_transfer' | 'other',
        related_invoice_id: data.related_invoice_id || '',
        payment_status: data.payment_status as 'draft' | 'confirmed' | 'cancelled',
        notes: data.notes || '',
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      return null;
    }
  }
  
  /**
   * تحديث دفعة موجودة
   */
  public static async update(id: string, updates: Partial<Payment>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          party_id: updates.party_id,
          date: updates.date,
          amount: updates.amount,
          payment_type: updates.payment_type,
          method: updates.method,
          related_invoice_id: updates.related_invoice_id || null,
          payment_status: updates.payment_status,
          notes: updates.notes
        })
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      return false;
    }
  }
  
  /**
   * حذف دفعة
   */
  public static async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting payment:', error);
      return false;
    }
  }
}
