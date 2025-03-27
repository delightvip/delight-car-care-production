
import { supabase } from "@/integrations/supabase/client";
import { LedgerEntry } from "../../CommercialTypes";
import LedgerReportGenerator from "./LedgerReportGenerator";
import { toast } from "sonner";

class LedgerService {
  private static instance: LedgerService;
  
  private constructor() {}
  
  public static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }
  
  // Add a ledger entry
  public async addLedgerEntry(entry: Omit<LedgerEntry, 'id' | 'created_at'>): Promise<LedgerEntry | null> {
    try {
      if (!entry.transaction_id) {
        throw new Error("Transaction ID is required");
      }
      
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
  
  // Get ledger entries for a party
  public async getLedgerEntriesForParty(partyId: string): Promise<LedgerEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error(`Error fetching ledger entries for party ${partyId}:`, error);
      return [];
    }
  }
  
  // Generate ledger report between dates
  public async generateLedgerReport(startDate: string, endDate: string, type?: 'customer' | 'supplier'): Promise<LedgerEntry[]> {
    try {
      const reportGenerator = LedgerReportGenerator.getInstance();
      const report = await reportGenerator.generateLedgerReport(startDate, endDate, type);
      return report;
    } catch (error) {
      console.error('Error generating ledger report:', error);
      toast.error('حدث خطأ أثناء إنشاء تقرير الحسابات');
      return [];
    }
  }
  
  // Generate account statement for a specific party
  public async generateAccountStatement(partyId: string, startDate: string, endDate: string): Promise<LedgerEntry[]> {
    try {
      const reportGenerator = LedgerReportGenerator.getInstance();
      const statement = await reportGenerator.generateAccountStatement(partyId, startDate, endDate);
      return statement;
    } catch (error) {
      console.error(`Error generating account statement for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء إنشاء كشف الحساب');
      return [];
    }
  }
  
  // Get party balance
  public async getPartyBalance(partyId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('party_balances')
        .select('balance')
        .eq('party_id', partyId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No records found
          return 0;
        }
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
