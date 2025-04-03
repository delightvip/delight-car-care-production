
import { supabase } from '@/integrations/supabase/client';
import { InvoiceEntity } from './InvoiceEntity';
import InventoryService from '@/services/InventoryService';
import PartyService from '@/services/PartyService';
import { toast } from 'sonner';

export class InvoiceProcessor {
  private inventoryService: InventoryService;
  private partyService: PartyService;

  constructor() {
    this.inventoryService = InventoryService.getInstance();
    this.partyService = PartyService.getInstance();
  }

  /**
   * Confirm an invoice, which updates inventory and party balances
   */
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoice = await InvoiceEntity.findById(invoiceId);
      if (!invoice) {
        console.error(`Invoice with id ${invoiceId} not found`);
        return false;
      }
      
      console.log('Confirming invoice:', invoice);
      
      if (invoice.payment_status === 'confirmed') {
        console.log('Invoice already confirmed, skipping');
        return true;
      }

      // Process inventory changes based on invoice type
      if (invoice.invoice_type === 'purchase') {
        // For purchases, add items to inventory
        for (const item of invoice.items) {
          // Record inventory movement
          await this.inventoryService.recordItemMovement({
            type: 'in',
            category: item.item_type,
            itemName: item.item_name,
            quantity: item.quantity,
            date: new Date(),
            note: `Purchase from invoice #${invoiceId}`
          });
        }
        
        // Update party balance (supplier)
        if (invoice.party_id) {
          await this.partyService.updatePartyBalanceAfterTransaction(
            invoice.party_id,
            invoice.total_amount,
            'purchase',
            invoiceId
          );
        }
      } else if (invoice.invoice_type === 'sale') {
        // For sales, remove items from inventory
        for (const item of invoice.items) {
          // Record inventory movement
          await this.inventoryService.recordItemMovement({
            type: 'out',
            category: item.item_type,
            itemName: item.item_name,
            quantity: item.quantity,
            date: new Date(),
            note: `Sale from invoice #${invoiceId}`
          });
        }
        
        // Update party balance (customer)
        if (invoice.party_id) {
          await this.partyService.updatePartyBalanceAfterTransaction(
            invoice.party_id,
            invoice.total_amount,
            'sale',
            invoiceId
          );
        }
      }
      
      // Update invoice status to confirmed
      const updateResult = await InvoiceEntity.updateStatus(invoiceId, invoice.status, 'confirmed');
      
      if (updateResult) {
        toast.success('تم تأكيد الفاتورة بنجاح');
      }
      
      return updateResult;
    } catch (error) {
      console.error('Error confirming invoice:', error);
      toast.error('حدث خطأ أثناء تأكيد الفاتورة');
      return false;
    }
  }

  /**
   * Cancel an invoice, reversing its effects on inventory and party balances
   */
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoice = await InvoiceEntity.findById(invoiceId);
      if (!invoice) {
        console.error(`Invoice with id ${invoiceId} not found`);
        return false;
      }
      
      console.log('Cancelling invoice:', invoice);
      
      if (invoice.payment_status === 'cancelled') {
        console.log('Invoice already cancelled, skipping');
        return true;
      }

      // Process inventory reversal based on invoice type
      if (invoice.invoice_type === 'purchase') {
        // For purchases, remove items from inventory
        for (const item of invoice.items) {
          // Record inventory movement
          await this.inventoryService.recordItemMovement({
            type: 'out',
            category: item.item_type,
            itemName: item.item_name,
            quantity: item.quantity,
            date: new Date(),
            note: `Cancelled purchase from invoice #${invoiceId}`
          });
        }
        
        // Reverse party balance update (supplier)
        if (invoice.party_id) {
          await this.partyService.updatePartyBalanceAfterTransaction(
            invoice.party_id,
            -invoice.total_amount,
            'purchase_cancel',
            invoiceId
          );
        }
      } else if (invoice.invoice_type === 'sale') {
        // For sales, add items back to inventory
        for (const item of invoice.items) {
          // Record inventory movement
          await this.inventoryService.recordItemMovement({
            type: 'in',
            category: item.item_type,
            itemName: item.item_name,
            quantity: item.quantity,
            date: new Date(),
            note: `Cancelled sale from invoice #${invoiceId}`
          });
        }
        
        // Reverse party balance update (customer)
        if (invoice.party_id) {
          await this.partyService.updatePartyBalanceAfterTransaction(
            invoice.party_id,
            -invoice.total_amount,
            'sale_cancel',
            invoiceId
          );
        }
      }
      
      // Update invoice status to cancelled
      const updateResult = await InvoiceEntity.updateStatus(invoiceId, invoice.status, 'cancelled');
      
      if (updateResult) {
        toast.success('تم إلغاء الفاتورة بنجاح');
      }
      
      return updateResult;
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast.error('حدث خطأ أثناء إلغاء الفاتورة');
      return false;
    }
  }

  /**
   * Update invoice status after a payment is made
   */
  public async updateInvoiceStatusAfterPayment(
    invoiceId: string,
    paymentAmount: number
  ): Promise<void> {
    try {
      const invoice = await InvoiceEntity.findById(invoiceId);
      if (!invoice) {
        console.error(`Invoice with id ${invoiceId} not found`);
        return;
      }
      
      // Get all payments for this invoice to calculate total paid amount
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('related_invoice_id', invoiceId)
        .eq('payment_status', 'confirmed');
        
      if (error) throw error;
      
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      let newStatus = 'unpaid';
      if (totalPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      }
      
      await InvoiceEntity.updateStatus(invoiceId, newStatus);
      console.log(`Updated invoice ${invoiceId} status to ${newStatus}`);
    } catch (error) {
      console.error('Error updating invoice status after payment:', error);
    }
  }

  /**
   * Reverse invoice status update after a payment is cancelled
   */
  public async reverseInvoiceStatusAfterPaymentCancellation(
    invoiceId: string,
    paymentAmount: number
  ): Promise<void> {
    try {
      const invoice = await InvoiceEntity.findById(invoiceId);
      if (!invoice) {
        console.error(`Invoice with id ${invoiceId} not found`);
        return;
      }
      
      // Get all payments for this invoice to calculate total paid amount
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('related_invoice_id', invoiceId)
        .eq('payment_status', 'confirmed');
        
      if (error) throw error;
      
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      let newStatus = 'unpaid';
      if (totalPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      }
      
      await InvoiceEntity.updateStatus(invoiceId, newStatus);
      console.log(`Updated invoice ${invoiceId} status to ${newStatus} after payment cancellation`);
    } catch (error) {
      console.error('Error updating invoice status after payment cancellation:', error);
    }
  }
}
