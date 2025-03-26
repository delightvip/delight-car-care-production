import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PartyService from './PartyService';
import ReturnService from './commercial/ReturnService';

class CommercialService {
  private static instance: CommercialService;
  private partyService: PartyService;
  private returnService: ReturnService;

  private constructor() {
    this.partyService = PartyService.getInstance();
    this.returnService = ReturnService.getInstance();
  }

  public static getInstance(): CommercialService {
    if (!CommercialService.instance) {
      CommercialService.instance = new CommercialService();
    }
    return CommercialService.instance;
  }

  public async getParties() {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الأطراف');
      return [];
    }
  }

  // Additional methods for commercial operations
}

export default CommercialService;
