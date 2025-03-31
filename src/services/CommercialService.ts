
import InvoiceService from './commercial/InvoiceService';
import PaymentService from './commercial/PaymentService';
import ReturnService from './commercial/ReturnService';
import LedgerService from './commercial/ledger/LedgerService';

// Re-export types properly with export type
export type { 
  Invoice, 
  InvoiceItem, 
  Payment, 
  Return, 
  ReturnItem, 
  LedgerEntry 
} from './commercial/CommercialTypes';

/**
 * Commercial service that provides a facade to all commercial-related services
 */
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
  public async getInvoices() {
    return this.invoiceService.getInvoices();
  }
  
  public async getInvoicesByParty(partyId: string) {
    return this.invoiceService.getInvoicesByParty(partyId);
  }
  
  public async getInvoiceById(id: string) {
    return this.invoiceService.getInvoiceById(id);
  }
  
  public async createInvoice(invoiceData: any) {
    return this.invoiceService.createInvoice(invoiceData);
  }
  
  public async confirmInvoice(invoiceId: string) {
    return this.invoiceService.confirmInvoice(invoiceId);
  }
  
  public async cancelInvoice(invoiceId: string) {
    return this.invoiceService.cancelInvoice(invoiceId);
  }
  
  public async deleteInvoice(id: string) {
    return this.invoiceService.deleteInvoice(id);
  }
  
  // Payment methods
  public async getPayments() {
    return this.paymentService.getPayments();
  }
  
  public async getPaymentsByParty(partyId: string) {
    return this.paymentService.getPaymentsByParty(partyId);
  }
  
  public async getPaymentById(id: string) {
    return this.paymentService.getPaymentById(id);
  }
  
  public async createPayment(paymentData: any) {
    return this.paymentService.createPayment(paymentData);
  }
  
  public async confirmPayment(paymentId: string) {
    return this.paymentService.confirmPayment(paymentId);
  }
  
  public async cancelPayment(paymentId: string) {
    return this.paymentService.cancelPayment(paymentId);
  }
  
  public async deletePayment(id: string) {
    return this.paymentService.deletePayment(id);
  }
  
  // Return methods
  public async getReturns() {
    return this.returnService.getReturns();
  }
  
  public async getReturnsByParty(partyId: string) {
    return this.returnService.getReturnsByParty(partyId);
  }
  
  public async getReturnById(id: string) {
    return this.returnService.getReturnById(id);
  }
  
  public async createReturn(returnData: any) {
    return this.returnService.createReturn(returnData);
  }
  
  public async confirmReturn(returnId: string) {
    return this.returnService.confirmReturn(returnId);
  }
  
  public async cancelReturn(returnId: string) {
    return this.returnService.cancelReturn(returnId);
  }
  
  public async deleteReturn(id: string) {
    return this.returnService.deleteReturn(id);
  }
  
  // Ledger methods
  public async getLedgerEntries(partyId: string, startDate?: string, endDate?: string) {
    return this.ledgerService.getLedgerEntries(partyId, startDate, endDate);
  }
  
  public async generateAccountStatement(startDate: string, endDate: string, partyType?: string) {
    return this.ledgerService.generateAccountStatement(startDate, endDate, partyType);
  }
  
  public async generateSinglePartyStatement(partyId: string, startDate: string, endDate: string) {
    return this.ledgerService.generateSinglePartyStatement(partyId, startDate, endDate);
  }
  
  public async exportLedgerToCSV(partyId: string, startDate?: string, endDate?: string) {
    return this.ledgerService.exportLedgerToCSV(partyId, startDate, endDate);
  }
}

export default CommercialService;
