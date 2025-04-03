import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Export the Party interface so it can be imported in other files
export interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  opening_balance: number;
  balance_type?: 'credit' | 'debit';
  balance: number;  // Current balance
  notes?: string;
  code?: string;    // Optional code property
  created_at: string;
}

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
      
      // Get party balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('party_balances')
        .select('balance')
        .eq('party_id', id)
        .single();
      
      let balance = data.opening_balance || 0;
      if (!balanceError) {
        balance = balanceData.balance;
      }
      
      return {
        ...data,
        balance,
        code: data.code || '',
        type: data.type as 'customer' | 'supplier' | 'other'
      } as Party;
    } catch (error) {
      console.error(`Error fetching party with id ${id}:`, error);
      return null;
    }
  }

  /**
   * Get all parties
   */
  async getParties(): Promise<Party[]> {
    try {
      // First get parties data
      const { data: partiesData, error: partiesError } = await supabase
        .from('parties')
        .select('*');
        
      if (partiesError) throw partiesError;
      
      // Then get party balances
      const { data: balancesData, error: balancesError } = await supabase
        .from('party_balances')
        .select('*');
        
      if (balancesError) throw balancesError;
      
      // Merge the data
      const partiesWithBalances = partiesData.map(party => {
        const balanceRecord = balancesData.find(b => b.party_id === party.id);
        
        return {
          ...party,
          balance: balanceRecord ? Number(balanceRecord.balance) : Number(party.opening_balance || 0),
          code: party.code || '',
          notes: party.notes || '',
          type: party.type as 'customer' | 'supplier' | 'other'
        } as Party;
      });
      
      return partiesWithBalances;
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الأطراف التجارية');
      return [];
    }
  }

  /**
   * Get parties by type
   */
  async getPartiesByType(type: 'customer' | 'supplier' | 'other'): Promise<Party[]> {
    try {
      const allParties = await this.getParties();
      return allParties.filter(party => party.type === type);
    } catch (error) {
      console.error(`Error fetching parties of type ${type}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات الأطراف التجارية');
      return [];
    }
  }
  
  /**
   * Add a new party
   */
  async addParty(partyData: Omit<Party, 'id' | 'balance' | 'created_at'>): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .insert(partyData)
        .select()
        .single();
        
      if (error) throw error;
      
      if (partyData.opening_balance && partyData.opening_balance !== 0) {
        // Create initial balance record
        await this.updatePartyBalanceAfterTransaction(
          data.id,
          partyData.opening_balance,
          partyData.balance_type === 'credit' ? 'opening_balance_credit' : 'opening_balance_debit',
          'initial'
        );
      }
      
      toast.success('تمت إضافة الطرف التجاري بنجاح');
      return { ...data, balance: partyData.opening_balance || 0 };
    } catch (error) {
      console.error('Error adding party:', error);
      toast.error('حدث خطأ أثناء إضافة طرف تجاري جديد');
      return null;
    }
  }
  
  /**
   * Update party details
   */
  async updateParty(id: string, updates: Partial<Party>): Promise<boolean> {
    try {
      // Remove balance from updates as it's not a column in the parties table
      const { balance, ...partyUpdates } = updates;
      
      const { error } = await supabase
        .from('parties')
        .update(partyUpdates)
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('تم تحديث بيانات الطرف التجاري بنجاح');
      return true;
    } catch (error) {
      console.error(`Error updating party ${id}:`, error);
      toast.error('حدث خطأ أثناء تحديث بيانات الطرف التجاري');
      return false;
    }
  }
  
  /**
   * Delete a party
   */
  async deleteParty(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parties')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('تم حذف الطرف التجاري بنجاح');
      return true;
    } catch (error) {
      console.error(`Error deleting party ${id}:`, error);
      toast.error('حدث خطأ أثناء حذف الطرف التجاري');
      return false;
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
   * Update party balance directly
   * Used by payment services
   */
  async updatePartyBalance(
    partyId: string,
    amount: number,
    isDebit: boolean,
    description: string,
    transactionType: string,
    referenceId: string
  ): Promise<boolean> {
    try {
      // Get the current balance
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
        
        // Calculate new balance
        const newBalance = initialBalance + (isDebit ? amount : -amount);
        
        // Create a new balance record
        const { error: createError } = await supabase
          .from('party_balances')
          .insert({
            party_id: partyId,
            balance: newBalance
          });
          
        if (createError) throw createError;
        
        // Record in ledger
        await this.recordBalanceTransaction(partyId, amount, isDebit, newBalance, description, transactionType, referenceId);
      } else if (balanceError) {
        throw balanceError;
      } else {
        // Balance record exists, update it
        const currentBalance = Number(balanceData.balance);
        const newBalance = currentBalance + (isDebit ? amount : -amount);
        
        const { error: updateError } = await supabase
          .from('party_balances')
          .update({ balance: newBalance })
          .eq('party_id', partyId);
          
        if (updateError) throw updateError;
        
        // Record in ledger
        await this.recordBalanceTransaction(partyId, amount, isDebit, newBalance, description, transactionType, referenceId);
      }
      
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
  
  /**
   * Record a balance transaction in the ledger
   */
  private async recordBalanceTransaction(
    partyId: string,
    amount: number,
    isDebit: boolean,
    balanceAfter: number,
    description: string,
    transactionType: string,
    referenceId: string
  ): Promise<void> {
    try {
      await supabase
        .from('ledger')
        .insert({
          party_id: partyId,
          transaction_id: referenceId,
          transaction_type: transactionType,
          date: new Date().toISOString().split('T')[0],
          debit: isDebit ? amount : 0,
          credit: isDebit ? 0 : amount,
          balance_after: balanceAfter
        });
    } catch (error) {
      console.error('Error recording ledger transaction:', error);
    }
  }
}

export default PartyService;
