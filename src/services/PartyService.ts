import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'other';
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  balance_type?: 'debit' | 'credit';
  opening_balance?: number;
  notes?: string;
  created_at?: string;
  balance?: number;
}

interface PartyBalance {
  id: string;
  party_id: string;
  balance: number;
  last_updated: string;
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
  
  public async getParties(): Promise<Party[]> {
    try {
      const { data: parties, error } = await supabase
        .from('parties')
        .select(`
          *,
          party_balances (*)
        `)
        .order('name');
      
      if (error) throw error;
      
      return parties.map((party: any) => ({
        id: party.id,
        name: party.name,
        type: party.type,
        phone: party.phone || '',
        email: party.email || '',
        address: party.address || '',
        code: party.code || '',
        balance_type: party.balance_type || 'debit',
        opening_balance: party.opening_balance || 0,
        notes: party.notes || '',
        balance: party.party_balances ? party.party_balances[0]?.balance || 0 : 0,
        created_at: party.created_at
      })) as Party[];
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
        .select(`
          *,
          party_balances (*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        code: data.code || '',
        balance_type: data.balance_type || 'debit',
        opening_balance: data.opening_balance || 0,
        notes: data.notes || '',
        balance: data.party_balances ? data.party_balances[0]?.balance || 0 : 0,
        created_at: data.created_at
      } as Party;
    } catch (error) {
      console.error('Error fetching party:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الطرف');
      return null;
    }
  }
  
  public async createParty(partyData: Omit<Party, 'id' | 'balance' | 'created_at'>): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .insert({
          name: partyData.name,
          type: partyData.type,
          phone: partyData.phone,
          email: partyData.email,
          address: partyData.address,
          code: partyData.code,
          balance_type: partyData.balance_type || 'debit',
          opening_balance: partyData.opening_balance || 0,
          notes: partyData.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        balance: data.balance_type === 'debit' ? data.opening_balance : -data.opening_balance
      } as Party;
    } catch (error) {
      console.error('Error creating party:', error);
      toast.error('حدث خطأ أثناء إنشاء طرف جديد');
      return null;
    }
  }
  
  public async updateParty(id: string, partyData: Partial<Party>): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .update({
          name: partyData.name,
          type: partyData.type,
          phone: partyData.phone,
          email: partyData.email,
          address: partyData.address,
          code: partyData.code,
          notes: partyData.notes
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      const { data: balances, error: balanceError } = await supabase
        .from('party_balances')
        .select('*')
        .eq('party_id', id)
        .single();
      
      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('Error fetching party balance:', balanceError);
      }
      
      return {
        ...data,
        balance: balances ? balances.balance : 0
      } as Party;
    } catch (error) {
      console.error('Error updating party:', error);
      toast.error('حدث خطأ أثناء تحديث بيانات الطرف');
      return null;
    }
  }
  
  public async deleteParty(id: string): Promise<boolean> {
    try {
      const { count: invoiceCount, error: invoiceError } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', id);
      
      if (invoiceError) throw invoiceError;
      
      if ((invoiceCount || 0) > 0) {
        toast.error('لا يمكن حذف الطرف لوجود معاملات مرتبطة به');
        return false;
      }
      
      const { count: paymentCount, error: paymentError } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', id);
      
      if (paymentError) throw paymentError;
      
      if ((paymentCount || 0) > 0) {
        toast.error('لا يمكن حذف الطرف لوجود مدفوعات مرتبطة به');
        return false;
      }
      
      const { error: balanceError } = await supabase
        .from('party_balances')
        .delete()
        .eq('party_id', id);
      
      if (balanceError) throw balanceError;
      
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
  
  public async getSuppliersSimple(): Promise<{ id: string; name: string; balance: number }[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select(`
          id,
          name,
          party_balances (balance)
        `)
        .eq('type', 'supplier')
        .order('name');
      
      if (error) throw error;
      
      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        balance: item.party_balances[0]?.balance || 0
      }));
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
  }
  
  public async getCustomersSimple(): Promise<{ id: string; name: string; balance: number }[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select(`
          id,
          name,
          party_balances (balance)
        `)
        .eq('type', 'customer')
        .order('name');
      
      if (error) throw error;
      
      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        balance: item.party_balances[0]?.balance || 0
      }));
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  }
  
  public async getAllPartiesSimple(): Promise<{ id: string; name: string; type: string; code?: string; notes?: string }[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select(`
          id,
          name,
          type,
          code,
          notes
        `)
        .order('name');
      
      if (error) throw error;
      
      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        code: item.code || '',
        notes: item.notes || ''
      }));
    } catch (error) {
      console.error('Error fetching all parties:', error);
      return [];
    }
  }
  
  public async updatePartyBalance(partyId: string, amount: number, isDebit: boolean): Promise<boolean> {
    try {
      const { data: balances, error: fetchError } = await supabase
        .from('party_balances')
        .select('*')
        .eq('party_id', partyId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching party balance:', fetchError);
        return false;
      }
      
      const { data: party, error: partyError } = await supabase
        .from('parties')
        .select('type')
        .eq('id', partyId)
        .single();
      
      if (partyError) {
        console.error('Error fetching party type:', partyError);
        return false;
      }
      
      let currentBalance = balances?.balance || 0;
      
      let newBalance: number;
      if (isDebit) {
        newBalance = currentBalance + amount;
      } else {
        newBalance = currentBalance - amount;
      }
      
      const { error: updateError } = await supabase
        .from('party_balances')
        .update({
          balance: newBalance,
          last_updated: new Date().toISOString()
        })
        .eq('party_id', partyId);
      
      if (updateError) {
        console.error('Error updating party balance:', updateError);
        return false;
      }
      
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          party_id: partyId,
          transaction_type: isDebit ? 'debit' : 'credit',
          debit: isDebit ? amount : 0,
          credit: isDebit ? 0 : amount,
          balance_after: newBalance,
          date: new Date().toISOString(),
          transaction_id: `manual-${Date.now()}`
        });
      
      if (ledgerError) {
        console.error('Error recording ledger entry:', ledgerError);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating party balance:', error);
      return false;
    }
  }

  public async addParty(partyData: Omit<Party, 'id' | 'created_at'>): Promise<Party | null> {
    try {
      const { data, error } = await this.supabase
        .from('parties')
        .insert({
          name: partyData.name,
          type: partyData.type,
          code: partyData.code,
          phone: partyData.phone || null,
          email: partyData.email || null,
          address: partyData.address || null,
          balance_type: partyData.balance_type || 'debit',
          opening_balance: partyData.opening_balance || 0,
          notes: partyData.notes || null
        })
        .select('*')
        .single();
      
      if (error) throw error;
      
      await this.supabase
        .from('party_balances')
        .insert({
          party_id: data.id,
          balance: data.opening_balance || 0
        });

      return {
        id: data.id,
        name: data.name,
        type: data.type,
        code: data.code,
        phone: data.phone,
        email: data.email,
        address: data.address,
        balance_type: data.balance_type,
        opening_balance: data.opening_balance,
        notes: data.notes,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error adding party:', error);
      return null;
    }
  }

  public async getPartiesByType(type: string): Promise<Party[]> {
    try {
      const { data, error } = await this.supabase
        .from('parties')
        .select('*')
        .eq('type', type)
        .order('name');
      
      if (error) throw error;
      
      return data.map(party => ({
        id: party.id,
        name: party.name,
        type: party.type,
        code: party.code,
        phone: party.phone,
        email: party.email,
        address: party.address,
        balance_type: party.balance_type,
        opening_balance: party.opening_balance,
        notes: party.notes,
        created_at: party.created_at
      }));
    } catch (error) {
      console.error(`Error fetching parties of type ${type}:`, error);
      return [];
    }
  }
}

export default PartyService;
