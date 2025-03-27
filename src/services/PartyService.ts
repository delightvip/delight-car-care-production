
import { supabase } from "@/integrations/supabase/client";
import { Party } from "./CommercialTypes";
import { toast } from "sonner";

class PartyService {
  private static instance: PartyService;
  
  private constructor() {}
  
  public static getInstance(): PartyService {
    if (!PartyService.instance) {
      PartyService.instance = new PartyService();
    }
    return PartyService.instance;
  }
  
  public async getParties(): Promise<Party[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*');
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الأطراف');
      return [];
    }
  }
  
  public async getPartyById(id: string): Promise<Party | null> {
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
      toast.error('حدث خطأ أثناء جلب بيانات الطرف');
      return null;
    }
  }
  
  public async getPartiesByType(type: 'customer' | 'supplier'): Promise<Party[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('type', type);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error(`Error fetching parties of type ${type}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات الأطراف');
      return [];
    }
  }
  
  public async addParty(party: Omit<Party, 'id' | 'created_at'>): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .insert(party)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('تمت إضافة الطرف بنجاح');
      return data;
    } catch (error) {
      console.error('Error adding party:', error);
      toast.error('حدث خطأ أثناء إضافة الطرف');
      return null;
    }
  }
  
  public async updateParty(id: string, party: Partial<Party>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parties')
        .update(party)
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث بيانات الطرف بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating party:', error);
      toast.error('حدث خطأ أثناء تحديث بيانات الطرف');
      return false;
    }
  }
  
  public async deleteParty(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parties')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف الطرف بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting party:', error);
      toast.error('حدث خطأ أثناء حذف الطرف');
      return false;
    }
  }
  
  public async updatePartyBalance(
    partyId: string, 
    amount: number, 
    isDebit: boolean, 
    description: string,
    transactionType: string,
    transactionId: string
  ): Promise<boolean> {
    try {
      // Get current party balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('party_balances')
        .select('balance')
        .eq('party_id', partyId)
        .single();
      
      if (balanceError && balanceError.code !== 'PGRST116') {
        throw balanceError;
      }
      
      const currentBalance = balanceData?.balance || 0;
      const newBalance = isDebit ? currentBalance + amount : currentBalance - amount;
      
      // Update party balance
      const { error: updateError } = await supabase
        .from('party_balances')
        .upsert({
          party_id: partyId,
          balance: newBalance,
          last_updated: new Date().toISOString()
        });
      
      if (updateError) throw updateError;
      
      // Add to ledger
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          party_id: partyId,
          transaction_id: transactionId,
          transaction_type: transactionType,
          date: new Date().toISOString().split('T')[0],
          debit: isDebit ? amount : 0,
          credit: isDebit ? 0 : amount,
          balance_after: newBalance
        });
      
      if (ledgerError) throw ledgerError;
      
      return true;
    } catch (error) {
      console.error('Error updating party balance:', error);
      return false;
    }
  }
}

export default PartyService;
export type { Party } from "./CommercialTypes";
