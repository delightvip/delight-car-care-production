import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

class FinancialService {
  private static instance: FinancialService;

  private constructor() { }

  public static getInstance(): FinancialService {
    if (!FinancialService.instance) {
      FinancialService.instance = new FinancialService();
    }
    return FinancialService.instance;
  }

  async getExpenseCategories() {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error("Error fetching expense categories:", error);
        toast.error("Failed to load expense categories.");
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Unexpected error fetching expense categories:", error);
      toast.error("Failed to load expense categories due to an unexpected error.");
      return [];
    }
  }

  async addExpenseCategory(name: string) {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([{ name }])
        .select()
        .single();

      if (error) {
        console.error("Error adding expense category:", error);
        toast.error("Failed to add expense category.");
        return null;
      }

      toast.success("Expense category added successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error adding expense category:", error);
      toast.error("Failed to add expense category due to an unexpected error.");
      return null;
    }
  }

  async updateExpenseCategory(id: string, name: string) {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating expense category:", error);
        toast.error("Failed to update expense category.");
        return null;
      }

      toast.success("Expense category updated successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error updating expense category:", error);
      toast.error("Failed to update expense category due to an unexpected error.");
      return null;
    }
  }

  async deleteExpenseCategory(id: string) {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting expense category:", error);
        toast.error("Failed to delete expense category.");
        return false;
      }

      toast.success("Expense category deleted successfully!");
      return true;
    } catch (error) {
      console.error("Unexpected error deleting expense category:", error);
      toast.error("Failed to delete expense category due to an unexpected error.");
      return false;
    }
  }

  async getTransactions(startDate?: string, endDate?: string) {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          expense_category (
            name
          )
        `)
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching transactions:", error);
        toast.error("Failed to load transactions.");
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Unexpected error fetching transactions:", error);
      toast.error("Failed to load transactions due to an unexpected error.");
      return [];
    }
  }

  async recordTransaction(
    method: 'cash' | 'bank',
    amount: number,
    type: 'income' | 'expense',
    categoryId: string | null,
    date: string,
    notes: string = ''
  ) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method,
          amount,
          type,
          expense_category_id: categoryId,
          date,
          notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error recording transaction:", error);
        toast.error("Failed to record transaction.");
        return null;
      }

      toast.success("Transaction recorded successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error recording transaction:", error);
      toast.error("Failed to record transaction due to an unexpected error.");
      return null;
    }
  }

  async updateTransaction(
    id: string,
    method: 'cash' | 'bank',
    amount: number,
    type: 'income' | 'expense',
    categoryId: string | null,
    date: string,
    notes: string = ''
  ) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          method,
          amount,
          type,
          expense_category_id: categoryId,
          date,
          notes
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating transaction:", error);
        toast.error("Failed to update transaction.");
        return null;
      }

      toast.success("Transaction updated successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error updating transaction:", error);
      toast.error("Failed to update transaction due to an unexpected error.");
      return null;
    }
  }

  async deleteTransaction(id: string) {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting transaction:", error);
        toast.error("Failed to delete transaction.");
        return false;
      }

      toast.success("Transaction deleted successfully!");
      return true;
    } catch (error) {
      console.error("Unexpected error deleting transaction:", error);
      toast.error("Failed to delete transaction due to an unexpected error.");
      return false;
    }
  }

  async getAccountBalance() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type');

      if (error) {
        console.error("Error fetching transactions for balance:", error);
        toast.error("Failed to calculate account balance.");
        return null;
      }

      let balance = 0;
      data.forEach(transaction => {
        if (transaction.type === 'income') {
          balance += transaction.amount;
        } else {
          balance -= transaction.amount;
        }
      });

      return balance;
    } catch (error) {
      console.error("Unexpected error fetching transactions for balance:", error);
      toast.error("Failed to calculate account balance due to an unexpected error.");
      return null;
    }
  }

  async generateFinancialReport(startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          expense_category (
            name
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        console.error("Error generating financial report:", error);
        toast.error("Failed to generate financial report.");
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Unexpected error generating financial report:", error);
      toast.error("Failed to generate financial report due to an unexpected error.");
      return [];
    }
  }

  async getTotalExpensesByCategory(startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase.from('transactions').select(`expense_category_id, amount`).gte('date', startDate).lte('date', endDate).eq('type', 'expense')

      if (error) {
        console.error("Error generating financial report:", error);
        toast.error("Failed to generate financial report.");
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Unexpected error generating financial report:", error);
      toast.error("Failed to generate financial report due to an unexpected error.");
      return [];
    }
  }

  async addInitialBalance(amount: number, date: string, method: 'cash' | 'bank', notes: string = '') {
    try {
      // Record the initial balance as an income transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method,
          amount,
          type: 'income', // Treat initial balance as income
          expense_category_id: null, // No category for initial balance
          date,
          notes: `رصيد افتتاحي: ${notes}` // Optional notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error recording initial balance:", error);
        toast.error("Failed to record initial balance.");
        return null;
      }

      toast.success("Initial balance recorded successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error recording initial balance:", error);
      toast.error("Failed to record initial balance due to an unexpected error.");
      return null;
    }
  }

  async recordOpeningBalance(amount: number, date: string, method: string, notes: string = '') {
    try {
      // Ensure method is either 'cash' or 'bank'
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Record the opening balance as an income transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: 'income', // Treat opening balance as income
          expense_category_id: null, // No category for opening balance
          date: date,
          notes: `رصيد افتتاحي: ${notes}` // Optional notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error recording opening balance:", error);
        toast.error("Failed to record opening balance.");
        return null;
      }

      toast.success("Opening balance recorded successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error recording opening balance:", error);
      toast.error("Failed to record opening balance due to an unexpected error.");
      return null;
    }
  }

  async recordExpense(amount: number, categoryId: string, date: string, method: string, notes: string = '') {
    try {
      // Ensure method is either 'cash' or 'bank'
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Record the expense transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: 'expense', // Treat as expense
          expense_category_id: categoryId,
          date: date,
          notes: notes // Optional notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error recording expense:", error);
        toast.error("Failed to record expense.");
        return null;
      }

      toast.success("Expense recorded successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error recording expense:", error);
      toast.error("Failed to record expense due to an unexpected error.");
      return null;
    }
  }

  async recordIncome(amount: number, date: string, method: string, notes: string = '') {
    try {
      // Ensure method is either 'cash' or 'bank'
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Record the income transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: 'income', // Treat as income
          expense_category_id: null, // No category for income
          date: date,
          notes: notes // Optional notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error recording income:", error);
        toast.error("Failed to record income.");
        return null;
      }

      toast.success("Income recorded successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error recording income:", error);
      toast.error("Failed to record income due to an unexpected error.");
      return null;
    }
  }

  async recordTransactionWithMethod(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Record the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error recording transaction:", error);
        toast.error("Failed to record transaction.");
        return null;
      }

      toast.success("Transaction recorded successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error recording transaction:", error);
      toast.error("Failed to record transaction due to an unexpected error.");
      return null;
    }
  }

  async logTransaction(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Log the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error logging transaction:", error);
        toast.error("Failed to log transaction.");
        return null;
      }

      toast.success("Transaction logged successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error logging transaction:", error);
      toast.error("Failed to log transaction due to an unexpected error.");
      return null;
    }
  }

  async createTransaction(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Create the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error creating transaction:", error);
        toast.error("Failed to create transaction.");
        return null;
      }

      toast.success("Transaction created successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error creating transaction:", error);
      toast.error("Failed to create transaction due to an unexpected error.");
      return null;
    }
  }

  async addTransaction(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Add the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error adding transaction:", error);
        toast.error("Failed to add transaction.");
        return null;
      }

      toast.success("Transaction added successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error adding transaction:", error);
      toast.error("Failed to add transaction due to an unexpected error.");
      return null;
    }
  }

  async saveTransaction(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Save the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error saving transaction:", error);
        toast.error("Failed to save transaction.");
        return null;
      }

      toast.success("Transaction saved successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error saving transaction:", error);
      toast.error("Failed to save transaction due to an unexpected error.");
      return null;
    }
  }

  async storeTransaction(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Store the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error storing transaction:", error);
        toast.error("Failed to store transaction.");
        return null;
      }

      toast.success("Transaction stored successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error storing transaction:", error);
      toast.error("Failed to store transaction due to an unexpected error.");
      return null;
    }
  }

  async registerTransaction(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Register the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error registering transaction:", error);
        toast.error("Failed to register transaction.");
        return null;
      }

      toast.success("Transaction registered successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error registering transaction:", error);
      toast.error("Failed to register transaction due to an unexpected error.");
      return null;
    }
  }

  async captureTransaction(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Capture the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error capturing transaction:", error);
        toast.error("Failed to capture transaction.");
        return null;
      }

      toast.success("Transaction captured successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error capturing transaction:", error);
      toast.error("Failed to capture transaction due to an unexpected error.");
      return null;
    }
  }

  async postTransaction(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Post the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error posting transaction:", error);
        toast.error("Failed to post transaction.");
        return null;
      }

      toast.success("Transaction posted successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error posting transaction:", error);
      toast.error("Failed to post transaction due to an unexpected error.");
      return null;
    }
  }

  async putTransaction(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Put the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error putting transaction:", error);
        toast.error("Failed to put transaction.");
        return null;
      }

      toast.success("Transaction put successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error putting transaction:", error);
      toast.error("Failed to put transaction due to an unexpected error.");
      return null;
    }
  }

  async pushTransaction(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Push the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error pushing transaction:", error);
        toast.error("Failed to push transaction.");
        return null;
      }

      toast.success("Transaction pushed successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error pushing transaction:", error);
      toast.error("Failed to push transaction due to an unexpected error.");
      return null;
    }
  }

  async insertTransaction(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Insert the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error inserting transaction:", error);
        toast.error("Failed to insert transaction.");
        return null;
      }

      toast.success("Transaction inserted successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error inserting transaction:", error);
      toast.error("Failed to insert transaction due to an unexpected error.");
      return null;
    }
  }

  async addEntry(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Add the entry
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error adding entry:", error);
        toast.error("Failed to add entry.");
        return null;
      }

      toast.success("Entry added successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error adding entry:", error);
      toast.error("Failed to add entry due to an unexpected error.");
      return null;
    }
  }

  async createEntry(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Create the entry
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error creating entry:", error);
        toast.error("Failed to create entry.");
        return null;
      }

      toast.success("Entry created successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error creating entry:", error);
      toast.error("Failed to create entry due to an unexpected error.");
      return null;
    }
  }

  async saveEntry(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Save the entry
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error saving entry:", error);
        toast.error("Failed to save entry.");
        return null;
      }

      toast.success("Entry saved successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error saving entry:", error);
      toast.error("Failed to save entry due to an unexpected error.");
      return null;
    }
  }

  async storeEntry(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Store the entry
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id: categoryId,
          date: date,
          notes: notes
        }])
        .select()
        .single();

      if (error) {
        console.error("Error storing entry:", error);
        toast.error("Failed to store entry.");
        return null;
      }

      toast.success("Entry stored successfully!");
      return data;
    } catch (error) {
      console.error("Unexpected error storing entry:", error);
      toast.error("Failed to store entry due to an unexpected error.");
      return null;
    }
  }

  async registerEntry(method: string, amount: number, type: 'income' | 'expense', categoryId: string | null, date: string, notes: string = '') {
    try {
      // Validate the method
      if (method !== 'cash' && method !== 'bank') {
        console.error("Invalid payment method. Must be 'cash' or 'bank'.");
        toast.error("Invalid payment method. Must be 'cash' or 'bank'.");
        return null;
      }

      // Register the entry
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          method: method,
          amount: amount,
          type: type,
          expense_category_id
