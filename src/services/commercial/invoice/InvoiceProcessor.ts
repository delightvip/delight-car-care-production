
import { Invoice, InvoiceItem } from '../CommercialTypes';
import InvoiceEntity from './InvoiceEntity';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import InventoryService from '@/services/InventoryService';
import PartyService from '@/services/PartyService';
import { format } from 'date-fns';

export class InvoiceProcessor {
  private partyService: PartyService;
  private inventoryService: InventoryService;
  
  constructor() {
    this.partyService = new PartyService();
    this.inventoryService = new InventoryService();
  }
  
  /**
   * Process an invoice to be confirmed
   */
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoiceData = await InvoiceEntity.findById(invoiceId);
      if (!invoiceData) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoiceData.payment_status === 'confirmed') {
        toast.info('الفاتورة مؤكدة بالفعل');
        return true;
      }
      
      // Update inventory based on invoice type
      if (invoiceData.invoice_type === 'sale') {
        // Decrease inventory for sales invoices
        await this.processInventoryForSale(invoiceData.items);
        
        // Update financial records for sales invoices
        if (invoiceData.party_id) {
          await this.updatePartyBalanceForSale(invoiceData);
        }
      } else if (invoiceData.invoice_type === 'purchase') {
        // Increase inventory for purchase invoices
        await this.processInventoryForPurchase(invoiceData.items);
        
        // Update financial records for purchase invoices
        if (invoiceData.party_id) {
          await this.updatePartyBalanceForPurchase(invoiceData);
        }
      }
      
      // Update invoice status to confirmed
      const { error } = await supabase
        .from('invoices')
        .update({ payment_status: 'confirmed' })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      toast.success('تم تأكيد الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error confirming invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد الفاتورة');
      return false;
    }
  }
  
  /**
   * Process an invoice to be cancelled
   */
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoiceData = await InvoiceEntity.findById(invoiceId);
      if (!invoiceData) {
        toast.error('لم يتم العثور على الفاتورة');
        return false;
      }
      
      if (invoiceData.payment_status !== 'confirmed') {
        toast.error('يمكن إلغاء الفواتير المؤكدة فقط');
        return false;
      }
      
      // Update inventory based on invoice type
      if (invoiceData.invoice_type === 'sale') {
        // Increase inventory for cancelled sales invoices
        await this.reverseInventoryForSale(invoiceData.items);
        
        // Update financial records for cancelled sales invoices
        if (invoiceData.party_id) {
          await this.reversePartyBalanceForSale(invoiceData);
        }
      } else if (invoiceData.invoice_type === 'purchase') {
        // Decrease inventory for cancelled purchase invoices
        await this.reverseInventoryForPurchase(invoiceData.items);
        
        // Update financial records for cancelled purchase invoices
        if (invoiceData.party_id) {
          await this.reversePartyBalanceForPurchase(invoiceData);
        }
      }
      
      // Update invoice status to cancelled
      const { error } = await supabase
        .from('invoices')
        .update({ payment_status: 'cancelled' })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      toast.success('تم إلغاء الفاتورة بنجاح');
      return true;
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast.error('حدث خطأ أثناء إلغاء الفاتورة');
      return false;
    }
  }
  
  /**
   * Process inventory updates for a sales invoice
   */
  private async processInventoryForSale(items: InvoiceItem[]): Promise<void> {
    try {
      for (const item of items) {
        switch (item.item_type) {
          case 'raw_materials':
            await this.inventoryService.updateRawMaterial(item.item_id, { 
              quantity: -Number(item.quantity)
            });
            break;
          case 'packaging_materials':
            await this.inventoryService.updatePackagingMaterial(item.item_id, { 
              quantity: -Number(item.quantity)
            });
            break;
          case 'semi_finished_products':
            await this.inventoryService.updateSemiFinishedProduct(item.item_id, { 
              quantity: -Number(item.quantity)
            });
            break;
          case 'finished_products':
            await this.inventoryService.updateFinishedProduct(item.item_id, { 
              quantity: -Number(item.quantity)
            });
            break;
        }
      }
    } catch (error) {
      console.error('Error processing inventory for sale:', error);
      throw error;
    }
  }
  
  /**
   * Process inventory updates for a purchase invoice
   */
  private async processInventoryForPurchase(items: InvoiceItem[]): Promise<void> {
    try {
      for (const item of items) {
        switch (item.item_type) {
          case 'raw_materials':
            await this.inventoryService.updateRawMaterial(item.item_id, { 
              quantity: Number(item.quantity)
            });
            break;
          case 'packaging_materials':
            await this.inventoryService.updatePackagingMaterial(item.item_id, { 
              quantity: Number(item.quantity)
            });
            break;
          case 'semi_finished_products':
            await this.inventoryService.updateSemiFinishedProduct(item.item_id, { 
              quantity: Number(item.quantity)
            });
            break;
          case 'finished_products':
            await this.inventoryService.updateFinishedProduct(item.item_id, { 
              quantity: Number(item.quantity)
            });
            break;
        }
      }
    } catch (error) {
      console.error('Error processing inventory for purchase:', error);
      throw error;
    }
  }
  
  /**
   * Reverse inventory updates for a sales invoice
   */
  private async reverseInventoryForSale(items: InvoiceItem[]): Promise<void> {
    try {
      for (const item of items) {
        switch (item.item_type) {
          case 'raw_materials':
            await this.inventoryService.updateRawMaterial(item.item_id, { 
              quantity: Number(item.quantity)
            });
            break;
          case 'packaging_materials':
            await this.inventoryService.updatePackagingMaterial(item.item_id, { 
              quantity: Number(item.quantity)
            });
            break;
          case 'semi_finished_products':
            await this.inventoryService.updateSemiFinishedProduct(item.item_id, { 
              quantity: Number(item.quantity)
            });
            break;
          case 'finished_products':
            await this.inventoryService.updateFinishedProduct(item.item_id, { 
              quantity: Number(item.quantity)
            });
            break;
        }
      }
    } catch (error) {
      console.error('Error reversing inventory for sale:', error);
      throw error;
    }
  }
  
  /**
   * Reverse inventory updates for a purchase invoice
   */
  private async reverseInventoryForPurchase(items: InvoiceItem[]): Promise<void> {
    try {
      for (const item of items) {
        switch (item.item_type) {
          case 'raw_materials':
            await this.inventoryService.updateRawMaterial(item.item_id, { 
              quantity: -Number(item.quantity)
            });
            break;
          case 'packaging_materials':
            await this.inventoryService.updatePackagingMaterial(item.item_id, { 
              quantity: -Number(item.quantity)
            });
            break;
          case 'semi_finished_products':
            await this.inventoryService.updateSemiFinishedProduct(item.item_id, { 
              quantity: -Number(item.quantity)
            });
            break;
          case 'finished_products':
            await this.inventoryService.updateFinishedProduct(item.item_id, { 
              quantity: -Number(item.quantity)
            });
            break;
        }
      }
    } catch (error) {
      console.error('Error reversing inventory for purchase:', error);
      throw error;
    }
  }
  
  /**
   * Update party balance for a sales invoice
   */
  private async updatePartyBalanceForSale(invoice: Invoice): Promise<void> {
    try {
      await this.partyService.updatePartyBalance(
        invoice.party_id,
        invoice.total_amount,
        true, // debit for sales (increase customer's debt)
        'فاتورة مبيعات',
        'sale_invoice',
        invoice.id
      );
    } catch (error) {
      console.error('Error updating party balance for sale:', error);
      throw error;
    }
  }
  
  /**
   * Update party balance for a purchase invoice
   */
  private async updatePartyBalanceForPurchase(invoice: Invoice): Promise<void> {
    try {
      await this.partyService.updatePartyBalance(
        invoice.party_id,
        invoice.total_amount,
        false, // credit for purchases (increase our debt)
        'فاتورة مشتريات',
        'purchase_invoice',
        invoice.id
      );
    } catch (error) {
      console.error('Error updating party balance for purchase:', error);
      throw error;
    }
  }
  
  /**
   * Reverse party balance update for a sales invoice
   */
  private async reversePartyBalanceForSale(invoice: Invoice): Promise<void> {
    try {
      await this.partyService.updatePartyBalance(
        invoice.party_id,
        invoice.total_amount,
        false, // credit for cancelled sales (reduce customer's debt)
        'إلغاء فاتورة مبيعات',
        'cancel_sale_invoice',
        invoice.id
      );
    } catch (error) {
      console.error('Error reversing party balance for sale:', error);
      throw error;
    }
  }
  
  /**
   * Reverse party balance update for a purchase invoice
   */
  private async reversePartyBalanceForPurchase(invoice: Invoice): Promise<void> {
    try {
      await this.partyService.updatePartyBalance(
        invoice.party_id,
        invoice.total_amount,
        true, // debit for cancelled purchases (reduce our debt)
        'إلغاء فاتورة مشتريات',
        'cancel_purchase_invoice',
        invoice.id
      );
    } catch (error) {
      console.error('Error reversing party balance for purchase:', error);
      throw error;
    }
  }
  
  /**
   * Update an invoice's status after a payment
   */
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const invoice = await InvoiceEntity.findById(invoiceId);
      
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return;
      }
      
      const remainingAmount = invoice.total_amount - paymentAmount;
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (remainingAmount <= 0) {
        newStatus = 'paid';
      } else if (paymentAmount > 0) {
        newStatus = 'partial';
      }
      
      // Using the updateStatus method from InvoiceEntity class
      const success = await InvoiceEntity.updateStatus(invoiceId, newStatus);
      
      if (!success) {
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
      } else {
        toast.success('تم تحديث حالة الفاتورة بنجاح');
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
    }
  }
  
  /**
   * Reverse an invoice's status after a payment cancellation
   */
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const invoice = await InvoiceEntity.findById(invoiceId);
      
      if (!invoice) {
        toast.error('لم يتم العثور على الفاتورة');
        return;
      }
      
      const remainingAmount = invoice.total_amount + paymentAmount;
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (remainingAmount <= 0) {
        newStatus = 'paid';
      } else if (paymentAmount > 0) {
        newStatus = 'partial';
      }
      
      // Using the updateStatus method from InvoiceEntity class
      const success = await InvoiceEntity.updateStatus(invoiceId, newStatus);
      
      if (!success) {
        toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
      } else {
        toast.success('تم تحديث حالة الفاتورة بنجاح');
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
    }
  }
}

export default InvoiceProcessor;
