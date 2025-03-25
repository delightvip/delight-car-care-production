
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  opening_balance: number;
  balance_type?: 'credit' | 'debit';
  balance: number;
  created_at: string;
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
  
  // جلب جميع الأطراف التجارية
  public async getParties(): Promise<Party[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select(`
          *,
          party_balances(balance)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return data.map(party => ({
        id: party.id,
        name: party.name,
        type: party.type as 'customer' | 'supplier' | 'other',
        phone: party.phone || '',
        email: party.email || '',
        address: party.address || '',
        opening_balance: party.opening_balance || 0,
        balance_type: party.balance_type as 'credit' | 'debit',
        balance: party.party_balances[0]?.balance || 0,
        created_at: party.created_at
      }));
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('حدث خطأ أثناء جلب الأطراف التجارية');
      return [];
    }
  }
  
  // جلب الأطراف حسب النوع
  public async getPartiesByType(type: 'customer' | 'supplier' | 'other'): Promise<Party[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select(`
          *,
          party_balances(balance)
        `)
        .eq('type', type)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return data.map(party => ({
        id: party.id,
        name: party.name,
        type: party.type as 'customer' | 'supplier' | 'other',
        phone: party.phone || '',
        email: party.email || '',
        address: party.address || '',
        opening_balance: party.opening_balance || 0,
        balance_type: party.balance_type as 'credit' | 'debit',
        balance: party.party_balances[0]?.balance || 0,
        created_at: party.created_at
      }));
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      toast.error(`حدث خطأ أثناء جلب ${type === 'customer' ? 'العملاء' : type === 'supplier' ? 'الموردين' : 'الأطراف الأخرى'}`);
      return [];
    }
  }
  
  // إضافة طرف تجاري جديد
  public async addParty(party: Omit<Party, 'id' | 'balance' | 'created_at'>): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .insert({
          name: party.name,
          type: party.type as 'customer' | 'supplier' | 'other',
          phone: party.phone,
          email: party.email,
          address: party.address,
          opening_balance: party.opening_balance || 0,
          balance_type: party.balance_type || 'debit'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`تم إضافة ${party.name} بنجاح`);
      
      // الحصول على البيانات المحدثة بما في ذلك رصيد الطرف
      const { data: partyWithBalance, error: balanceError } = await supabase
        .from('parties')
        .select(`
          *,
          party_balances(balance)
        `)
        .eq('id', data.id)
        .single();
      
      if (balanceError) throw balanceError;
      
      return {
        id: partyWithBalance.id,
        name: partyWithBalance.name,
        type: partyWithBalance.type as 'customer' | 'supplier' | 'other',
        phone: partyWithBalance.phone || '',
        email: partyWithBalance.email || '',
        address: partyWithBalance.address || '',
        opening_balance: partyWithBalance.opening_balance || 0,
        balance_type: partyWithBalance.balance_type as 'credit' | 'debit',
        balance: partyWithBalance.party_balances[0]?.balance || 0,
        created_at: partyWithBalance.created_at
      };
    } catch (error) {
      console.error('Error adding party:', error);
      toast.error('حدث خطأ أثناء إضافة الطرف التجاري');
      return null;
    }
  }
  
  // تحديث طرف تجاري
  public async updateParty(id: string, partyData: Partial<Omit<Party, 'id' | 'created_at' | 'balance'>>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parties')
        .update(partyData)
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث بيانات الطرف التجاري بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating party:', error);
      toast.error('حدث خطأ أثناء تحديث بيانات الطرف التجاري');
      return false;
    }
  }
  
  // حذف طرف تجاري
  public async deleteParty(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parties')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف الطرف التجاري بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting party:', error);
      toast.error('حدث خطأ أثناء حذف الطرف التجاري');
      return false;
    }
  }
  
  // جلب الحركات المالية للطرف التجاري
  public async getPartyTransactions(partyId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching party transactions:', error);
      toast.error('حدث خطأ أثناء جلب الحركات المالية');
      return [];
    }
  }
}

export default PartyService;
