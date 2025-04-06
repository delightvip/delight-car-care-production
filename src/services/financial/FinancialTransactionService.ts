
// Add the is_reduction property to the Transaction interface in the model
export interface TransactionCreateData {
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string;
  payment_method: string;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  is_reduction?: boolean;
}

// Update the createTransaction method to include is_reduction
public async createTransaction(transactionData: TransactionCreateData): Promise<Transaction | null> {
  try {
    // Check if category exists
    const category = await this.getCategoryById(transactionData.category_id);
    
    if (!category) {
      toast.error('فئة المعاملة غير موجودة');
      return null;
    }
    
    // Validate amount
    if (transactionData.amount <= 0) {
      toast.error('يجب أن يكون مبلغ المعاملة أكبر من صفر');
      return null;
    }
    
    // Add transaction
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert({
        date: transactionData.date,
        amount: transactionData.amount,
        type: transactionData.type,
        category_id: transactionData.category_id,
        payment_method: transactionData.payment_method,
        reference_id: transactionData.reference_id,
        reference_type: transactionData.reference_type,
        notes: transactionData.notes,
        is_reduction: transactionData.is_reduction || false
      })
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Update financial balance
    if (transactionData.type === 'income') {
      await this.updateFinancialBalance(transactionData.amount, 0);
    } else {
      await this.updateFinancialBalance(-transactionData.amount, 0);
    }
    
    // Format response
    return {
      id: data.id,
      date: data.date,
      amount: data.amount,
      type: data.type,
      category_id: data.category_id,
      category_name: category.name,
      category_type: category.type,
      payment_method: data.payment_method,
      reference_id: data.reference_id,
      reference_type: data.reference_type,
      notes: data.notes,
      created_at: data.created_at,
      is_reduction: data.is_reduction
    };
  } catch (error) {
    console.error('Error creating transaction:', error);
    toast.error('حدث خطأ أثناء إنشاء المعاملة المالية');
    return null;
  }
}
