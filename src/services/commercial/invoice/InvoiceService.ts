import { Invoice } from '@/services/CommercialTypes';
import { InvoiceEntity } from './InvoiceEntity';
import { InvoiceProcessor } from './InvoiceProcessor';
import { toast } from "sonner";
import ProfitService from '../profit/ProfitService';

// خدمة الفواتير الرئيسية
export class InvoiceService {
  private static instance: InvoiceService;
  private invoiceProcessor: InvoiceProcessor;
  private profitService: ProfitService;
  
  private constructor() {
    this.invoiceProcessor = new InvoiceProcessor();
    this.profitService = ProfitService.getInstance();
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
    try {
      const result = await this.invoiceProcessor.confirmInvoice(invoiceId);
      
      // If this is a sales invoice and was confirmed, calculate profits
      if (result) {
        const invoice = await this.getInvoiceById(invoiceId);
        if (invoice && invoice.invoice_type === 'sale') {
          await this.profitService.calculateInvoiceProfit(invoiceId);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error confirming invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد الفاتورة');
      return false;
    }
  }
  
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      // Get invoice details before cancellation
      const invoice = await this.getInvoiceById(invoiceId);
      
      const result = await this.invoiceProcessor.cancelInvoice(invoiceId);
      
      // If this was a sales invoice, remove profit data
      if (result && invoice && invoice.invoice_type === 'sale') {
        await this.profitService.removeProfitData(invoiceId);
      }
      
      return result;
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast.error('حدث خطأ أثناء إلغاء الفاتورة');
      return false;
    }
  }
  
  public async deleteInvoice(id: string): Promise<boolean> {
    try {
      // Get invoice details before deletion
      const invoice = await this.getInvoiceById(id);
      
      const result = await InvoiceEntity.delete(id);
      
      // If this was a sales invoice, remove profit data
      if (result && invoice && invoice.invoice_type === 'sale') {
        await this.profitService.removeProfitData(id);
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('حدث خطأ أثناء حذف الفاتورة');
      return false;
    }
  }
  
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    return this.invoiceProcessor.updateInvoiceStatusAfterPayment(invoiceId, paymentAmount);
  }
  
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    return this.invoiceProcessor.reverseInvoiceStatusAfterPaymentCancellation(invoiceId, paymentAmount);
  }
}

export default InvoiceService;
