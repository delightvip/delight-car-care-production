import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LedgerEntry } from '@/services/CommercialTypes';
import LedgerReportGenerator from './LedgerReportGenerator';

class LedgerService {
  private static instance: LedgerService;
  private reportGenerator: LedgerReportGenerator;

  private constructor() {
    this.reportGenerator = new LedgerReportGenerator();
  }

  public static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }

  async getLedgerEntries(partyId: string, startDate?: string, endDate?: string): Promise<LedgerEntry[]> {
    try {
      let query = supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as LedgerEntry[];
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      toast.error('Failed to fetch ledger entries');
      return [];
    }
  }

  async addLedgerEntry(ledgerEntry: Omit<LedgerEntry, 'id' | 'created_at'>): Promise<LedgerEntry | null> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .insert(ledgerEntry)
        .select('*')
        .single();

      if (error) throw error;

      toast.success('Ledger entry added successfully');
      return data as LedgerEntry;
    } catch (error) {
      console.error('Error adding ledger entry:', error);
      toast.error('Failed to add ledger entry');
      return null;
    }
  }

  async updateLedgerEntry(id: string, ledgerEntry: Partial<LedgerEntry>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ledger')
        .update(ledgerEntry)
        .eq('id', id);

      if (error) throw error;

      toast.success('Ledger entry updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating ledger entry:', error);
      toast.error('Failed to update ledger entry');
      return false;
    }
  }

  async deleteLedgerEntry(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ledger')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Ledger entry deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting ledger entry:', error);
      toast.error('Failed to delete ledger entry');
      return false;
    }
  }

  async generatePartyLedgerReport(partyId: string, startDate?: string, endDate?: string) {
    return this.reportGenerator.getPartyLedger(partyId, startDate, endDate);
  }

  async generateGeneralLedgerReport(startDate?: string, endDate?: string) {
    return this.reportGenerator.getGeneralLedger(startDate, endDate);
  }
}

export default LedgerService;
