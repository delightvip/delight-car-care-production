
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

class CashManagementService {
  private static instance: CashManagementService;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): CashManagementService {
    if (!CashManagementService.instance) {
      CashManagementService.instance = new CashManagementService();
    }
    return CashManagementService.instance;
  }

  // Deposit cash or bank amount
  public async deposit(account: 'cash' | 'bank', amount: number, notes: string): Promise<boolean> {
    try {
      // Get current balance
      const { data, error } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .single();

      if (error) throw error;

      // Update balance based on account type
      const updatedData = {
        ...(account === 'cash' && { cash_balance: data.cash_balance + amount }),
        ...(account === 'bank' && { bank_balance: data.bank_balance + amount }),
        last_updated: format(new Date(), 'yyyy-MM-dd')
      };

      // Update balance
      const { error: updateError } = await supabase
        .from('financial_balance')
        .update(updatedData)
        .eq('id', '1');

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from('financial_transactions')
        .insert({
          type: 'income',
          amount: amount,
          category_id: account === 'cash' ? 'c69949b5-2969-4984-9f99-93a377fca8ff' : 'd4439564-5a92-4e95-a889-19c449989181',
          payment_method: account,
          notes: notes || `إيداع في ${account === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`,
          date: format(new Date(), 'yyyy-MM-dd'),
          reference_type: 'cash_deposit'
        });

      if (transactionError) {
        console.error("Error creating transaction record:", transactionError);
      }

      toast.success(`تم إيداع ${amount} بنجاح في ${account === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`);
      return true;
    } catch (error) {
      console.error("Error in deposit:", error);
      toast.error('فشل في إيداع المبلغ');
      return false;
    }
  }

  // Withdraw cash or bank amount
  public async withdraw(account: 'cash' | 'bank', amount: number, notes: string): Promise<boolean> {
    try {
      // Get current balance
      const { data, error } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .single();

      if (error) throw error;

      // Check if withdrawal is possible
      const currentBalance = account === 'cash' ? data.cash_balance : data.bank_balance;
      if (currentBalance < amount) {
        toast.error(`الرصيد غير كافي في ${account === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`);
        return false;
      }

      // Update balance based on account type
      const updatedData = {
        ...(account === 'cash' && { cash_balance: data.cash_balance - amount }),
        ...(account === 'bank' && { bank_balance: data.bank_balance - amount }),
        last_updated: format(new Date(), 'yyyy-MM-dd')
      };

      // Update balance
      const { error: updateError } = await supabase
        .from('financial_balance')
        .update(updatedData)
        .eq('id', '1');

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from('financial_transactions')
        .insert({
          type: 'expense',
          amount: amount,
          category_id: account === 'cash' ? 'c69949b5-2969-4984-9f99-93a377fca8ff' : 'd4439564-5a92-4e95-a889-19c449989181',
          payment_method: account,
          notes: notes || `سحب من ${account === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`,
          date: format(new Date(), 'yyyy-MM-dd'),
          reference_type: 'cash_withdrawal'
        });

      if (transactionError) {
        console.error("Error creating transaction record:", transactionError);
      }

      toast.success(`تم سحب ${amount} بنجاح من ${account === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`);
      return true;
    } catch (error) {
      console.error("Error in withdrawal:", error);
      toast.error('فشل في سحب المبلغ');
      return false;
    }
  }

  // Transfer between accounts
  public async transfer(fromAccount: 'cash' | 'bank', toAccount: 'cash' | 'bank', amount: number, notes: string): Promise<boolean> {
    try {
      if (fromAccount === toAccount) {
        toast.error('لا يمكن التحويل إلى نفس الحساب');
        return false;
      }

      // Get current balance
      const { data, error } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .single();

      if (error) throw error;

      // Check if transfer is possible
      const fromBalance = fromAccount === 'cash' ? data.cash_balance : data.bank_balance;
      if (fromBalance < amount) {
        toast.error(`الرصيد غير كافي في ${fromAccount === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`);
        return false;
      }

      // Calculate new balances
      const newCashBalance = fromAccount === 'cash' 
        ? data.cash_balance - amount 
        : data.cash_balance + amount;
      
      const newBankBalance = fromAccount === 'bank' 
        ? data.bank_balance - amount 
        : data.bank_balance + amount;

      // Update balances
      const { error: updateError } = await supabase
        .from('financial_balance')
        .update({
          cash_balance: newCashBalance,
          bank_balance: newBankBalance,
          last_updated: format(new Date(), 'yyyy-MM-dd')
        })
        .eq('id', '1');

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from('financial_transactions')
        .insert({
          type: 'transfer',
          amount: amount,
          category_id: 'c69949b5-2969-4984-9f99-93a377fca8ff',
          payment_method: 'transfer',
          notes: notes || `تحويل من ${fromAccount === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'} إلى ${toAccount === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`,
          date: format(new Date(), 'yyyy-MM-dd'),
          reference_type: 'cash_transfer',
          from_account: fromAccount,
          to_account: toAccount
        });

      if (transactionError) {
        console.error("Error creating transaction record:", transactionError);
      }

      toast.success(`تم تحويل ${amount} بنجاح من ${fromAccount === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'} إلى ${toAccount === 'cash' ? 'الخزينة النقدية' : 'الحساب البنكي'}`);
      return true;
    } catch (error) {
      console.error("Error in transfer:", error);
      toast.error('فشل في تحويل المبلغ');
      return false;
    }
  }
}

export default CashManagementService;
