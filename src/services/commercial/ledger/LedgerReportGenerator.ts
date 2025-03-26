import { PartyService } from '@/services/PartyService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { LedgerEntry } from '@/services/CommercialTypes';

class LedgerReportGenerator {
  private static instance: LedgerReportGenerator;
  private partyService: PartyService;
  
  private constructor() {
    this.partyService = PartyService.getInstance();
  }
  
  public static getInstance(): LedgerReportGenerator {
    if (!LedgerReportGenerator.instance) {
      LedgerReportGenerator.instance = new LedgerReportGenerator();
    }
    return LedgerReportGenerator.instance;
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
          const entries = await LedgerEntity.fetchLedgerEntries(party.id, startDate, endDate);
          const openingBalance = await LedgerEntity.fetchPreviousBalance(party.id, startDate);
          
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
      
      const entries = await LedgerEntity.fetchLedgerEntries(partyId, startDate, endDate);
      const openingBalance = await LedgerEntity.fetchPreviousBalance(partyId, startDate);
      
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
      const ledgerEntries = await LedgerEntity.fetchLedgerEntries(partyId, startDate, endDate);
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
  
  private getTransactionDescription(transaction_type: string): string {
    const descriptions: { [key: string]: string } = {
      'sale_invoice': 'فاتورة مبيعات',
      'purchase_invoice': 'فاتورة مشتريات',
      'payment_received': 'دفعة مستلمة',
      'payment_made': 'دفعة مدفوعة',
      'sales_return': 'مرتجع مبيعات',
      'purchase_return': 'مرتجع مشتريات',
      'opening_balance': 'رصيد افتتاحي',
      'cancel_sale_invoice': 'إلغاء فاتورة مبيعات',
      'cancel_purchase_invoice': 'إلغاء فاتورة مشتريات',
      'cancel_payment_received': 'إلغاء دفعة مستلمة',
      'cancel_payment_made': 'إلغاء دفعة مدفوعة',
      'cancel_sales_return': 'إلغاء مرتجع مبيعات',
      'cancel_purchase_return': 'إلغاء مرتجع مشتريات',
      'invoice_amount_adjustment': 'تعديل قيمة فاتورة',
      'opening_balance_update': 'تعديل الرصيد الافتتاحي'
    };
    
    return descriptions[transaction_type] || transaction_type;
  }
}

export default LedgerReportGenerator;
