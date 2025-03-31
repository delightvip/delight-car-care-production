
import { LedgerEntry } from '@/services/commercial/CommercialTypes';
import { LedgerEntity } from '../ledger/LedgerEntity';
import { LedgerReportGenerator } from '../ledger/LedgerReportGenerator';
import { toast } from "sonner";

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
}

export default LedgerService;
