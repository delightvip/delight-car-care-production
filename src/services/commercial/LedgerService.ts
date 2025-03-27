
import { supabase } from "@/integrations/supabase/client";
import { LedgerEntry } from "../CommercialTypes";

class LedgerService {
  private static instance: LedgerService;
  
  private constructor() {}
  
  public static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }
  
  public async getLedgerEntriesByParty(partyId: string): Promise<LedgerEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      return [];
    }
  }
  
  public async getLedgerEntriesByType(type: 'customer' | 'supplier'): Promise<LedgerEntry[]> {
    try {
      // First get all parties of the specified type
      const { data: parties, error: partiesError } = await supabase
        .from('parties')
        .select('id')
        .eq('type', type);
      
      if (partiesError) throw partiesError;
      
      if (!parties || parties.length === 0) return [];
      
      // Then get all ledger entries for these parties
      const partyIds = parties.map(party => party.id);
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .in('party_id', partyIds)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error(`Error fetching ledger entries for ${type}:`, error);
      return [];
    }
  }
  
  public async addLedgerEntry(entry: Omit<LedgerEntry, 'id' | 'created_at'>): Promise<LedgerEntry | null> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .insert(entry)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error adding ledger entry:', error);
      return null;
    }
  }
  
  public async getPartyBalance(partyId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('party_balances')
        .select('balance')
        .eq('party_id', partyId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is fine - we'll just return 0
        throw error;
      }
      
      return data?.balance || 0;
    } catch (error) {
      console.error(`Error fetching balance for party ${partyId}:`, error);
      return 0;
    }
  }
}

export default LedgerService;
