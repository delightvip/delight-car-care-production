
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define the Party interface
interface Party {
  id: string;
  name: string;
  type: string;
  phone?: string;
  email?: string;
  address?: string;
  balance_type?: string;
  opening_balance?: number;
  created_at?: string;
  code?: string;
  notes?: string;
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

  // Get all parties
  public async getParties(): Promise<Party[]> {
    try {
      let { data, error } = await supabase
        .from('parties')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return data.map(party => ({
        id: party.id,
        name: party.name,
        type: party.type,
        phone: party.phone || '',
        email: party.email || '',
        address: party.address || '',
        balance_type: party.balance_type || 'debit',
        opening_balance: party.opening_balance || 0,
        created_at: party.created_at,
        code: party.code || '',
        notes: party.notes || ''
      }));
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('حدث خطأ أثناء جلب الأطراف');
      return [];
    }
  }

  // Get a party by ID
  public async getPartyById(id: string): Promise<Party | null> {
    try {
      let { data, error } = await supabase
        .from('parties')
        .select(`
          *,
          party_balances(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        type: data.type,
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        balance_type: data.balance_type || 'debit',
        opening_balance: data.opening_balance || 0,
        created_at: data.created_at,
        code: data.code || '',
        notes: data.notes || ''
      };
    } catch (error) {
      console.error(`Error fetching party ${id}:`, error);
      toast.error('حدث خطأ أثناء جلب بيانات الطرف');
      return null;
    }
  }

  // Add a new party
  public async addParty(partyData: Omit<Party, 'id' | 'created_at'>): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .insert({
          name: partyData.name,
          type: partyData.type,
          phone: partyData.phone,
          email: partyData.email,
          address: partyData.address,
          balance_type: partyData.balance_type || 'debit',
          opening_balance: partyData.opening_balance || 0,
          code: partyData.code || '',
          notes: partyData.notes || ''
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('تم إضافة طرف جديد بنجاح');
      return data;
    } catch (error) {
      console.error('Error adding party:', error);
      toast.error('حدث خطأ أثناء إضافة طرف جديد');
      return null;
    }
  }

  // Update a party
  public async updateParty(id: string, partyData: Partial<Party>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('parties')
        .update({
          name: partyData.name,
          type: partyData.type,
          phone: partyData.phone,
          email: partyData.email,
          address: partyData.address,
          balance_type: partyData.balance_type,
          opening_balance: partyData.opening_balance,
          code: partyData.code || '',
          notes: partyData.notes || ''
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast.success('تم تحديث بيانات الطرف بنجاح');
      return true;
    } catch (error) {
      console.error(`Error updating party ${id}:`, error);
      toast.error('حدث خطأ أثناء تحديث بيانات الطرف');
      return false;
    }
  }

  // Delete a party
  public async deleteParty(id: string): Promise<boolean> {
    try {
      // Check if party has any related records
      const { count: invoiceCount, error: invoiceError } = await supabase
        .from('invoices')
        .select('id', { count: 'exact' })
        .eq('party_id', id);

      if (invoiceError) {
        throw invoiceError;
      }

      const { count: paymentCount, error: paymentError } = await supabase
        .from('payments')
        .select('id', { count: 'exact' })
        .eq('party_id', id);

      if (paymentError) {
        throw paymentError;
      }

      if ((invoiceCount || 0) > 0 || (paymentCount || 0) > 0) {
        toast.error('لا يمكن حذف هذا الطرف لأنه مرتبط بفواتير أو مدفوعات');
        return false;
      }

      // Delete party balance first
      const { error: balanceError } = await supabase
        .from('party_balances')
        .delete()
        .eq('party_id', id);

      if (balanceError) {
        throw balanceError;
      }

      // Then delete the party
      const { error } = await supabase
        .from('parties')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast.success('تم حذف الطرف بنجاح');
      return true;
    } catch (error) {
      console.error(`Error deleting party ${id}:`, error);
      toast.error('حدث خطأ أثناء حذف الطرف');
      return false;
    }
  }

  // Get parties by type
  public async getPartiesByType(type: string): Promise<Party[]> {
    try {
      let { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('type', type)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return data.map(party => ({
        id: party.id,
        name: party.name,
        type: party.type,
        phone: party.phone || '',
        email: party.email || '',
        address: party.address || '',
        balance_type: party.balance_type || 'debit',
        opening_balance: party.opening_balance || 0,
        created_at: party.created_at,
        code: party.code || '',
        notes: party.notes || ''
      }));
    } catch (error) {
      console.error(`Error fetching parties of type ${type}:`, error);
      toast.error('حدث خطأ أثناء جلب الأطراف');
      return [];
    }
  }

  // Update party balance
  public async updatePartyBalance(partyId: string, amount: number, isDebit: boolean): Promise<boolean> {
    try {
      // Get current balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('party_balances')
        .select('balance')
        .eq('party_id', partyId)
        .single();

      if (balanceError) {
        console.error('Error fetching party balance:', balanceError);
        return false;
      }

      const currentBalance = balanceData ? balanceData.balance : 0;
      
      // Update balance based on debit/credit
      const newBalance = isDebit
        ? currentBalance + amount  // Add to balance if debit
        : currentBalance - amount; // Subtract from balance if credit

      // Update the balance in the database
      const { error: updateError } = await supabase
        .from('party_balances')
        .update({ balance: newBalance, last_updated: new Date() })
        .eq('party_id', partyId);

      if (updateError) {
        console.error('Error updating party balance:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error updating party balance for ${partyId}:`, error);
      return false;
    }
  }
}

export default PartyService;
