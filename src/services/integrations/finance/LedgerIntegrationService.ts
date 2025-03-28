
import LedgerService from '@/services/commercial/ledger/LedgerService';
import { toast } from 'sonner';
import { LedgerEntryData } from './FinanceIntegrationTypes';

/**
 * خدمة مسؤولة عن التكامل مع سجل الحسابات
 */
export class LedgerIntegrationService {
  private static instance: LedgerIntegrationService;
  private ledgerService: LedgerService;
  
  private constructor() {
    this.ledgerService = LedgerService.getInstance();
  }
  
  public static getInstance(): LedgerIntegrationService {
    if (!LedgerIntegrationService.instance) {
      LedgerIntegrationService.instance = new LedgerIntegrationService();
    }
    return LedgerIntegrationService.instance;
  }
  
  /**
   * تسجيل قيد في سجل الحساب
   * @param ledgerEntry بيانات القيد
   */
  public async recordLedgerEntry(ledgerEntry: LedgerEntryData): Promise<boolean> {
    try {
      // Make sure notes is always defined
      const entryData = {
        ...ledgerEntry,
        notes: ledgerEntry.notes || '', // Ensure notes is never undefined
      };
      
      return await this.ledgerService.addLedgerEntry(entryData);
    } catch (error) {
      console.error('Error recording ledger entry:', error);
      toast.error('حدث خطأ أثناء تسجيل معاملة في دفتر الحسابات');
      return false;
    }
  }
}
