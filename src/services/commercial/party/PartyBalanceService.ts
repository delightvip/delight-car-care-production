
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * خدمة إدارة أرصدة الأطراف التجارية
 */
export class PartyBalanceService {
  private static instance: PartyBalanceService;
  
  private constructor() {}
  
  public static getInstance(): PartyBalanceService {
    if (!PartyBalanceService.instance) {
      PartyBalanceService.instance = new PartyBalanceService();
    }
    return PartyBalanceService.instance;
  }
  
  /**
   * تحديث رصيد طرف تجاري
   * @param partyId معرف الطرف
   * @param amount المبلغ
   * @param isDebit هل هو مدين (true) أم دائن (false)
   * @param description وصف المعاملة
   * @param transactionType نوع المعاملة
   * @param reference مرجع المعاملة (معرف)
   */
  public async updatePartyBalance(
    partyId: string, 
    amount: number, 
    isDebit: boolean,
    description: string,
    transactionType: string,
    reference?: string
  ): Promise<boolean> {
    try {
      // الحصول على آخر رصيد للطرف
      const { data: lastEntries, error: lastEntryError } = await supabase
        .from('ledger')
        .select('balance_after')
        .eq('party_id', partyId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (lastEntryError) throw lastEntryError;
      
      // حساب الرصيد الجديد
      let balanceAfter = 0;
      if (lastEntries && lastEntries.length > 0) {
        balanceAfter = lastEntries[0].balance_after;
      }
      
      // تعديل الرصيد بناءً على المدين والدائن
      balanceAfter = balanceAfter + (isDebit ? amount : -amount);
      
      // تحديث رصيد الطرف
      const { error: balanceError } = await supabase
        .from('party_balances')
        .update({ balance: balanceAfter, last_updated: new Date().toISOString() })
        .eq('party_id', partyId);
      
      if (balanceError) throw balanceError;
      
      // إضافة قيد في سجل الحساب
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          party_id: partyId,
          date: new Date().toISOString().split('T')[0],
          transaction_type: transactionType,
          debit: isDebit ? amount : 0,
          credit: !isDebit ? amount : 0,
          balance_after: balanceAfter,
          transaction_id: reference || undefined
        });
      
      if (ledgerError) throw ledgerError;
      
      return true;
    } catch (error) {
      console.error('Error updating party balance:', error);
      toast.error('حدث خطأ أثناء تحديث رصيد الطرف التجاري');
      return false;
    }
  }
  
  /**
   * تحديث الرصيد الافتتاحي لطرف تجاري
   * @param partyId معرف الطرف
   * @param newOpeningBalance الرصيد الافتتاحي الجديد
   * @param balanceType نوع الرصيد
   */
  public async updateOpeningBalance(
    partyId: string, 
    newOpeningBalance: number, 
    balanceType: 'credit' | 'debit'
  ): Promise<boolean> {
    try {
      // الحصول على بيانات الطرف
      const { data: partyData, error: partyError } = await supabase
        .from('parties')
        .select(`
          opening_balance,
          balance_type,
          party_balances(balance)
        `)
        .eq('id', partyId)
        .single();
      
      if (partyError) throw partyError;
      
      if (!partyData) {
        throw new Error('الطرف التجاري غير موجود');
      }
      
      // حساب الفرق بين الرصيد القديم والجديد
      const oldOpeningValue = partyData.opening_balance * (partyData.balance_type === 'debit' ? 1 : -1);
      const newOpeningValue = newOpeningBalance * (balanceType === 'debit' ? 1 : -1);
      const balanceDifference = newOpeningValue - oldOpeningValue;
      
      // تحديث الرصيد الافتتاحي
      const { error } = await supabase
        .from('parties')
        .update({
          opening_balance: newOpeningBalance,
          balance_type: balanceType
        })
        .eq('id', partyId);
      
      if (error) throw error;
      
      // حساب الرصيد الجديد
      const currentBalance = partyData.party_balances[0]?.balance || 0;
      const newBalance = currentBalance + balanceDifference;
      
      // تحديث رصيد الطرف
      const { error: balanceError } = await supabase
        .from('party_balances')
        .update({ 
          balance: newBalance,
          last_updated: new Date().toISOString()
        })
        .eq('party_id', partyId);
      
      if (balanceError) throw balanceError;
      
      // إضافة قيد في سجل الحساب
      const { error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          party_id: partyId,
          date: new Date().toISOString().split('T')[0],
          transaction_type: 'opening_balance_update',
          debit: balanceDifference > 0 ? Math.abs(balanceDifference) : 0,
          credit: balanceDifference < 0 ? Math.abs(balanceDifference) : 0,
          balance_after: newBalance,
          transaction_id: undefined
        });
      
      if (ledgerError) throw ledgerError;
      
      toast.success('تم تحديث الرصيد الافتتاحي بنجاح');
      return true;
    } catch (error) {
      console.error('Error updating opening balance:', error);
      toast.error('حدث خطأ أثناء تحديث الرصيد الافتتاحي');
      return false;
    }
  }
}

export default PartyBalanceService;
