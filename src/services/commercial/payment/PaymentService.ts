
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaymentEntity } from './PaymentEntity';

export class PaymentService {
  private static instance: PaymentService;
  
  private constructor() {
    // Initialization if needed
  }
  
  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }
  
  public async getPaymentsByPartyId(partyId: string) {
    try {
      return await PaymentEntity.fetchByPartyId(partyId);
    } catch (error) {
      console.error('Error fetching payments by party:', error);
      toast.error('حدث خطأ أثناء جلب المدفوعات');
      return [];
    }
  }
}

export default PaymentService;
