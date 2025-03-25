import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Invoice, 
  InvoiceItem, 
  Payment, 
  Return, 
  ReturnItem, 
  LedgerEntry 
} from "./CommercialTypes";
import InvoiceService from './commercial/InvoiceService';
import PaymentService from './commercial/PaymentService';
import ReturnService from './commercial/ReturnService';
import LedgerService from './commercial/LedgerService';
import { format } from "date-fns";

class CommercialService {
  private static instance: CommercialService;
  private invoiceService: InvoiceService;
  private paymentService: PaymentService;
  private returnService: ReturnService;
  private ledgerService: LedgerService;
  
  private constructor() {
    this.invoiceService = InvoiceService.getInstance();
    this.paymentService = PaymentService.getInstance();
    this.returnService = ReturnService.getInstance();
    this.ledgerService = LedgerService.getInstance();
  }
  
  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }
  
  // Invoice methods
  public async getInvoices(): Promise<Invoice[]> {
    return this.invoiceService.getInvoices();
  }
  
  public async getInvoicesByParty(partyId: string): Promise<Invoice[]> {
    return this.invoiceService.getInvoicesByParty(partyId);
  }
  
  public async getInvoiceById(id: string): Promise<Invoice | null> {
    return this.invoiceService.getInvoiceById(id);
  }
  
  public async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    return this.invoiceService.createInvoice(invoiceData);
  }
  
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    return this.invoiceService.confirmInvoice(invoiceId);
  }
  
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    return this.invoiceService.cancelInvoice(invoiceId);
  }
  
  public async deleteInvoice(id: string): Promise<boolean> {
    return this.invoiceService.deleteInvoice(id);
  }
  
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    return this.invoiceService.updateInvoiceStatusAfterPayment(invoiceId, paymentAmount);
  }
  
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    return this.invoiceService.reverseInvoiceStatusAfterPaymentCancellation(invoiceId, paymentAmount);
  }
  
  // Payment methods
  public async getPayments(): Promise<Payment[]> {
    return this.paymentService.getPayments();
  }
  
  public async getPaymentsByParty(partyId: string): Promise<Payment[]> {
    return this.paymentService.getPaymentsByParty(partyId);
  }
  
  public async recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    return this.paymentService.recordPayment(paymentData);
  }
  
  public async confirmPayment(paymentId: string): Promise<boolean> {
    return this.paymentService.confirmPayment(paymentId);
  }
  
  public async cancelPayment(paymentId: string): Promise<boolean> {
    return this.paymentService.cancelPayment(paymentId);
  }
  
  public async updatePayment(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<boolean> {
    return this.paymentService.updatePayment(id, paymentData);
  }
  
  public async deletePayment(id: string): Promise<boolean> {
    return this.paymentService.deletePayment(id);
  }
  
  // Return methods
  public async getReturns(): Promise<Return[]> {
    return this.returnService.getReturns();
  }
  
  public async getReturnById(id: string): Promise<Return | null> {
    return this.returnService.getReturnById(id);
  }
  
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    return this.returnService.createReturn(returnData);
  }
  
  public async updateReturn(id: string, returnData: Partial<Return>): Promise<boolean> {
    return this.returnService.updateReturn(id, returnData);
  }
  
  public async confirmReturn(returnId: string): Promise<boolean> {
    return this.returnService.confirmReturn(returnId);
  }
  
  public async cancelReturn(returnId: string): Promise<boolean> {
    return this.returnService.cancelReturn(returnId);
  }
  
  public async deleteReturn(id: string): Promise<boolean> {
    return this.returnService.deleteReturn(id);
  }
  
  // Ledger methods
  public async getLedgerEntries(partyId: string, startDate?: string, endDate?: string): Promise<LedgerEntry[]> {
    return this.ledgerService.getLedgerEntries(partyId, startDate, endDate);
  }
  
  public async generateAccountStatement(startDate: string, endDate: string, partyType?: string): Promise<any> {
  return this.ledgerService.generateAccountStatement(startDate, endDate, partyType);
}
}

// Re-export the CommercialTypes so they can be imported from this module as well
export type { 
  Invoice, 
  InvoiceItem, 
  Payment, 
  Return, 
  ReturnItem, 
  LedgerEntry 
};

export default CommercialService;
