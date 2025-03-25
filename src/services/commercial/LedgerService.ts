
import BaseCommercialService from './BaseCommercialService';
import { LedgerEntry } from '../CommercialTypes';
import { toast } from "sonner";

class LedgerService extends BaseCommercialService {
  private static instance: LedgerService;
  
  private constructor() {
    super();
  }
  
  public static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }
  
  public async getLedgerEntries(partyId: string, startDate?: string, endDate?: string): Promise<LedgerEntry[]> {
    try {
      let query = this.supabase
        .from('ledger_entries')
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
      const party = await this.partyService.getPartyById(partyId);
      
      return data.map(entry => ({
        id: entry.id,
        party_id: entry.party_id,
        party_name: party?.name,
        transaction_id: entry.transaction_id,
        transaction_type: entry.transaction_type,
        date: entry.date,
        debit: entry.debit,
        credit: entry.credit,
        balance_after: entry.balance_after,
        created_at: entry.created_at,
        notes: entry.notes
      }));
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      toast.error('حدث خطأ أثناء جلب سجل الحساب');
      return [];
    }
  }
  
  public async generateAccountStatement(startDate: string, endDate: string, partyType?: string): Promise<any> {
    try {
      // Get parties of the specified type or all if not specified
      let parties;
      if (partyType && partyType !== 'all') {
        parties = await this.partyService.getPartiesByType(partyType as "customer" | "supplier" | "other");
      } else {
        parties = await this.partyService.getParties();
      }
      
      // For each party, get their ledger entries in the date range
      const results = await Promise.all(
        parties.map(async (party) => {
          const entries = await this.getLedgerEntries(party.id, startDate, endDate);
          
          // Calculate totals
          let totalDebit = 0;
          let totalCredit = 0;
          entries.forEach(entry => {
            totalDebit += entry.debit;
            totalCredit += entry.credit;
          });
          
          return {
            party_id: party.id,
            party_name: party.name,
            party_type: party.type,
            opening_balance: entries.length > 0 ? (entries[0].balance_after - entries[0].debit + entries[0].credit) : party.balance,
            closing_balance: entries.length > 0 ? entries[entries.length - 1].balance_after : party.balance,
            total_debit: totalDebit,
            total_credit: totalCredit,
            entries: entries
          };
        })
      );
      
      return {
        start_date: startDate,
        end_date: endDate,
        generated_at: new Date().toISOString(),
        party_type: partyType || 'all',
        statements: results
      };
    } catch (error) {
      console.error('Error generating account statements:', error);
      toast.error('حدث خطأ أثناء إنشاء كشف الحساب');
      return null;
    }
  }
}

export default LedgerService;
