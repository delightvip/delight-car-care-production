import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import InventoryService from '../../InventoryService';
import InvoiceService from '../invoice/InvoiceService';

class PaymentProcessor {
  private supabase;
  private inventoryService;
  private invoiceService;

  constructor() {
    this.supabase = supabase;
    this.inventoryService = InventoryService.getInstance();
    this.invoiceService = InvoiceService.getInstance();
  }

  async processPayment(paymentData: any): Promise<any> {
    const { party_id, amount, payment_type, method, related_invoice_id, payment_status, notes, date } = paymentData;

    try {
      const paymentId = uuidv4();

      // Insert payment record
      const { data: payment, error: paymentError } = await this.supabase
        .from('payments')
        .insert([
          {
            id: paymentId,
            party_id,
            date,
            amount,
            payment_type,
            method,
            related_invoice_id,
            payment_status,
            notes,
          },
        ])
        .select()
        .single();

      if (paymentError) {
        throw new Error(`Payment insertion error: ${paymentError.message}`);
      }

      // Update party balance
      const { data: party, error: partyError } = await this.supabase
        .from('parties')
        .select('*')
        .eq('id', party_id)
        .single();

      if (partyError) {
        throw new Error(`Party fetch error: ${partyError.message}`);
      }

      let newBalance = party.balance;
      if (payment_type === 'collection') {
        newBalance -= amount; // Collection decreases the party's balance (customer owes less)
      } else if (payment_type === 'disbursement') {
        newBalance += amount; // Disbursement increases the party's balance (supplier is owed more)
      }

      const { error: updatePartyError } = await this.supabase
        .from('parties')
        .update({ balance: newBalance })
        .eq('id', party_id);

      if (updatePartyError) {
        throw new Error(`Party balance update error: ${updatePartyError.message}`);
      }

      // Create ledger entry
      const transactionType = payment_type === 'collection' ? 'payment_received' : 'payment_made';
      const { error: ledgerError } = await this.supabase
        .from('ledger')
        .insert([
          {
            party_id,
            transaction_id: paymentId,
            transaction_type: transactionType,
            date,
            debit: payment_type === 'disbursement' ? amount : 0, // Disbursement increases debit
            credit: payment_type === 'collection' ? amount : 0, // Collection increases credit
            balance_after: newBalance,
            notes: `Payment ${paymentId} - ${notes || ''}`,
          },
        ]);

      if (ledgerError) {
        throw new Error(`Ledger entry error: ${ledgerError.message}`);
      }

      return payment;

    } catch (error: any) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  async updatePayment(id: string, paymentData: any): Promise<any> {
    const { party_id, amount, payment_type, method, related_invoice_id, payment_status, notes, date } = paymentData;

    try {
      // Fetch existing payment
      const { data: existingPayment, error: existingPaymentError } = await this.supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();

      if (existingPaymentError) {
        throw new Error(`Existing payment fetch error: ${existingPaymentError.message}`);
      }

      // Update payment record
      const { data: payment, error: paymentError } = await this.supabase
        .from('payments')
        .update({
          party_id,
          date,
          amount,
          payment_type,
          method,
          related_invoice_id,
          payment_status,
          notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (paymentError) {
        throw new Error(`Payment update error: ${paymentError.message}`);
      }

      // Revert the balance change from the existing payment
      const { data: partyBefore, error: partyBeforeError } = await this.supabase
        .from('parties')
        .select('*')
        .eq('id', existingPayment.party_id)
        .single();

      if (partyBeforeError) {
        throw new Error(`Party fetch error: ${partyBeforeError.message}`);
      }

      let oldBalance = partyBefore.balance;
      if (existingPayment.payment_type === 'collection') {
        oldBalance += existingPayment.amount; // Revert collection
      } else if (existingPayment.payment_type === 'disbursement') {
        oldBalance -= existingPayment.amount; // Revert disbursement
      }

      // Apply the balance change from the updated payment
      const { data: partyAfter, error: partyAfterError } = await this.supabase
        .from('parties')
        .select('*')
        .eq('id', party_id)
        .single();

      if (partyAfterError) {
        throw new Error(`Party fetch error: ${partyAfterError.message}`);
      }

      let newBalance = oldBalance;
      if (payment_type === 'collection') {
        newBalance -= amount; // Apply collection
      } else if (payment_type === 'disbursement') {
        newBalance += amount; // Apply disbursement
      }

      const { error: updatePartyError } = await this.supabase
        .from('parties')
        .update({ balance: newBalance })
        .eq('id', party_id);

      if (updatePartyError) {
        throw new Error(`Party balance update error: ${updatePartyError.message}`);
      }

      // Update ledger entry
      const transactionType = payment_type === 'collection' ? 'payment_received' : 'payment_made';
      const { error: ledgerError } = await this.supabase
        .from('ledger')
        .update({
          date,
          debit: payment_type === 'disbursement' ? amount : 0,
          credit: payment_type === 'collection' ? amount : 0,
          balance_after: newBalance,
          notes: `Payment ${id} - ${notes || ''}`,
        })
        .eq('transaction_id', id);

      if (ledgerError) {
        throw new Error(`Ledger entry error: ${ledgerError.message}`);
      }

      return payment;

    } catch (error: any) {
      console.error('Error updating payment:', error);
      throw error;
    }
  }

  async deletePayment(id: string): Promise<boolean> {
    try {
      // Fetch existing payment
      const { data: existingPayment, error: existingPaymentError } = await this.supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();

      if (existingPaymentError) {
        throw new Error(`Existing payment fetch error: ${existingPaymentError.message}`);
      }

      // Revert the balance change
      const { data: party, error: partyError } = await this.supabase
        .from('parties')
        .select('*')
        .eq('id', existingPayment.party_id)
        .single();

      if (partyError) {
        throw new Error(`Party fetch error: ${partyError.message}`);
      }

      let newBalance = party.balance;
      if (existingPayment.payment_type === 'collection') {
        newBalance += existingPayment.amount; // Revert collection
      } else if (existingPayment.payment_type === 'disbursement') {
        newBalance -= existingPayment.amount; // Revert disbursement
      }

      const { error: updatePartyError } = await this.supabase
        .from('parties')
        .update({ balance: newBalance })
        .eq('id', existingPayment.party_id);

      if (updatePartyError) {
        throw new Error(`Party balance update error: ${updatePartyError.message}`);
      }

      // Delete ledger entry
      const { error: ledgerError } = await this.supabase
        .from('ledger')
        .delete()
        .eq('transaction_id', id);

      if (ledgerError) {
        throw new Error(`Ledger entry deletion error: ${ledgerError.message}`);
      }

      // Delete payment record
      const { error: deletePaymentError } = await this.supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (deletePaymentError) {
        throw new Error(`Payment deletion error: ${deletePaymentError.message}`);
      }

      return true;

    } catch (error: any) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  }

  async confirmPayment(id: string): Promise<boolean> {
    try {
      // Update payment status to confirmed
      const { error: paymentError } = await this.supabase
        .from('payments')
        .update({ payment_status: 'confirmed' })
        .eq('id', id);

      if (paymentError) {
        throw new Error(`Payment confirmation error: ${paymentError.message}`);
      }

      return true;

    } catch (error: any) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  async cancelPayment(id: string): Promise<boolean> {
    try {
      // Update payment status to cancelled
      const { error: paymentError } = await this.supabase
        .from('payments')
        .update({ payment_status: 'cancelled' })
        .eq('id', id);

      if (paymentError) {
        throw new Error(`Payment cancellation error: ${paymentError.message}`);
      }

      return true;

    } catch (error: any) {
      console.error('Error cancelling payment:', error);
      throw error;
    }
  }
}

export default PaymentProcessor;
