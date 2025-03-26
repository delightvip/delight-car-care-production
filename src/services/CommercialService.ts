
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PartyService from './PartyService';
import { Invoice, Payment, Return, LedgerEntry } from './CommercialTypes';
import ReturnService from './commercial/ReturnService';

class CommercialService {
  private static instance: CommercialService;
  private partyService: PartyService;
  private returnService: ReturnService;

  private constructor() {
    this.partyService = PartyService.getInstance();
    this.returnService = ReturnService.getInstance();
  }

  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }

  public async getParties() {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الأطراف');
      return [];
    }
  }

  // Add the missing methods
  public async getInvoicesByParty(partyId: string): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('party_id', partyId)
        .order('date', { ascending: false });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error(`Error fetching invoices for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء جلب الفواتير');
      return [];
    }
  }

  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error(`Error fetching payments for party ${partyId}:`, error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }

  public async getLedgerEntries(partyId: string, startDate?: string, endDate?: string): Promise<LedgerEntry[]> {
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
      
      return data || [];
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
        // Convert partyType to the correct type
        const validPartyType = (partyType === 'customer' || partyType === 'supplier' || partyType === 'other') 
          ? partyType as "customer" | "supplier" | "other"
          : "customer"; // Default to customer if invalid value
        
        parties = await this.partyService.getPartiesByType(validPartyType);
      } else {
        parties = await this.partyService.getParties();
      }
      
      // For each party, get their ledger entries in the date range and calculate balances
      const statements = await Promise.all(
        parties.map(async (party) => {
          const entries = await this.getLedgerEntries(party.id, startDate, endDate);
          
          return {
            party_id: party.id,
            party_name: party.name,
            party_type: party.type,
            entries: entries,
          };
        })
      );
      
      return statements;
    } catch (error) {
      console.error('Error generating account statement:', error);
      toast.error('حدث خطأ أثناء إنشاء كشف الحساب');
      return [];
    }
  }
}

export default CommercialService;
