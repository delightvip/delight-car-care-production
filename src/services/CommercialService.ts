import { supabase } from '@/integrations/supabase/client';
import { Return, ReturnItem } from './CommercialTypes';
import { ReturnService } from './commercial/return/ReturnService';
import PartyService from './PartyService';

// Main commercial service that acts as a facade for all commercial operations
class CommercialService {
  private static instance: CommercialService | null = null;
  private returnService: ReturnService;
  private partyService: PartyService;
  
  private constructor() {
    this.returnService = ReturnService.getInstance();
    this.partyService = PartyService.getInstance();
  }
  
  // Singleton pattern
  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }
  
  // Returns methods
  public async getReturns(): Promise<Return[]> {
    try {
      console.log('CommercialService: Fetching returns');
      // Explicitly check for undefined/null and return an empty array
      const returns = await this.returnService.getReturns();
      return returns || [];
    } catch (error) {
      console.error('CommercialService: Error fetching returns:', error);
      return [];
    }
  }
  
  public async getReturnById(id: string): Promise<Return | null> {
    return this.returnService.getReturnById(id);
  }
  
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    return this.returnService.createReturn(returnData);
  }
  
  public async confirmReturn(returnId: string): Promise<boolean> {
    return this.returnService.confirmReturn(returnId);
  }
  
  public async cancelReturn(returnId: string): Promise<boolean> {
    return this.returnService.cancelReturn(returnId);
  }
  
  // Add stub methods for other functions that were referenced in errors
  public async getInvoiceById(id: string): Promise<any | null> {
    // Temporary stub to fix build errors
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching invoice with id ${id}:`, error);
      return null;
    }
  }
  
  // Other stub methods to fix build errors
  public async deleteInvoice(id: string): Promise<boolean> {
    console.warn('deleteInvoice not fully implemented');
    return false;
  }
  
  public async getInvoicesByParty(partyId: string): Promise<any[]> {
    console.warn('getInvoicesByParty not fully implemented');
    return [];
  }
  
  public async getPaymentsByParty(partyId: string): Promise<any[]> {
    console.warn('getPaymentsByParty not fully implemented');
    return [];
  }
  
  public async recordPayment(paymentData: any): Promise<any> {
    console.warn('recordPayment not fully implemented');
    return null;
  }
  
  public async updatePayment(id: string, paymentData: any): Promise<boolean> {
    console.warn('updatePayment not fully implemented');
    return false;
  }
  
  public async deletePayment(id: string): Promise<boolean> {
    console.warn('deletePayment not fully implemented');
    return false;
  }
  
  public async generateAccountStatement(partyId: string, startDate: string, endDate: string): Promise<any> {
    console.warn('generateAccountStatement not fully implemented');
    return null;
  }
}

export default CommercialService;
export type { Return, ReturnItem };
