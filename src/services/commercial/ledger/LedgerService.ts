
import { LedgerEntry } from '@/services/CommercialTypes';
import { LedgerEntity } from './LedgerEntity';
import { LedgerReportGenerator } from './LedgerReportGenerator';
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
