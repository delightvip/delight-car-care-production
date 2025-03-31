
// Add this method to fix the error
protected getTransactionDescription(transactionType: string): string {
  switch (transactionType) {
    case 'sale_invoice':
      return 'فاتورة مبيعات';
    case 'purchase_invoice':
      return 'فاتورة مشتريات';
    case 'payment_collection':
      return 'تحصيل دفعة';
    case 'payment_disbursement':
      return 'صرف دفعة';
    case 'sales_return':
      return 'مرتجع مبيعات';
    case 'purchase_return':
      return 'مرتجع مشتريات';
    case 'cancel_sale_invoice':
      return 'إلغاء فاتورة مبيعات';
    case 'cancel_purchase_invoice':
      return 'إلغاء فاتورة مشتريات';
    case 'cancel_payment_collection':
      return 'إلغاء تحصيل دفعة';
    case 'cancel_payment_disbursement':
      return 'إلغاء صرف دفعة';
    default:
      return transactionType;
  }
}
