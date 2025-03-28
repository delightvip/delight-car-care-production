
/**
 * واجهة تكامل الوحدات مع النظام المالي
 */

export interface FinancialTransaction {
  type: 'income' | 'expense';
  amount: number;
  payment_method: string;
  category_id: string;
  reference_id?: string;
  reference_type?: string;
  date: string;
  notes?: string;
}

export interface FinancialIntegration {
  recordFinancialTransaction(transactionData: FinancialTransaction): Promise<boolean>;
  updateBalance(amount: number, paymentMethod: 'cash' | 'bank' | 'other'): Promise<boolean>;
  recordLedgerEntry(ledgerEntry: {
    party_id: string;
    transaction_id: string;
    transaction_type: string;
    date: string;
    debit: number;
    credit: number;
    notes: string;
    description?: string;
  }): Promise<boolean>;
}
