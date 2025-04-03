
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Transaction {
  date: string;
  account_id?: string;
  type: string;
  amount: number;
  description: string;
  reference_id: string;
  reference_type: string;
}

class FinancialService {
  private static instance: FinancialService;

  private constructor() {}

  public static getInstance(): FinancialService {
    if (!FinancialService.instance) {
      FinancialService.instance = new FinancialService();
    }
    return FinancialService.instance;
  }

  /**
   * Record a financial transaction
   */
  async recordTransaction(transactionData: Transaction): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .insert({
          date: transactionData.date,
          category_id: transactionData.account_id || '00000000-0000-0000-0000-000000000000',
          type: transactionData.type,
          amount: transactionData.amount,
          payment_method: 'cash', // Default value
          reference_id: transactionData.reference_id,
          reference_type: transactionData.reference_type,
          notes: transactionData.description
        });

      if (error) throw error;
      
      // Update financial balance
      await this.updateFinancialBalance(transactionData.amount, transactionData.type);
      
      return true;
    } catch (error) {
      console.error('Error recording financial transaction:', error);
      toast.error('حدث خطأ أثناء تسجيل المعاملة المالية');
      return false;
    }
  }
  
  /**
   * Update financial balance
   */
  private async updateFinancialBalance(amount: number, transactionType: string): Promise<boolean> {
    try {
      const { data: balance, error: fetchError } = await supabase
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .single();
      
      if (fetchError) throw fetchError;
      
      let newCashBalance = balance?.cash_balance || 0;
      
      // Update cash balance based on transaction type
      if (transactionType === 'receipt' || transactionType === 'sales_return') {
        newCashBalance += amount;
      } else if (transactionType === 'payment' || transactionType === 'purchase_return') {
        newCashBalance -= amount;
      } else if (transactionType === 'receipt_cancellation') {
        newCashBalance -= Math.abs(amount);
      } else if (transactionType === 'payment_cancellation') {
        newCashBalance += Math.abs(amount);
      }
      
      const { error: updateError } = await supabase
        .from('financial_balance')
        .update({ 
          cash_balance: newCashBalance,
          last_updated: new Date().toISOString()
        })
        .eq('id', '1');
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error('Error updating financial balance:', error);
      return false;
    }
  }
}

export default FinancialService;
