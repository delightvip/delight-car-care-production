
import { LedgerEntry } from "@/services/commercial/CommercialTypes";
import { LedgerEntity } from "./LedgerEntity";
import { LedgerReportGenerator } from "./LedgerReportGenerator";

class LedgerService {
  private static instance: LedgerService;
  private ledgerEntity: LedgerEntity;
  private reportGenerator: LedgerReportGenerator;

  private constructor() {
    this.ledgerEntity = new LedgerEntity();
    this.reportGenerator = new LedgerReportGenerator();
  }

  public static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }

  /**
   * Get ledger entries for a specific party
   */
  public async getLedgerEntries(partyId: string): Promise<LedgerEntry[]> {
    return this.ledgerEntity.getLedgerEntriesByParty(partyId);
  }

  /**
   * Generate an account statement for a party
   */
  public async generateAccountStatement(
    partyId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    return this.reportGenerator.generateStatement(partyId, startDate, endDate);
  }
}

export default LedgerService;
