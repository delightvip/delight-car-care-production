import PartyService from './PartyService';
import PaymentService from './payment/PaymentService';
import InvoiceService from './invoice/InvoiceService';
import ReturnService from './return/ReturnService';

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
}

export default CommercialService;

