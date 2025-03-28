import { supabase } from '@/integrations/supabase/client';
import { Party, Transaction } from './PartyTypes';
import { toast } from "sonner";

/**
 * طبقة الوصول إلى بيانات الأطراف التجارية
 */
export class PartyDataAccess {
  /**
   * الحصول على جميع الأطراف التجارية
   */
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
        created_at: party.created_at,
        notes: party.notes || '',
        code: party.code || ''
      }));
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('حدث خطأ أثناء جلب الأطراف التجارية');
      return [];
    }
  }

  /**
   * الحصول على طرف تجاري محدد
   */
  public async getPartyById(id: string): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select(`
          *,
          party_balances(balance)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        type: data.type as 'customer' | 'supplier' | 'other',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        opening_balance: data.opening_balance || 0,
        balance_type: data.balance_type as 'credit' | 'debit',
        balance: data.party_balances[0]?.balance || 0,
        created_at: data.created_at,
        notes: data.notes || '',
        code: data.code || ''
      };
    } catch (error) {
      console.error(`Error fetching party with id ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات الطرف التجاري');
      return null;
    }
  }
  
  /**
   * الحصول على الأطراف حسب النوع
   */
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
        created_at: party.created_at,
        notes: party.notes || '',
        code: party.code || ''
      }));
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      toast.error(`حدث خطأ أثناء جلب ${type === 'customer' ? 'العملاء' : type === 'supplier' ? 'الموردين' : 'الأطراف الأخرى'}`);
      return [];
    }
  }

  /**
   * إضافة طرف تجاري جديد
   */
  public async addParty(party: Omit<Party, 'id' | 'balance' | 'created_at'>): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .insert({
          name: party.name,
          type: party.type,
          phone: party.phone,
          email: party.email,
          address: party.address,
          opening_balance: party.opening_balance || 0,
          balance_type: party.balance_type || 'debit',
          notes: party.notes,
          code: party.code
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`تم إضافة ${party.name} بنجاح`);
      
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
        created_at: partyWithBalance.created_at,
        notes: partyWithBalance.notes || '',
        code: partyWithBalance.code || ''
      };
    } catch (error) {
      console.error('Error adding party:', error);
      toast.error('حدث خطأ أثناء إضافة الطرف التجاري');
      return null;
    }
  }
  
  /**
   * تحديث بيانات طرف تجاري
   */
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
  
  /**
   * حذف طرف تجاري
   */
  public async deleteParty(id: string): Promise<boolean> {
    try {
      const { count: invoiceCount, error: invoiceError } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('party_id', id);
        
      if (invoiceError) throw invoiceError;
      
      if (invoiceCount && invoiceCount > 0) {
        toast.error('لا يمكن حذف هذا الطرف لوجود فواتير مرتبطة به');
        return false;
      }
      
      const { count: paymentCount, error: paymentError } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('party_id', id);
        
      if (paymentError) throw paymentError;
      
      if (paymentCount && paymentCount > 0) {
        toast.error('لا يمكن حذف هذا الطرف لوجود مدفوعات مرتبطة به');
        return false;
      }
      
      const { error: balanceError } = await supabase
        .from('party_balances')
        .delete()
        .eq('party_id', id);
      
      if (balanceError) throw balanceError;
      
      const { error: ledgerError } = await supabase
        .from('ledger')
        .delete()
        .eq('party_id', id);
      
      if (ledgerError) throw ledgerError;
      
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
}

export default PartyDataAccess;
