
import { supabase } from "@/integrations/supabase/client";
import PartyService from '@/services/PartyService';
import { LedgerEntry } from '@/services/commercial/CommercialTypes';
import { LedgerEntity } from './LedgerEntity';
import { toast } from "sonner";
import { format } from 'date-fns';

export class LedgerReportGenerator {
  private static partyService = PartyService.getInstance();
  
  /**
   * Generate an account statement for all parties or parties of a specific type
   */
  public static async generateAccountStatement(startDate: string, endDate: string, partyType?: string): Promise<any> {
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
      
      // For each party, calculate ledger entries and balances
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
  
  /**
   * Generate a statement for a single party
   */
  public static async generateSinglePartyStatement(partyId: string, startDate: string, endDate: string): Promise<any> {
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
  
  /**
   * Export ledger entries to CSV
   */
  public static async exportLedgerToCSV(partyId: string, startDate?: string, endDate?: string): Promise<string> {
    try {
      const ledgerEntries = await LedgerEntity.fetchLedgerEntries(partyId, startDate, endDate);
      
      const { data: party, error: partyError } = await supabase
        .from('parties')
        .select('name')
        .eq('id', partyId)
        .single();
      
      if (partyError) {
        console.error('Error fetching party:', partyError);
      }
      
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
  
  /**
   * Get transaction description based on transaction type
   */
  public static getTransactionDescription(transactionType: string): string {
    switch (transactionType) {
      case 'sale_invoice':
        return 'فاتورة مبيعات';
      case 'purchase_invoice':
        return 'فاتورة مشتريات';
      case 'payment_collection':
        return 'تحصيل دفعة';
      case 'payment_disbursement':
        return 'صرف دفعة';
      case 'sales_return':
        return 'مرتجع مبيعات';
      case 'purchase_return':
        return 'مرتجع مشتريات';
      case 'cancel_sale_invoice':
        return 'إلغاء فاتورة مبيعات';
      case 'cancel_purchase_invoice':
        return 'إلغاء فاتورة مشتريات';
      case 'cancel_payment_collection':
        return 'إلغاء تحصيل دفعة';
      case 'cancel_payment_disbursement':
        return 'إلغاء صرف دفعة';
      default:
        return transactionType;
    }
  }
}
