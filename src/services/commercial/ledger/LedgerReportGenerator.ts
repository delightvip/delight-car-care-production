
import PartyService from '@/services/PartyService';
import { supabase } from '@/integrations/supabase/client';

// Define LedgerEntity interface if it's missing
interface LedgerEntity {
  id: string;
  party_id: string;
  date: string;
  transaction_id: string;
  transaction_type: string;
  debit: number;
  credit: number;
  balance_after: number;
  created_at?: string;
}

class LedgerReportGenerator {
  private partyService: PartyService;
  
  constructor() {
    this.partyService = PartyService.getInstance();
  }
  
  async getPartyLedger(partyId: string, startDate?: string, endDate?: string) {
    try {
      let query = supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });
        
      if (startDate) {
        query = query.gte('date', startDate);
      }
      
      if (endDate) {
        query = query.lte('date', endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const party = await this.partyService.getPartyById(partyId);
      
      return {
        party,
        entries: data as LedgerEntity[],
        summary: this.calculateSummary(data as LedgerEntity[]),
      };
    } catch (error) {
      console.error('Error generating party ledger report:', error);
      return {
        party: null,
        entries: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0
        }
      };
    }
  }
  
  async getGeneralLedger(startDate?: string, endDate?: string) {
    try {
      let query = supabase
        .from('ledger')
        .select('*')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });
        
      if (startDate) {
        query = query.gte('date', startDate);
      }
      
      if (endDate) {
        query = query.lte('date', endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const parties = await this.partyService.getParties();
      
      // Group by party
      const groupedData: Record<string, LedgerEntity[]> = {};
      
      data.forEach(entry => {
        if (!groupedData[entry.party_id]) {
          groupedData[entry.party_id] = [];
        }
        
        groupedData[entry.party_id].push(entry as LedgerEntity);
      });
      
      const result = Object.keys(groupedData).map(partyId => {
        const party = parties.find(p => p.id === partyId);
        
        return {
          party,
          entries: groupedData[partyId],
          summary: this.calculateSummary(groupedData[partyId])
        };
      });
      
      return {
        reports: result,
        summary: this.calculateSummary(data as LedgerEntity[])
      };
    } catch (error) {
      console.error('Error generating general ledger report:', error);
      return {
        reports: [],
        summary: {
          totalDebit: 0,
          totalCredit: 0,
          balance: 0
        }
      };
    }
  }
  
  private calculateSummary(entries: LedgerEntity[]) {
    const totalDebit = entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredit = entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    const balance = totalDebit - totalCredit;
    
    return {
      totalDebit,
      totalCredit,
      balance
    };
  }
}

export default LedgerReportGenerator;
