
import BaseCommercialService from './BaseCommercialService';
import { format } from 'date-fns';
import { toast } from "sonner";
import LedgerService from './LedgerService';

class LedgerReportService extends BaseCommercialService {
  private static instance: LedgerReportService;
  private ledgerService: LedgerService;
  
  private constructor() {
    super();
    this.ledgerService = LedgerService.getInstance();
  }
  
  public static getInstance(): LedgerReportService {
    if (!LedgerReportService.instance) {
      LedgerReportService.instance = new LedgerReportService();
    }
    return LedgerReportService.instance;
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
          const entries = await this.ledgerService.getLedgerEntries(party.id, startDate, endDate);
          
          let openingBalance = 0;
          
          // Get the balance before the start date
          const { data: previousEntries, error: previousError } = await this.supabase
            .from('ledger')
            .select('balance_after')
            .eq('party_id', party.id)
            .lt('date', startDate)
            .order('date', { ascending: false })
            .limit(1);
          
          if (!previousError && previousEntries.length > 0) {
            openingBalance = previousEntries[0].balance_after;
          } else {
            // If no previous entries, use the opening balance from party
            openingBalance = party.balance_type === 'debit' 
              ? party.opening_balance 
              : -party.opening_balance;
          }
          
          // Calculate totals
          let totalDebit = 0;
          let totalCredit = 0;
          
          entries.forEach(entry => {
            totalDebit += entry.debit || 0;
            totalCredit += entry.credit || 0;
          });
          
          const closingBalance = openingBalance + totalDebit - totalCredit;
          
          return {
            party_id: party.id,
            party_name: party.name,
            party_type: party.type,
            opening_balance: openingBalance,
            entries: entries,
            total_debit: totalDebit,
            total_credit: totalCredit,
            closing_balance: closingBalance
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
  
  public async generateSinglePartyStatement(partyId: string, startDate: string, endDate: string): Promise<any> {
    try {
      const party = await this.partyService.getPartyById(partyId);
      if (!party) {
        throw new Error('لم يتم العثور على الطرف التجاري');
      }
      
      const entries = await this.ledgerService.getLedgerEntries(partyId, startDate, endDate);
      
      let openingBalance = 0;
      
      // Get the balance before the start date
      const { data: previousEntries, error: previousError } = await this.supabase
        .from('ledger')
        .select('balance_after')
        .eq('party_id', partyId)
        .lt('date', startDate)
        .order('date', { ascending: false })
        .limit(1);
      
      if (!previousError && previousEntries.length > 0) {
        openingBalance = previousEntries[0].balance_after;
      } else {
        // If no previous entries, use the opening balance from party
        openingBalance = party.balance_type === 'debit' 
          ? party.opening_balance 
          : -party.opening_balance;
      }
      
      // Calculate totals
      let totalDebit = 0;
      let totalCredit = 0;
      
      entries.forEach(entry => {
        totalDebit += entry.debit || 0;
        totalCredit += entry.credit || 0;
      });
      
      const closingBalance = openingBalance + totalDebit - totalCredit;
      
      return {
        party_id: party.id,
        party_name: party.name,
        party_type: party.type,
        opening_balance: openingBalance,
        entries: entries,
        total_debit: totalDebit,
        total_credit: totalCredit,
        closing_balance: closingBalance
      };
    } catch (error) {
      console.error('Error generating single party statement:', error);
      toast.error('حدث خطأ أثناء إنشاء كشف الحساب');
      return null;
    }
  }
  
  public async exportLedgerToCSV(partyId: string, startDate?: string, endDate?: string): Promise<string> {
    try {
      const ledgerEntries = await this.ledgerService.getLedgerEntries(partyId, startDate, endDate);
      const party = await this.partyService.getPartyById(partyId);
      
      if (!ledgerEntries.length) {
        return '';
      }
      
      // Create CSV headers
      let csvContent = 'التاريخ,نوع المعاملة,البيان,المرجع,مدين,دائن,الرصيد\n';
      
      // Add CSV rows
      ledgerEntries.forEach(entry => {
        const date = format(new Date(entry.date), 'yyyy-MM-dd');
        const transactionType = this.getTransactionDescription(entry.transaction_type);
        const reference = entry.transaction_id || '';
        const debit = entry.debit || 0;
        const credit = entry.credit || 0;
        const balance = entry.balance_after;
        
        csvContent += `${date},"${transactionType}","${entry.notes}","${reference}",${debit},${credit},${balance}\n`;
      });
      
      return csvContent;
    } catch (error) {
      console.error('Error exporting ledger to CSV:', error);
      toast.error('حدث خطأ أثناء تصدير سجل الحساب');
      return '';
    }
  }
}

export default LedgerReportService;
