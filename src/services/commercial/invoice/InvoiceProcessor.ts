import { supabase } from '@/integrations/supabase/client';
import InventoryService from '@/services/InventoryService';
import FinancialService from '@/services/financial/FinancialService';

class InvoiceProcessor {
  private supabase;
  private inventoryService;
  private financialService;

  constructor() {
    this.supabase = supabase;
    this.inventoryService = InventoryService;
    this.financialService = FinancialService.getInstance();
  }
}

export default InvoiceProcessor;
