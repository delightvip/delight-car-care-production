import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

class FinancialService {
  private static instance: FinancialService;

  private constructor() {}

  public static getInstance(): FinancialService {
    if (!FinancialService.instance) {
      FinancialService.instance = new FinancialService();
    }
    return FinancialService.instance;
  }

  public async getFinancialAccounts(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("*");

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching financial accounts:", error);
      toast.error("Failed to fetch financial accounts.");
      return [];
    }
  }

  public async getFinancialAccountById(id: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error fetching financial account by ID:", error);
      toast.error("Failed to fetch financial account.");
      return null;
    }
  }

  public async createFinancialAccount(
    name: string,
    type: "cash" | "bank",
    currency: string,
    initial_balance: number
  ): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from("financial_accounts")
        .insert([
          {
            name,
            type,
            currency,
            initial_balance,
            current_balance: initial_balance,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success("Financial account created successfully!");
      return data;
    } catch (error) {
      console.error("Error creating financial account:", error);
      toast.error("Failed to create financial account.");
      return null;
    }
  }

  public async updateFinancialAccount(
    id: string,
    name: string,
    type: "cash" | "bank",
    currency: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("financial_accounts")
        .update({ name, type, currency })
        .eq("id", id);

      if (error) {
        throw error;
      }

      toast.success("Financial account updated successfully!");
      return true;
    } catch (error) {
      console.error("Error updating financial account:", error);
      toast.error("Failed to update financial account.");
      return false;
    }
  }

  public async deleteFinancialAccount(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("financial_accounts")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      toast.success("Financial account deleted successfully!");
      return true;
    } catch (error) {
      console.error("Error deleting financial account:", error);
      toast.error("Failed to delete financial account.");
      return false;
    }
  }

  public async getFinancialTransactions(
    accountId: string
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("account_id", accountId)
        .order("date", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching financial transactions:", error);
      toast.error("Failed to fetch financial transactions.");
      return [];
    }
  }

  public async recordFinancialTransaction(
    accountId: string,
    type: "income" | "expense",
    amount: number,
    date: string,
    description: string,
    payment_method: "cash" | "bank"
  ): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from("financial_transactions")
        .insert([
          {
            account_id: accountId,
            type,
            amount,
            date,
            description,
            payment_method,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update the financial balance
      const isIncrease = type === "income";
      await this.updateFinancialBalance(amount, isIncrease, payment_method);

      toast.success("Financial transaction recorded successfully!");
      return data;
    } catch (error) {
      console.error("Error recording financial transaction:", error);
      toast.error("Failed to record financial transaction.");
      return null;
    }
  }

  public async updateFinancialBalance(
    amount: number,
    isIncrease: boolean,
    payment_method: "cash" | "bank"
  ): Promise<boolean> {
    try {
      // Get the financial account
      const accounts = await this.getFinancialAccounts();
      const account = accounts.find(
        (acc) => acc.type === payment_method
      );

      if (!account) {
        console.error(
          `No financial account found for payment method: ${payment_method}`
        );
        toast.error(
          `No financial account found for payment method: ${payment_method}`
        );
        return false;
      }

      const accountId = account.id;

      // Get the current balance
      const { data: currentBalanceData, error: balanceError } = await supabase
        .from("financial_accounts")
        .select("current_balance")
        .eq("id", accountId)
        .single();

      if (balanceError) {
        throw balanceError;
      }

      const currentBalance = currentBalanceData
        ? currentBalanceData.current_balance
        : 0;
      const newBalance = isIncrease
        ? currentBalance + amount
        : currentBalance - amount;

      // Update the balance
      const { error: updateError } = await supabase
        .from("financial_accounts")
        .update({ current_balance: newBalance })
        .eq("id", accountId);

      if (updateError) {
        throw updateError;
      }

      toast.success("Financial balance updated successfully!");
      return true;
    } catch (error) {
      console.error("Error updating financial balance:", error);
      toast.error("Failed to update financial balance.");
      return false;
    }
  }
}

export default FinancialService;
