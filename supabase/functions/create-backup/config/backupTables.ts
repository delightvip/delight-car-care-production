
// Comprehensive list of all tables to back up in the right order
export const tablesToBackup = [
  // المعلومات الأساسية أولاً (بدون تبعيات)
  'financial_categories',
  'raw_materials',
  'semi_finished_products',
  'packaging_materials',
  'finished_products',
  
  // الأطراف التجارية وأرصدتهم - مهم جداً أن يتم حفظهم بهذا الترتيب
  'parties',
  'party_balances',
  
  // الجداول العلائقية
  'semi_finished_ingredients',
  'finished_product_packaging',
  
  // جداول الإنتاج
  'production_orders',
  'production_order_ingredients',
  'packaging_orders',
  'packaging_order_materials',
  
  // الحسابات والمعاملات المالية
  'financial_balance',
  'financial_transactions',
  'cash_operations',
  
  // المعاملات التجارية
  'invoices',
  'invoice_items',
  'payments',
  'returns',
  'return_items',
  'profits',
  'ledger',
  
  // حركات المخزون
  'inventory_movements'
];
