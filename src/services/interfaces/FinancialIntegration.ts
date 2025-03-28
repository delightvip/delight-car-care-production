
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
}
