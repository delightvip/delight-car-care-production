
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import PartyService from '../PartyService';
import InventoryService from '../InventoryService';

class BaseCommercialService {
  protected supabase: SupabaseClient;
  protected partyService: PartyService;
  protected inventoryService: InventoryService;

  constructor() {
    this.supabase = supabase;
    this.partyService = PartyService.getInstance();
    this.inventoryService = InventoryService.getInstance();
  }
  
  protected getTransactionDescription(transaction_type: string): string {
    const descriptions: { [key: string]: string } = {
      'sale_invoice': 'فاتورة مبيعات',
      'purchase_invoice': 'فاتورة مشتريات',
      'payment_received': 'دفعة مستلمة',
      'payment_made': 'دفعة مدفوعة',
      'sales_return': 'مرتجع مبيعات',
      'purchase_return': 'مرتجع مشتريات',
      'opening_balance': 'رصيد افتتاحي',
      'cancel_sale_invoice': 'إلغاء فاتورة مبيعات',
      'cancel_purchase_invoice': 'إلغاء فاتورة مشتريات',
      'cancel_payment_received': 'إلغاء دفعة مستلمة',
      'cancel_payment_made': 'إلغاء دفعة مدفوعة',
      'cancel_sales_return': 'إلغاء مرتجع مبيعات',
      'cancel_purchase_return': 'إلغاء مرتجع مشتريات',
      'invoice_amount_adjustment': 'تعديل قيمة فاتورة',
      'opening_balance_update': 'تعديل الرصيد الافتتاحي'
    };
    
    return descriptions[transaction_type] || transaction_type;
  }
}

export default BaseCommercialService;
