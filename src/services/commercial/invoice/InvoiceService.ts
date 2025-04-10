
import { Invoice } from '@/services/CommercialTypes';
import { InvoiceEntity } from './InvoiceEntity';
import { InvoiceProcessor } from './InvoiceProcessor';
import { toast } from "sonner";
import ProfitService from '../profit/ProfitService';
import ProfitCalculationService from '../profit/ProfitCalculationService';

// خدمة الفواتير الرئيسية
export class InvoiceService {
  private static instance: InvoiceService;
  private invoiceProcessor: InvoiceProcessor;
  private profitService: ProfitService;
  private profitCalculationService: ProfitCalculationService;
  
  private constructor() {
    this.invoiceProcessor = new InvoiceProcessor();
    this.profitService = ProfitService.getInstance();
    this.profitCalculationService = ProfitCalculationService.getInstance();
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
      console.log('Creating invoice with data:', invoiceData);
      const invoice = await InvoiceEntity.create(invoiceData);
      
      // If invoice status is not "draft", automatically confirm it
      if (invoice && invoiceData.payment_status === 'confirmed') {
        console.log('Invoice created with confirmed status, confirming invoice:', invoice.id);
        await this.confirmInvoice(invoice.id);
        
        // Refresh the invoice data after confirmation
        return this.getInvoiceById(invoice.id);
      }
      
      console.log('Invoice created successfully:', invoice?.id);
      return invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      return null;
    }
  }
  
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      console.log('Starting invoice confirmation process:', invoiceId);
      const result = await this.invoiceProcessor.confirmInvoice(invoiceId);
      
      // If this is a sales invoice and was confirmed, calculate profits
      if (result) {
        console.log('Invoice confirmed successfully, checking for profit calculation:', invoiceId);
        const invoice = await this.getInvoiceById(invoiceId);
        if (invoice && invoice.invoice_type === 'sale') {
          console.log('Calculating profit for sales invoice:', invoiceId);
          const profitData = await this.profitCalculationService.calculateAndSaveProfit(invoiceId);
          console.log('Profit calculated:', profitData);
          
          // بعد حساب الربح، قم بتنشيط البيانات المالية لتحديث لوحة التحكم
          this.invalidateFinancialData();
        }
      } else {
        console.error('Invoice confirmation failed:', invoiceId);
      }
      
      return result;
    } catch (error) {
      console.error('Error confirming invoice:', error);
      return false;
    }
  }

  /**
   * تنشيط بيانات النظام المالي بعد التغييرات في الأرباح
   */
  private invalidateFinancialData(): void {
    try {
      // تنشيط بيانات React Query إذا كانت متاحة
      // هذه محاولة للوصول إلى queryClient خارج مكون React
      // تنبيه: استخدم طريقة أخرى لتنشيط البيانات لأن هذا النهج قد لا يعمل
      console.log("Dispatching financial-data-change event");
      const event = new CustomEvent('financial-data-change', { 
        detail: { source: 'invoice_confirmation' }
      });
      window.dispatchEvent(event);

      console.log("تم إرسال إشعار بتغيير البيانات المالية");
    } catch (error) {
      console.error("خطأ في تنشيط بيانات النظام المالي:", error);
    }
  }
  
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      console.log('Starting invoice cancellation process:', invoiceId);
      // Get invoice details before cancellation
      const invoice = await this.getInvoiceById(invoiceId);
      
      if (!invoice) {
        console.error('Invoice not found for cancellation:', invoiceId);
        return false;
      }
      
      const result = await this.invoiceProcessor.cancelInvoice(invoiceId);
      
      // If this was a sales invoice, remove profit data
      if (result && invoice && invoice.invoice_type === 'sale') {
        console.log('Invoice cancelled successfully, removing profit data:', invoiceId);
        await this.profitCalculationService.deleteProfitByInvoiceId(invoiceId);
        console.log('Profit data removed after invoice cancellation');
      } else if (!result) {
        console.error('Invoice cancellation failed:', invoiceId);
      }
      
      return result;
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      return false;
    }
  }
  
  public async deleteInvoice(id: string): Promise<boolean> {
    try {
      console.log('Starting invoice deletion process:', id);
      // Get invoice details before deletion
      const invoice = await this.getInvoiceById(id);
      
      if (!invoice) {
        console.error('Invoice not found for deletion:', id);
        return false;
      }
      
      const result = await InvoiceEntity.delete(id);
      
      // If this was a sales invoice, remove profit data
      if (result && invoice && invoice.invoice_type === 'sale') {
        console.log('Invoice deleted successfully, removing profit data:', id);
        await this.profitCalculationService.deleteProfitByInvoiceId(id);
        console.log('Profit data removed after invoice deletion');
      } else if (!result) {
        console.error('Invoice deletion failed:', id);
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return false;
    }
  }
  
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      console.log('Updating invoice status after payment:', invoiceId, paymentAmount);
      return this.invoiceProcessor.updateInvoiceStatusAfterPayment(invoiceId, paymentAmount);
    } catch (error) {
      console.error('Error updating invoice status after payment:', error);
      throw error;
    }
  }
  
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      console.log('Reversing invoice status after payment cancellation:', invoiceId, paymentAmount);
      return this.invoiceProcessor.reverseInvoiceStatusAfterPaymentCancellation(invoiceId, paymentAmount);
    } catch (error) {
      console.error('Error reversing invoice status after payment cancellation:', error);
      throw error;
    }
  }
}

export default InvoiceService;
