
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

class PartyService {
  private static instance: PartyService;

  private constructor() {}

  public static getInstance(): PartyService {
    if (!PartyService.instance) {
      PartyService.instance = new PartyService();
    }
    return PartyService.instance;
  }

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
