
import InvoiceService from './commercial/invoice/InvoiceService';
import PaymentService from './commercial/payment/PaymentService';
import ReturnService from './commercial/return/ReturnService';
import LedgerService from './commercial/LedgerService';
import { Invoice, InvoiceItem, Payment, Return, ReturnItem, LedgerEntry } from './CommercialTypes';

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
  
  public async getInvoiceById(id: string): Promise<Invoice | null> {
    return this.invoiceService.getInvoiceById(id);
  }
  
  public async createInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    return this.invoiceService.createInvoice(invoice);
  }
  
  public async confirmInvoice(id: string): Promise<boolean> {
    return this.invoiceService.confirmInvoice(id);
  }
  
  public async cancelInvoice(id: string): Promise<boolean> {
    return this.invoiceService.cancelInvoice(id);
  }
  
  // Payment methods
  public async getPayments(): Promise<Payment[]> {
    return this.paymentService.getPayments();
  }
  
  public async getPaymentById(id: string): Promise<Payment | null> {
    return this.paymentService.getPaymentById(id);
  }
  
  public async createPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment | null> {
    return this.paymentService.createPayment(payment);
  }
  
  public async confirmPayment(id: string): Promise<boolean> {
    return this.paymentService.confirmPayment(id);
  }
  
  public async cancelPayment(id: string): Promise<boolean> {
    return this.paymentService.cancelPayment(id);
  }
  
  // Return methods
  public async getReturns(): Promise<Return[]> {
    try {
      return await this.returnService.getReturns();
    } catch (error) {
      console.error('Error in getReturns:', error);
      return [];
    }
  }
  
  public async getReturnById(id: string): Promise<Return | null> {
    return this.returnService.getReturnById(id);
  }
  
  public async createReturn(returnData: Omit<Return, 'id' | 'created_at'>): Promise<Return | null> {
    return this.returnService.createReturn(returnData);
  }
  
  public async confirmReturn(id: string): Promise<boolean> {
    return this.returnService.confirmReturn(id);
  }
  
  public async cancelReturn(id: string): Promise<boolean> {
    return this.returnService.cancelReturn(id);
  }
  
  // Ledger methods
  public async getLedgerEntries(partyId?: string): Promise<LedgerEntry[]> {
    return this.ledgerService.getLedgerEntries(partyId);
  }
}

export default CommercialService;
export type { 
  Invoice, 
  InvoiceItem, 
  Payment, 
  Return, 
  ReturnItem, 
  LedgerEntry 
};
