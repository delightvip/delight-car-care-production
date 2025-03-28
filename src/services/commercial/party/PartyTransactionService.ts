
import { supabase } from '@/integrations/supabase/client';
import { Transaction, LedgerEntry } from './PartyTypes';
import { toast } from 'sonner';

/**
 * خدمة إدارة معاملات الأطراف التجارية
 */
export class PartyTransactionService {
  private static instance: PartyTransactionService;
  
  private constructor() {}
  
  public static getInstance(): PartyTransactionService {
    if (!PartyTransactionService.instance) {
      PartyTransactionService.instance = new PartyTransactionService();
    }
    return PartyTransactionService.instance;
  }
  
  /**
   * الحصول على معاملات طرف تجاري
   * @param partyId معرف الطرف
   */
  public async getPartyTransactions(partyId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(item => ({
        id: item.id,
        party_id: item.party_id,
        transaction_date: item.date,
        type: item.transaction_type,
        description: item.transaction_type || '', // Use transaction_type if no description
        reference: item.transaction_id,
        debit: item.debit || 0,
        credit: item.credit || 0,
        balance: item.balance_after,
        created_at: item.created_at,
        transaction_type: item.transaction_type,
        transaction_id: item.transaction_id
      }));
    } catch (error) {
      console.error('Error fetching party transactions:', error);
      toast.error('حدث خطأ أثناء جلب الحركات المالية');
      return [];
    }
  }
  
  /**
   * الحصول على قيود سجل الحساب
   * @param partyId معرف الطرف
   */
  public async getLedgerEntries(partyId: string): Promise<LedgerEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .select('*')
        .eq('party_id', partyId)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      const ledgerEntries = data.map(entry => ({
        id: entry.id,
        party_id: entry.party_id,
        transaction_id: entry.transaction_id,
        transaction_type: entry.transaction_type,
        date: entry.date,
        debit: entry.debit,
        credit: entry.credit,
        balance_after: entry.balance_after,
        created_at: entry.created_at,
        description: this.getTransactionDescription(entry.transaction_type),
        // Since 'notes' doesn't exist in the database response, we'll set it as an empty string
        notes: ''
      }));
      
      return ledgerEntries;
    } catch (error) {
      console.error('Error fetching party ledger:', error);
      toast.error('فشل في جلب سجل الحساب');
      return [];
    }
  }
  
  /**
   * الحصول على وصف نوع المعاملة
   * @param transaction_type نوع المعاملة
   */
  public getTransactionDescription(transaction_type: string): string {
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
      'cancel_purchase_return': 'إلغاء مرتجع مشتريات'
    };
    
    return descriptions[transaction_type] || transaction_type;
  }
}

export default PartyTransactionService;
