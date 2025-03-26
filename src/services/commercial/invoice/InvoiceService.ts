
import { Invoice, InvoiceItem } from '@/services/CommercialTypes';
import { InvoiceEntity } from './InvoiceEntity';
import { InvoiceProcessor } from './InvoiceProcessor';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

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
  
  public async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);
      
      if (error) throw error;
      
      return data.map(item => ({
        id: item.id,
        invoice_id: item.invoice_id,
        item_id: item.item_id,
        item_name: item.item_name,
        item_type: item.item_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        cost_price: this.getItemCostPrice(item.item_id, item.item_type),
        created_at: item.created_at
      }));
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      return [];
    }
  }
  
  private async getItemCostPrice(itemId: number, itemType: string): Promise<number> {
    try {
      // تجلب تكلفة الوحدة حسب نوع العنصر
      let table;
      switch (itemType) {
        case 'raw_materials':
          table = 'raw_materials';
          break;
        case 'packaging_materials':
          table = 'packaging_materials';
          break;
        case 'semi_finished_products':
          table = 'semi_finished_products';
          break;
        case 'finished_products':
          table = 'finished_products';
          break;
        default:
          return 0;
      }
      
      const { data, error } = await supabase
        .from(table)
        .select('unit_cost')
        .eq('id', itemId)
        .single();
      
      if (error || !data) return 0;
      
      return data.unit_cost || 0;
    } catch (error) {
      console.error(`Error getting cost price for item ${itemId} of type ${itemType}:`, error);
      return 0;
    }
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
