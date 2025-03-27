
/**
 * واجهة التكامل بين نظام الحركات التجارية والنظام المالي
 * هذه الواجهة تحدد العمليات المالية المرتبطة بالحركات التجارية
 */
export interface FinancialIntegration {
  /**
   * تسجيل معاملة مالية مرتبطة بالحركات التجارية
   * @param transactionData بيانات المعاملة المالية
   */
  recordFinancialTransaction(transactionData: {
    type: 'income' | 'expense';
    amount: number;
    payment_method: 'cash' | 'bank' | 'other';
    category_id: string;
    reference_id?: string;
    reference_type?: string;
    date: string;
    notes?: string;
  }): Promise<boolean>;

  /**
   * تحديث رصيد الخزينة
   * @param amount المبلغ (موجب للإضافة، سالب للخصم)
   * @param method طريقة الدفع (نقدي أو بنك)
   */
  updateBalance(amount: number, method: 'cash' | 'bank'): Promise<boolean>;

  /**
   * حساب الأرباح من فاتورة مبيعات
   * @param invoiceId معرف الفاتورة
   * @param itemsData بيانات عناصر الفاتورة
   */
  calculateInvoiceProfit(invoiceId: string, itemsData: Array<{
    item_id: number;
    item_type: "raw_materials" | "packaging_materials" | "semi_finished_products" | "finished_products";
    quantity: number;
    unit_price: number;
    cost_price: number;
  }>): Promise<{
    totalCost: number;
    totalPrice: number;
    profit: number;
    profitMargin: number;
  }>;
}
