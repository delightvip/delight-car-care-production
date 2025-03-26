
import { supabase } from "@/integrations/supabase/client";
import { Invoice } from "@/services/CommercialTypes";
import InventoryService from "@/services/InventoryService";
import PartyService from "@/services/PartyService";
import { InvoiceEntity } from "./InvoiceEntity";

export class InvoiceProcessor {
  private inventoryService: InventoryService;
  private partyService: PartyService;

  constructor() {
    this.inventoryService = new InventoryService();
    this.partyService = PartyService.getInstance();
  }

  /**
   * Confirm an invoice, update inventory and financial records
   */
  public async confirmInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoiceData = await InvoiceEntity.fetchById(invoiceId);
      if (!invoiceData) {
        console.error('Invoice not found');
        return false;
      }
      
      if (invoiceData.payment_status === 'confirmed') {
        console.log('Invoice already confirmed');
        return true;
      }
      
      // Update inventory based on invoice type
      if (invoiceData.invoice_type === 'sale') {
        // Decrease inventory for sales invoices
        for (const item of invoiceData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for sales invoices
        if (invoiceData.party_id) {
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            true, // debit for sales (increase customer's debt)
            'فاتورة مبيعات',
            'sale_invoice',
            invoiceData.id
          );
        }
      } else if (invoiceData.invoice_type === 'purchase') {
        // Increase inventory for purchase invoices
        for (const item of invoiceData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for purchase invoices
        if (invoiceData.party_id) {
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            false, // credit for purchases (increase our debt)
            'فاتورة مشتريات',
            'purchase_invoice',
            invoiceData.id
          );
        }
      }
      
      // Update invoice status to confirmed
      const { error } = await supabase
        .from('invoices')
        .update({ payment_status: 'confirmed' })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error confirming invoice:', error);
      return false;
    }
  }
  
  /**
   * Cancel an invoice, reverse inventory and financial changes
   */
  public async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoiceData = await InvoiceEntity.fetchById(invoiceId);
      if (!invoiceData) {
        console.error('Invoice not found');
        return false;
      }
      
      if (invoiceData.payment_status !== 'confirmed') {
        console.error('Can only cancel confirmed invoices');
        return false;
      }
      
      // Update inventory based on invoice type
      if (invoiceData.invoice_type === 'sale') {
        // Increase inventory for cancelled sales invoices
        for (const item of invoiceData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for cancelled sales invoices
        if (invoiceData.party_id) {
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            false, // credit for cancelled sales (reduce customer's debt)
            'إلغاء فاتورة مبيعات',
            'cancel_sale_invoice',
            invoiceData.id
          );
        }
      } else if (invoiceData.invoice_type === 'purchase') {
        // Decrease inventory for cancelled purchase invoices
        for (const item of invoiceData.items || []) {
          switch (item.item_type) {
            case 'raw_materials':
              await this.inventoryService.updateRawMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'packaging_materials':
              await this.inventoryService.updatePackagingMaterial(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'semi_finished_products':
              await this.inventoryService.updateSemiFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
            case 'finished_products':
              await this.inventoryService.updateFinishedProduct(item.item_id, { quantity: -Number(item.quantity) });
              break;
          }
        }
        
        // Update financial records for cancelled purchase invoices
        if (invoiceData.party_id) {
          await this.partyService.updatePartyBalance(
            invoiceData.party_id,
            invoiceData.total_amount,
            true, // debit for cancelled purchases (reduce our debt)
            'إلغاء فاتورة مشتريات',
            'cancel_purchase_invoice',
            invoiceData.id
          );
        }
      }
      
      // Update invoice status to cancelled
      const { error } = await supabase
        .from('invoices')
        .update({ payment_status: 'cancelled' })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      return false;
    }
  }
  
  /**
   * Update invoice status after payment
   */
  public async updateInvoiceStatusAfterPayment(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const invoice = await InvoiceEntity.fetchById(invoiceId);
      
      if (!invoice) {
        console.error('Invoice not found');
        return;
      }
      
      const remainingAmount = invoice.total_amount - paymentAmount;
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (remainingAmount <= 0) {
        newStatus = 'paid';
      } else if (paymentAmount > 0) {
        newStatus = 'partial';
      }
      
      await InvoiceEntity.update(invoiceId, { status: newStatus });
    } catch (error) {
      console.error('Error updating invoice status:', error);
    }
  }
  
  /**
   * Reverse invoice status after payment cancellation
   */
  public async reverseInvoiceStatusAfterPaymentCancellation(invoiceId: string, paymentAmount: number): Promise<void> {
    try {
      const invoice = await InvoiceEntity.fetchById(invoiceId);
      
      if (!invoice) {
        console.error('Invoice not found');
        return;
      }
      
      // Get all confirmed payments for this invoice
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('related_invoice_id', invoiceId)
        .eq('payment_status', 'confirmed');
      
      if (error) throw error;
      
      // Calculate total paid amount excluding the cancelled payment
      const totalPaid = payments
        ? payments.reduce((sum, payment) => sum + Number(payment.amount), 0) - paymentAmount
        : 0;
      
      // Determine new status
      let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      
      if (totalPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      }
      
      await InvoiceEntity.update(invoiceId, { status: newStatus });
    } catch (error) {
      console.error('Error reversing invoice status:', error);
    }
  }
}
