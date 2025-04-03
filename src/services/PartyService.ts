
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

class PartyService {
  private static instance: PartyService | null = null;
  
  public static getInstance(): PartyService {
    if (!PartyService.instance) {
      PartyService.instance = new PartyService();
    }
    return PartyService.instance;
  }
  
  /**
   * Get a party by ID
   */
  async getPartyById(id: string) {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error(`Error fetching party with id ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Update party balance after a transaction
   */
  async updatePartyBalanceAfterTransaction(
    partyId: string,
    amount: number,
    transactionType: string,
    referenceId: string
  ): Promise<boolean> {
    try {
      // First, get the current party balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('party_balances')
        .select('balance')
        .eq('party_id', partyId)
        .single();
      
      // If no balance record exists, create one
      if (balanceError && balanceError.message.includes('No rows found')) {
        // Get party details to determine initial balance
        const { data: party } = await supabase
          .from('parties')
          .select('opening_balance')
          .eq('id', partyId)
          .single();
          
        const initialBalance = party ? party.opening_balance || 0 : 0;
        
        // Calculate new balance based on transaction type
        let newBalance = initialBalance;
        
        if (transactionType === 'purchase') {
          newBalance -= amount; // Increase liability to supplier (negative balance)
        } else if (transactionType === 'sale') {
          newBalance += amount; // Increase receivable from customer (positive balance)
        } else if (transactionType === 'purchase_cancel') {
          newBalance += amount; // Decrease liability to supplier
        } else if (transactionType === 'sale_cancel') {
          newBalance -= amount; // Decrease receivable from customer
        }
        
        // Create a new balance record
        const { error: createError } = await supabase
          .from('party_balances')
          .insert({
            party_id: partyId,
            balance: newBalance
          });
          
        if (createError) throw createError;
      } else if (balanceError) {
        throw balanceError;
      } else {
        // Balance record exists, update it
        let newBalance = Number(balanceData.balance);
        
        if (transactionType === 'purchase') {
          newBalance -= amount; // Increase liability to supplier
        } else if (transactionType === 'sale') {
          newBalance += amount; // Increase receivable from customer
        } else if (transactionType === 'purchase_cancel') {
          newBalance += amount; // Decrease liability to supplier
        } else if (transactionType === 'sale_cancel') {
          newBalance -= amount; // Decrease receivable from customer
        }
        
        const { error: updateError } = await supabase
          .from('party_balances')
          .update({ balance: newBalance })
          .eq('party_id', partyId);
          
        if (updateError) throw updateError;
      }
      
      // Record this transaction in the ledger
      await this.recordLedgerTransaction(partyId, amount, transactionType, referenceId);
      
      return true;
    } catch (error) {
      console.error('Error updating party balance:', error);
      toast.error('حدث خطأ أثناء تحديث رصيد الحساب');
      return false;
    }
  }
  
  /**
   * Record a transaction in the ledger
   */
  private async recordLedgerTransaction(
    partyId: string,
    amount: number,
    transactionType: string,
    transactionId: string
  ): Promise<void> {
    try {
      // Get current balance
      const { data: balanceData } = await supabase
        .from('party_balances')
        .select('balance')
        .eq('party_id', partyId)
        .single();
      
      const currentBalance = balanceData ? Number(balanceData.balance) : 0;
      
      // Determine debit/credit based on transaction type
      let debit = 0;
      let credit = 0;
      
      if (transactionType === 'purchase') {
        credit = amount; // Credit supplier account
      } else if (transactionType === 'sale') {
        debit = amount; // Debit customer account
      } else if (transactionType === 'purchase_cancel') {
        debit = amount; // Debit supplier account
      } else if (transactionType === 'sale_cancel') {
        credit = amount; // Credit customer account
      }
      
      // Record in ledger
      await supabase
        .from('ledger')
        .insert({
          party_id: partyId,
          transaction_id: transactionId,
          transaction_type: transactionType,
          date: new Date().toISOString().split('T')[0],
          debit,
          credit,
          balance_after: currentBalance
        });
    } catch (error) {
      console.error('Error recording ledger transaction:', error);
    }
  }
}

export default PartyService;
