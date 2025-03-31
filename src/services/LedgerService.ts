import BaseCommercialService from './commercial/BaseCommercialService';
import { LedgerEntry } from './commercial/CommercialTypes';
import { toast } from "sonner";
import { format } from 'date-fns';

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
        notes: ''
      }));
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      toast.error('حدث خطأ أثناء جلب سجل الحساب');
      return [];
    }
  }
  
  // Remaining methods are moved to LedgerReportService.ts to reduce file size
}

export default LedgerService;
