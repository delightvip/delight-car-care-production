
import { supabase } from "@/integrations/supabase/client";
import { LedgerEntry } from "../../CommercialTypes";

class LedgerReportGenerator {
  private static instance: LedgerReportGenerator;
  
  private constructor() {}
  
  public static getInstance(): LedgerReportGenerator {
    if (!LedgerReportGenerator.instance) {
      LedgerReportGenerator.instance = new LedgerReportGenerator();
    }
    return LedgerReportGenerator.instance;
  }
  
  public async generateLedgerReport(startDate: string, endDate: string, type?: 'customer' | 'supplier'): Promise<LedgerEntry[]> {
    try {
      let query = supabase
        .from('ledger')
        .select(`
          *,
          parties:party_id (name, type)
        `)
        .gte('date', startDate)
        .lte('date', endDate);
      
      // Filter by party type if specified
      if (type) {
        query = query.eq('parties.type', type);
      }
      
      const { data, error } = await query.order('date', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(entry => ({
        id: entry.id,
        party_id: entry.party_id,
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
      console.error('Error generating ledger report:', error);
      return [];
    }
  }
  
  public async generateAccountStatement(partyId: string, startDate: string, endDate: string): Promise<LedgerEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(entry => ({
        id: entry.id,
        party_id: entry.party_id,
        transaction_id: entry.transaction_id || '',
        transaction_type: entry.transaction_type,
        date: entry.date,
        debit: entry.debit,
        credit: entry.credit,
        balance_after: entry.balance_after,
        created_at: entry.created_at,
        notes: entry.notes || ''
      }));
    } catch (error) {
      console.error(`Error generating account statement for party ${partyId}:`, error);
      return [];
    }
  }
}

export default LedgerReportGenerator;
