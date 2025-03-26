
import { supabase } from "@/integrations/supabase/client";
import { Payment } from "@/services/CommercialTypes";

export class PaymentEntity {
  /**
   * Fetch all payments with their related data
   */
  static async fetchAll(): Promise<Payment[]> {
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
        party_name: payment.parties?.name || "",
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type as "collection" | "disbursement",
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status as "draft" | "confirmed" | "cancelled",
        notes: payment.notes,
        created_at: payment.created_at
      }));
      
      return paymentsWithParties;
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  }
  
  /**
   * Fetch payments by party
   */
  static async fetchByParty(partyId: string): Promise<Payment[]> {
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
        party_name: payment.parties?.name || "",
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type as "collection" | "disbursement",
        method: payment.method,
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status as "draft" | "confirmed" | "cancelled",
        notes: payment.notes,
        created_at: payment.created_at
      }));
      
      return paymentsWithParties;
    } catch (error) {
      console.error(`Error fetching payments for party ${partyId}:`, error);
      return [];
    }
  }
  
  /**
   * Fetch a specific payment by ID
   */
  static async fetchById(id: string): Promise<Payment | null> {
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
        party_name: data.parties?.name || "",
        date: data.date,
        amount: data.amount,
        payment_type: data.payment_type as "collection" | "disbursement",
        method: data.method,
        related_invoice_id: data.related_invoice_id,
        payment_status: data.payment_status as "draft" | "confirmed" | "cancelled",
        notes: data.notes,
        created_at: data.created_at
      };
    } catch (error) {
      console.error(`Error fetching payment with id ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Create a new payment
   */
  static async create(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          party_id: paymentData.party_id,
          date: paymentData.date,
          amount: paymentData.amount,
          payment_type: paymentData.payment_type,
          method: paymentData.method,
          related_invoice_id: paymentData.related_invoice_id,
          payment_status: paymentData.payment_status || 'draft',
          notes: paymentData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        payment_type: data.payment_type as "collection" | "disbursement",
        party_name: paymentData.party_name || "",
        payment_status: data.payment_status as "draft" | "confirmed" | "cancelled"
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      return null;
    }
  }
  
  /**
   * Update an existing payment
   */
  static async update(id: string, paymentData: Partial<Payment>): Promise<boolean> {
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
      
      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      return false;
    }
  }
  
  /**
   * Delete a payment
   */
  static async delete(id: string): Promise<boolean> {
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
