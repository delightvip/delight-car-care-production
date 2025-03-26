
import { Invoice } from '@/services/CommercialTypes';
import { InvoiceEntity } from './InvoiceEntity';
import { InvoiceProcessor } from './InvoiceProcessor';
import { toast } from "sonner";

// خدمة الفواتير الرئيسية
export class InvoiceService {
  private static instance: InvoiceService;
  private invoiceProcessor: InvoiceProcessor;
  
  private constructor() {
    this.invoiceProcessor = new InvoiceProcessor();
  }
  
  public static getInstance(): InvoiceService {
    if (!InvoiceService.instance) {
      InvoiceService.instance = new InvoiceService();
    }
    return InvoiceService.instance;
  }
  
  public async getInvoices(): Promise<Invoice[]> {
    return InvoiceEntity.fetchAll();
  }
  
  public async getInvoicesByParty(partyId: string): Promise<Invoice[]> {
    return InvoiceEntity.fetchByParty(partyId);
  }
  
  public async getInvoiceById(id: string): Promise<Invoice | null> {
    return InvoiceEntity.fetchById(id);
  }
  
  public async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice | null> {
    try {
      const invoice = await InvoiceEntity.create(invoiceData);
      
      // If invoice status is not "draft", automatically confirm it
      if (invoice && invoiceData.payment_status === 'confirmed') {
        await this.confirmInvoice(invoice.id);
        
        // Refresh the invoice data after confirmation
        return this.getInvoiceById(invoice.id);
      }
      
      toast.success('تم إنشاء الفاتورة بنجاح');
      return invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
      return null;
    }
  }
  
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    return this.invoiceProcessor.confirmInvoice(invoiceId);
  }
  
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    return this.invoiceProcessor.cancelInvoice(invoiceId);
  }
  
  public async deleteInvoice(id: string): Promise<boolean> {
    return InvoiceEntity.delete(id);
  }
  
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    return this.invoiceProcessor.updateInvoiceStatusAfterPayment(invoiceId, paymentAmount);
  }
  
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    return this.invoiceProcessor.reverseInvoiceStatusAfterPaymentCancellation(invoiceId, paymentAmount);
  }
}

export default InvoiceService;
