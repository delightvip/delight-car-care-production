
import { PartyDataAccess } from './PartyDataAccess';
import { PartyBalanceService } from './PartyBalanceService';
import { PartyTransactionService } from './PartyTransactionService';
import { Party, Transaction } from './PartyTypes';

/**
 * خدمة إدارة الأطراف التجارية الرئيسية
 */
class PartyService {
  private static instance: PartyService;
  private dataAccess: PartyDataAccess;
  private balanceService: PartyBalanceService;
  private transactionService: PartyTransactionService;

  private constructor() {
    this.dataAccess = new PartyDataAccess();
    this.balanceService = PartyBalanceService.getInstance();
    this.transactionService = PartyTransactionService.getInstance();
  }
  
  public static getInstance(): PartyService {
    if (!PartyService.instance) {
      PartyService.instance = new PartyService();
    }
    return PartyService.instance;
  }
  
  // === وظائف إدارة الأطراف التجارية ===
  
  /**
   * الحصول على جميع الأطراف التجارية
   */
  public async getParties(): Promise<Party[]> {
    return this.dataAccess.getParties();
  }
  
  /**
   * الحصول على طرف تجاري محدد
   */
  public async getPartyById(id: string): Promise<Party | null> {
    return this.dataAccess.getPartyById(id);
  }
  
  /**
   * الحصول على الأطراف حسب النوع
   */
  public async getPartiesByType(type: 'customer' | 'supplier' | 'other'): Promise<Party[]> {
    return this.dataAccess.getPartiesByType(type);
  }
  
  /**
   * إضافة طرف تجاري جديد
   */
  public async addParty(party: Omit<Party, 'id' | 'balance' | 'created_at'>): Promise<Party | null> {
    return this.dataAccess.addParty(party);
  }
  
  /**
   * تحديث بيانات طرف تجاري
   */
  public async updateParty(id: string, partyData: Partial<Omit<Party, 'id' | 'created_at' | 'balance'>>): Promise<boolean> {
    return this.dataAccess.updateParty(id, partyData);
  }
  
  /**
   * حذف طرف تجاري
   */
  public async deleteParty(id: string): Promise<boolean> {
    return this.dataAccess.deleteParty(id);
  }
  
  // === وظائف إدارة الأرصدة والمعاملات ===
  
  /**
   * تحديث رصيد طرف تجاري
   */
  public async updatePartyBalance(
    partyId: string, 
    amount: number, 
    isDebit: boolean,
    description: string,
    transactionType: string,
    reference?: string
  ): Promise<boolean> {
    return this.balanceService.updatePartyBalance(partyId, amount, isDebit, description, transactionType, reference);
  }
  
  /**
   * تحديث الرصيد الافتتاحي
   */
  public async updateOpeningBalance(
    partyId: string, 
    newOpeningBalance: number, 
    balanceType: 'credit' | 'debit'
  ): Promise<boolean> {
    return this.balanceService.updateOpeningBalance(partyId, newOpeningBalance, balanceType);
  }
  
  /**
   * الحصول على معاملات طرف تجاري
   */
  public async getPartyTransactions(partyId: string): Promise<Transaction[]> {
    return this.transactionService.getPartyTransactions(partyId);
  }
  
  /**
   * الحصول على قيود سجل الحساب
   */
  public async getLedgerEntries(partyId: string): Promise<any[]> {
    return this.transactionService.getLedgerEntries(partyId);
  }
  
  /**
   * الحصول على وصف نوع المعاملة
   */
  public getTransactionDescription(transactionType: string): string {
    return this.transactionService.getTransactionDescription(transactionType);
  }
}

export type { Party, Transaction };
export default PartyService;
