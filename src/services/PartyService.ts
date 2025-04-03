
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Party {
  id: string;
  name: string;
  type: "customer" | "supplier" | "other";
  phone?: string;
  email?: string;
  address?: string;
  opening_balance?: number;
  balance_type?: string;
  balance?: number;
  notes?: string;
  created_at?: string;
  code?: string;
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
   * Get all parties
   */
  async getParties(): Promise<Party[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // Get balances for each party
      const partiesWithBalance = await Promise.all(
        data.map(async (party) => {
          const { data: balanceData, error: balanceError } = await supabase
            .from('party_balances')
            .select('balance')
            .eq('party_id', party.id)
            .maybeSingle();

          if (balanceError) {
            console.error('Error fetching balance for party', party.id, balanceError);
            return {
              ...party,
              balance: 0,
              // Ensure type is cast to the correct union type
              type: party.type as "customer" | "supplier" | "other"
            };
          }

          return {
            ...party,
            balance: balanceData?.balance || 0,
            // Ensure type is cast to the correct union type
            type: party.type as "customer" | "supplier" | "other"
          };
        })
      );

      return partiesWithBalance;
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('حدث خطأ أثناء جلب الأطراف التجارية');
      return [];
    }
  }

  /**
   * Get parties by type
   */
  async getPartiesByType(type: 'customer' | 'supplier' | 'other'): Promise<Party[]> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('type', type)
        .order('name', { ascending: true });

      if (error) throw error;

      // Get balances for each party
      const partiesWithBalance = await Promise.all(
        data.map(async (party) => {
          const { data: balanceData, error: balanceError } = await supabase
            .from('party_balances')
            .select('balance')
            .eq('party_id', party.id)
            .maybeSingle();

          if (balanceError) {
            console.error('Error fetching balance for party', party.id, balanceError);
            return { 
              ...party, 
              balance: 0,
              // Add these properties to match Party interface
              notes: party.notes || "",
              code: party.code || "",
              // Ensure type is cast to the correct union type
              type: party.type as "customer" | "supplier" | "other"
            };
          }

          return { 
            ...party, 
            balance: balanceData?.balance || 0,
            // Add these properties to match Party interface
            notes: party.notes || "",
            code: party.code || "",
            // Ensure type is cast to the correct union type
            type: party.type as "customer" | "supplier" | "other"
          };
        })
      );

      return partiesWithBalance;
    } catch (error) {
      console.error(`Error fetching ${type} parties:`, error);
      toast.error(`حدث خطأ أثناء جلب ${type === 'customer' ? 'العملاء' : type === 'supplier' ? 'الموردين' : 'الأطراف التجارية'}`);
      return [];
    }
  }

  /**
   * Get a party by ID
   */
  async getPartyById(id: string): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get balance for the party
      const { data: balanceData, error: balanceError } = await supabase
        .from('party_balances')
        .select('balance')
        .eq('party_id', id)
        .maybeSingle();

      if (balanceError) {
        console.error('Error fetching balance for party', id, balanceError);
        return { 
          ...data, 
          balance: 0,
          // Ensure type is cast to the correct union type
          type: data.type as "customer" | "supplier" | "other"
        };
      }

      return { 
        ...data, 
        balance: balanceData?.balance || 0,
        // Ensure type is cast to the correct union type
        type: data.type as "customer" | "supplier" | "other"
      };
    } catch (error) {
      console.error('Error fetching party:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الطرف التجاري');
      return null;
    }
  }

  /**
   * Update a party's balance
   */
  async updatePartyBalance(partyId: string, amount: number, isDebit: boolean): Promise<boolean> {
    try {
      // Get current balance
      const { data: balanceData, error: fetchError } = await supabase
        .from('party_balances')
        .select('balance')
        .eq('party_id', partyId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let currentBalance = balanceData?.balance || 0;
      let newBalance = isDebit ? currentBalance + amount : currentBalance - amount;

      const { error: updateError } = await supabase
        .from('party_balances')
        .upsert({
          party_id: partyId,
          balance: newBalance,
          last_updated: new Date().toISOString()
        });

      if (updateError) throw updateError;

      return true;
    } catch (error) {
      console.error('Error updating party balance:', error);
      toast.error('حدث خطأ أثناء تحديث رصيد الطرف التجاري');
      return false;
    }
  }

  /**
   * Add a new party
   */
  async addParty(party: Omit<Party, 'id' | 'created_at'>): Promise<Party | null> {
    try {
      const { data, error } = await supabase
        .from('parties')
        .insert({
          name: party.name,
          type: party.type,
          phone: party.phone || null,
          email: party.email || null,
          address: party.address || null,
          opening_balance: party.opening_balance || 0,
          balance_type: party.balance_type || null
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize party balance
      if (party.opening_balance && party.opening_balance !== 0) {
        await this.updatePartyBalance(data.id, party.opening_balance, true);
      }

      return { 
        ...data, 
        balance: party.opening_balance || 0,
        // Ensure type is cast to the correct union type
        type: data.type as "customer" | "supplier" | "other"
      };
    } catch (error) {
      console.error('Error adding party:', error);
      toast.error('حدث خطأ أثناء إضافة الطرف التجاري');
      return null;
    }
  }

  /**
   * Update a party
   */
  async updateParty(id: string, updates: Partial<Party>): Promise<Party | null> {
    try {
      // Extract fields relevant for parties table
      const partyUpdates = {
        name: updates.name,
        type: updates.type,
        phone: updates.phone,
        email: updates.email,
        address: updates.address,
        opening_balance: updates.opening_balance,
        balance_type: updates.balance_type
      };

      const { data, error } = await supabase
        .from('parties')
        .update(partyUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If balance needs updating, update it separately
      if (updates.balance !== undefined) {
        await this.updatePartyBalance(id, updates.balance, true);
      }

      return {
        ...data,
        balance: updates.balance,
        // Ensure type is cast to the correct union type
        type: data.type as "customer" | "supplier" | "other"
      };
    } catch (error) {
      console.error('Error updating party:', error);
      toast.error('حدث خطأ أثناء تحديث بيانات الطرف التجاري');
      return null;
    }
  }

  /**
   * Delete a party
   */
  async deleteParty(id: string): Promise<boolean> {
    try {
      // Delete party balance first
      await supabase
        .from('party_balances')
        .delete()
        .eq('party_id', id);
      
      // Then delete the party
      const { error } = await supabase
        .from('parties')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting party:', error);
      toast.error('حدث خطأ أثناء حذف الطرف التجاري');
      return false;
    }
  }
}

export default PartyService;
