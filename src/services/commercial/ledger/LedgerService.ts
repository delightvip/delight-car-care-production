
import { LedgerEntry } from '@/services/CommercialTypes';
import { LedgerEntity } from './LedgerEntity';
import { LedgerReportGenerator } from './LedgerReportGenerator';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// خدمة سجل الحساب الرئيسية
export class LedgerService {
  private static instance: LedgerService;
  
  private constructor() {}
  
  public static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }
  
  public async getLedgerEntries(partyId: string, startDate?: string, endDate?: string): Promise<LedgerEntry[]> {
    return LedgerEntity.fetchLedgerEntries(partyId, startDate, endDate);
  }
  
  public async generateAccountStatement(startDate: string, endDate: string, partyType?: string): Promise<any> {
    return LedgerReportGenerator.generateAccountStatement(startDate, endDate, partyType);
  }
  
  public async generateSinglePartyStatement(partyId: string, startDate: string, endDate: string): Promise<any> {
    return LedgerReportGenerator.generateSinglePartyStatement(partyId, startDate, endDate);
  }
  
  public async exportLedgerToCSV(partyId: string, startDate?: string, endDate?: string): Promise<string> {
    return LedgerReportGenerator.exportLedgerToCSV(partyId, startDate, endDate);
  }
  
  /**
   * إضافة قيد جديد في سجل الحساب
   * @param entryData بيانات القيد
   */
  public async addLedgerEntry(entryData: {
    party_id: string;
    transaction_id: string;
    transaction_type: string;
    date: string;
    debit: number;
    credit: number;
    notes?: string;
  }): Promise<boolean> {
    try {
      // الحصول على آخر رصيد للطرف
      const { data: lastEntries, error: lastEntryError } = await supabase
        .from('ledger')
        .select('balance_after')
        .eq('party_id', entryData.party_id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (lastEntryError) throw lastEntryError;
      
      // حساب الرصيد الجديد
      let balanceAfter = 0;
      if (lastEntries && lastEntries.length > 0) {
        balanceAfter = lastEntries[0].balance_after;
      }
      
      // تعديل الرصيد بناءً على المدين والدائن
      balanceAfter = balanceAfter + entryData.debit - entryData.credit;
      
      // إضافة القيد الجديد
      const { error } = await supabase
        .from('ledger')
        .insert({
          party_id: entryData.party_id,
          transaction_id: entryData.transaction_id,
          transaction_type: entryData.transaction_type,
          date: entryData.date,
          debit: entryData.debit,
          credit: entryData.credit,
          balance_after: balanceAfter,
          notes: entryData.notes
        });
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error adding ledger entry:', error);
      toast.error('حدث خطأ أثناء إضافة قيد في سجل الحساب');
      return false;
    }
  }
}

export default LedgerService;
