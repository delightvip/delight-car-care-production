
import PartyService from './PartyService';
import PaymentService from './commercial/payment/PaymentService';
import InvoiceService from './commercial/invoice/InvoiceService';
import ReturnService from './commercial/return/ReturnService';
import { Invoice, InvoiceItem, Payment, Return, ReturnItem, LedgerEntry } from './CommercialTypes';

class CommercialService {
  private static instance: CommercialService;
  private returnService;
  private paymentService;
  private invoiceService;
  
  private constructor() {
    this.returnService = ReturnService.getInstance();
    this.paymentService = PaymentService.getInstance();
    this.invoiceService = InvoiceService.getInstance();
  }
  
  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }

  getParties() {
    return PartyService.getInstance().getParties();
  }

  getPayments() {
    return this.paymentService.getPayments();
  }

  getInvoices() {
    return this.invoiceService.getInvoices();
  }

  getReturns() {
    return this.returnService.getReturns();
  }
  
  getInvoiceById(id: string) {
    return this.invoiceService.getInvoiceById(id);
  }
  
  getReturnById(id: string) {
    return this.returnService.getReturnById(id);
  }

  // Add missing methods referenced in the components
  deleteInvoice(id: string) {
    return this.invoiceService.deleteInvoice(id);
  }

  confirmInvoice(id: string) {
    return this.invoiceService.confirmInvoice(id);
  }

  cancelInvoice(id: string) {
    return this.invoiceService.cancelInvoice(id);
  }

  getInvoicesByParty(partyId: string) {
    return this.invoiceService.getInvoicesByParty(partyId);
  }

  getPaymentsByParty(partyId: string) {
    return this.paymentService.getPaymentsByParty(partyId);
  }

  getLedgerEntries(partyId: string) {
    // Implement this method or delegate to an appropriate service
    // This is a placeholder since this method is called but not implemented
    return Promise.resolve([]) as Promise<LedgerEntry[]>;
  }

  recordPayment(paymentData: Omit<Payment, 'id' | 'created_at'>) {
    return this.paymentService.createPayment(paymentData);
  }

  updatePayment(id: string, paymentData: Omit<Payment, 'id' | 'created_at'>) {
    return this.paymentService.updatePayment(id, paymentData);
  }

  deletePayment(id: string) {
    return this.paymentService.deletePayment(id);
  }

  confirmPayment(id: string) {
    return this.paymentService.confirmPayment(id);
  }

  cancelPayment(id: string) {
    return this.paymentService.cancelPayment(id);
  }

  createReturn(returnData: Omit<Return, 'id' | 'created_at'>) {
    return this.returnService.createReturn(returnData);
  }

  confirmReturn(id: string) {
    return this.returnService.confirmReturn(id);
  }

  cancelReturn(id: string) {
    return this.returnService.cancelReturn(id);
  }

  generateAccountStatement(startDate: string, endDate: string, partyType: string) {
    // Implement this method or delegate to an appropriate service
    // This is a placeholder since this method is called but not implemented
    return Promise.resolve({ statements: [] });
  }
}

export { Invoice, InvoiceItem, Payment, Return, ReturnItem, LedgerEntry };
export default CommercialService;
