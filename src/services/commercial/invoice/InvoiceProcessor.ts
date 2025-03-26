import InventoryService from '../../InventoryService';
import { supabase } from '@/integrations/supabase/client';
import { FinancialService } from '../../financial/FinancialService';

class InvoiceProcessor {
  private supabase;
  private inventoryService;
  private financialService; // Add missing property

  constructor() {
    this.supabase = supabase;
    this.inventoryService = InventoryService.getInstance();
    this.financialService = new FinancialService(); // Initialize the missing property
  }

  async processInvoice(invoiceData: any): Promise<any> {
    const { items, party_id, total_amount, invoice_type, id } = invoiceData;

    try {
      await this.processInventory(items, invoice_type);
      await this.processFinancialTransaction(party_id, total_amount, invoice_type, id);

      return { success: true, message: 'Invoice processed successfully.' };
    } catch (error) {
      console.error('Error processing invoice:', error);
      throw error;
    }
  }

  async processInventory(items: any[], invoice_type: string): Promise<void> {
    for (const item of items) {
      const { item_id, quantity } = item;

      try {
        if (invoice_type === 'sale') {
          await this.inventoryService.decreaseStock(item_id, quantity);
        } else if (invoice_type === 'purchase') {
          await this.inventoryService.increaseStock(item_id, quantity);
        }
      } catch (error) {
        console.error(`Error processing inventory for item ${item_id}:`, error);
        throw error;
      }
    }
  }

  async processFinancialTransaction(party_id: string, total_amount: number, invoice_type: string, invoice_id: string): Promise<void> {
    const transactionType = invoice_type === 'sale' ? 'sale_invoice' : 'purchase_invoice';
  
    try {
      if (invoice_type === 'sale') {
        await this.financialService.createLedgerEntry({
          party_id: party_id,
          transaction_id: invoice_id,
          transaction_type: transactionType,
          date: new Date().toISOString().split('T')[0],
          debit: total_amount,
          credit: 0,
          notes: `Sale Invoice ${invoice_id}`
        });
      } else if (invoice_type === 'purchase') {
        await this.financialService.createLedgerEntry({
          party_id: party_id,
          transaction_id: invoice_id,
          transaction_type: transactionType,
          date: new Date().toISOString().split('T')[0],
          debit: 0,
          credit: total_amount,
          notes: `Purchase Invoice ${invoice_id}`
        });
      }
    } catch (error) {
      console.error('Error creating ledger entry:', error);
      throw error;
    }
  }

  async revertInvoice(invoiceData: any): Promise<any> {
    const { items, party_id, total_amount, invoice_type, id } = invoiceData;

    try {
      await this.revertInventory(items, invoice_type);
      await this.revertFinancialTransaction(party_id, total_amount, invoice_type, id);

      return { success: true, message: 'Invoice reverted successfully.' };
    } catch (error) {
      console.error('Error reverting invoice:', error);
      throw error;
    }
  }

  async revertInventory(items: any[], invoice_type: string): Promise<void> {
    for (const item of items) {
      const { item_id, quantity } = item;

      try {
        if (invoice_type === 'sale') {
          await this.inventoryService.increaseStock(item_id, quantity);
        } else if (invoice_type === 'purchase') {
          await this.inventoryService.decreaseStock(item_id, quantity);
        }
      } catch (error) {
        console.error(`Error reverting inventory for item ${item_id}:`, error);
        throw error;
      }
    }
  }

  async revertFinancialTransaction(party_id: string, total_amount: number, invoice_type: string, invoice_id: string): Promise<void> {
    const transactionType = invoice_type === 'sale' ? 'cancel_sale_invoice' : 'cancel_purchase_invoice';
  
    try {
      if (invoice_type === 'sale') {
        await this.financialService.createLedgerEntry({
          party_id: party_id,
          transaction_id: invoice_id,
          transaction_type: transactionType,
          date: new Date().toISOString().split('T')[0],
          debit: 0,
          credit: total_amount,
          notes: `Reverted Sale Invoice ${invoice_id}`
        });
      } else if (invoice_type === 'purchase') {
        await this.financialService.createLedgerEntry({
          party_id: party_id,
          transaction_id: invoice_id,
          transaction_type: transactionType,
          date: new Date().toISOString().split('T')[0],
          debit: total_amount,
          credit: 0,
          notes: `Reverted Purchase Invoice ${invoice_id}`
        });
      }
    } catch (error) {
      console.error('Error reverting ledger entry:', error);
      throw error;
    }
  }
}

export default InvoiceProcessor;
