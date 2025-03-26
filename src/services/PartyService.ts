
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Add the Party export interface
export interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  balance: number; // Add balance property
  opening_balance: number;
  balance_type: 'debit' | 'credit';
  created_at?: string;
  code?: string; // Add code property
  notes?: string; // Add notes property
}

class PartyService {
  private static instance: PartyService;

  private constructor() {}

  public static getInstance(): PartyService {
    if (!PartyService.instance) {
      PartyService.instance = new PartyService();
    }
    return PartyService.instance;
  }

  // Add the missing methods
  async getParties(): Promise<Party[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*, party_balances(balance)')
        .order('name');

      if (error) throw error;
      
      return (data || []).map(party => ({
        ...party,
        balance: party.party_balances?.[0]?.balance || 0,
        type: party.type as 'customer' | 'supplier' | 'other',
        balance_type: party.balance_type as 'debit' | 'credit',
        code: party.code || '',
        notes: party.notes || ''
      }));
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الأطراف');
      return [];
    }
  }

  async getPartiesByType(type: 'customer' | 'supplier' | 'other'): Promise<Party[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*, party_balances(balance)')
        .eq('type', type)
        .order('name');

      if (error) throw error;
      
      return (data || []).map(party => ({
        ...party,
        balance: party.party_balances?.[0]?.balance || 0,
        type: party.type as 'customer' | 'supplier' | 'other',
        balance_type: party.balance_type as 'debit' | 'credit',
        code: party.code || '',
        notes: party.notes || ''
      }));
    } catch (error) {
      console.error(`Error fetching parties of type ${type}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات الأطراف');
      return [];
    }
  }

  async addParty(partyData: Omit<Party, 'id' | 'balance' | 'created_at'>): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .insert(partyData)
        .select('*, party_balances(balance)')
        .single();

      if (error) throw error;
      
      toast.success('تم إضافة الطرف بنجاح');
      
      return {
        ...data,
        balance: data.party_balances?.[0]?.balance || 0,
        type: data.type as 'customer' | 'supplier' | 'other',
        balance_type: data.balance_type as 'debit' | 'credit',
        code: data.code || '',
        notes: data.notes || ''
      };
    } catch (error) {
      console.error('Error adding party:', error);
      toast.error('حدث خطأ أثناء إضافة الطرف');
      return null;
    }
  }

  async updateParty(id: string, partyData: Partial<Party>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parties')
        .update(partyData)
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

  async deleteParty(id: string): Promise<boolean> {
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

  async getPartyById(id: string): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*, party_balances(balance)')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        balance: data.party_balances?.[0]?.balance || 0,
        type: data.type as 'customer' | 'supplier' | 'other',
        balance_type: data.balance_type as 'debit' | 'credit',
        code: data.code || '',
        notes: data.notes || ''
      };
    } catch (error) {
      console.error(`Error fetching party with id ${id}:`, error);
      return null;
    }
  }

  async updatePartyBalance(
    partyId: string,
    amount: number,
    isDebit: boolean,
    reason: string,
    transactionType: string,
    transactionId: string
  ) {
    try {
      // For now, just return true as a placeholder
      return true;
    } catch (error) {
      console.error('Error updating party balance:', error);
      return false;
    }
  }
}

export default PartyService;
