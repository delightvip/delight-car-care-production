
import { supabase } from '@/integrations/supabase/client';
import { Payment } from '@/services/CommercialTypes';

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
          parties:party_id (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Map the data to our Payment type with party name
      const payments = data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type as "collection" | "disbursement",
        method: payment.method as "cash" | "check" | "bank_transfer" | "other",
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status as "draft" | "confirmed" | "cancelled",
        notes: payment.notes,
        created_at: payment.created_at
      }));
      
      return payments;
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  }
  
  /**
   * Fetch payments for a specific party
   */
  static async fetchByPartyId(partyId: string): Promise<Payment[]> {
    try {
      let { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties:party_id (name)
        `)
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Map the data to our Payment type with party name
      const payments = data.map(payment => ({
        id: payment.id,
        party_id: payment.party_id,
        party_name: payment.parties?.name,
        date: payment.date,
        amount: payment.amount,
        payment_type: payment.payment_type as "collection" | "disbursement",
        method: payment.method as "cash" | "check" | "bank_transfer" | "other",
        related_invoice_id: payment.related_invoice_id,
        payment_status: payment.payment_status as "draft" | "confirmed" | "cancelled",
        notes: payment.notes,
        created_at: payment.created_at
      }));
      
      return payments;
    } catch (error) {
      console.error('Error fetching payments for party:', error);
      return [];
    }
  }
}
