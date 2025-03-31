
import { supabase } from "@/integrations/supabase/client";
import { LedgerEntry } from '@/services/commercial/CommercialTypes';
import { toast } from "sonner";

export class LedgerEntity {
  /**
   * Fetch ledger entries for a party
   */
  public static async fetchLedgerEntries(partyId: string, startDate?: string, endDate?: string): Promise<LedgerEntry[]> {
    try {
      let query = supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: true });
      
      if (startDate) {
        query = query.gte('date', startDate);
      }
      
      if (endDate) {
        query = query.lte('date', endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Get party name
      const { data: partyData, error: partyError } = await supabase
        .from('parties')
        .select('name')
        .eq('id', partyId)
        .single();
      
      if (partyError) {
        console.error('Error fetching party:', partyError);
      }
      
      return data.map(entry => ({
        id: entry.id,
        party_id: entry.party_id,
        party_name: partyData?.name,
        transaction_id: entry.transaction_id,
        transaction_type: entry.transaction_type,
        date: entry.date,
        debit: entry.debit,
        credit: entry.credit,
        balance_after: entry.balance_after,
        created_at: entry.created_at,
        notes: entry.notes || ''
      }));
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      toast.error('حدث خطأ أثناء جلب سجل الحساب');
      return [];
    }
  }

  /**
   * Fetch the previous balance before a certain date
   */
  public static async fetchPreviousBalance(partyId: string, startDate: string): Promise<number> {
    try {
      const { data: previousEntries, error: previousError } = await supabase
        .from('ledger')
        .select('balance_after')
        .eq('party_id', partyId)
        .lt('date', startDate)
        .order('date', { ascending: false })
        .limit(1);
      
      if (previousError) throw previousError;
      
      if (previousEntries.length > 0) {
        return previousEntries[0].balance_after;
      } else {
        // If no previous entries, get opening balance from party
        const { data: party, error: partyError } = await supabase
          .from('parties')
          .select('opening_balance, balance_type')
          .eq('id', partyId)
          .single();
          
        if (partyError) throw partyError;
        
        if (party) {
          return party.balance_type === 'debit' 
            ? party.opening_balance 
            : -party.opening_balance;
        }
        return 0;
      }
    } catch (error) {
      console.error('Error fetching previous balance:', error);
      return 0;
    }
  }
}
