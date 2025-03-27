import { supabase } from '@/integrations/supabase/client';
import { Return, ReturnItem, Invoice, InvoiceItem, Payment, LedgerEntry } from './CommercialTypes';
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
  
  // Invoice related methods
  public async getInvoices(): Promise<Invoice[]> {
    // Temporary implementation until proper InvoiceService is integrated
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          parties:party_id (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }
  
  public async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    // Temporary stub until proper InvoiceService is integrated
    console.warn('createInvoice not fully implemented');
    return null;
  }
  
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    // Temporary stub until proper InvoiceService is integrated
    console.warn('confirmInvoice not fully implemented');
    return false;
  }
  
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    // Temporary stub until proper InvoiceService is integrated
    console.warn('cancelInvoice not fully implemented');
    return false;
  }
  
  // Add stub methods for other functions that were referenced in errors
  public async getInvoiceById(id: string): Promise<Invoice | null> {
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
  
  // Payment related methods
  public async getPayments(): Promise<Payment[]> {
    // Temporary stub until proper PaymentService is integrated
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          parties:party_id (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  }
  
  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    console.warn('recordPayment not fully implemented');
    return null;
  }
  
  public async confirmPayment(paymentId: string): Promise<boolean> {
    console.warn('confirmPayment not fully implemented');
    return false;
  }
  
  public async cancelPayment(paymentId: string): Promise<boolean> {
    console.warn('cancelPayment not fully implemented');
    return false;
  }
  
  public async updatePayment(id: string, paymentData: any): Promise<boolean> {
    console.warn('updatePayment not fully implemented');
    return false;
  }
  
  public async deletePayment(id: string): Promise<boolean> {
    console.warn('deletePayment not fully implemented');
    return false;
  }
  
  // Ledger related methods
  public async getLedgerEntries(partyId: string): Promise<LedgerEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching ledger entries for party ${partyId}:`, error);
      return [];
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
  
  public async generateAccountStatement(partyId: string, startDate: string, endDate: string): Promise<any> {
    console.warn('generateAccountStatement not fully implemented');
    return null;
  }
}

export default CommercialService;
export type { Return, ReturnItem, Invoice, InvoiceItem, Payment, LedgerEntry };
