
// Comprehensive list of tables to clear in order that respects referential integrity
export const tablesToClear = [
  // First clear dependent tables
  'financial_transactions',
  'cash_operations', // إضافة جدول حركات الخزينة
  'return_items',
  'returns',
  'invoice_items',
  'invoices',
  'payments',
  'profits',
  'ledger',
  'party_balances',
  'packaging_order_materials',
  'packaging_orders',
  'production_order_ingredients',
  'production_orders',
  'inventory_movements',
  'finished_product_packaging',
  'finished_products',
  'semi_finished_ingredients',
  'semi_finished_products',
  'packaging_materials',
  'raw_materials',
  'parties',
  'financial_categories',
  'financial_balance'
];

// Tables to restore in correct order
export const tablesToRestore = [
  // First restore base tables
  'raw_materials',
  'packaging_materials',
  'semi_finished_products',
  'parties', // يجب أن يأتي أولاً قبل party_balances لضمان وجود سجلات العملاء
  'financial_categories',
  'financial_balance',
  
  // أرصدة العملاء مباشرة بعد جدول العملاء
  'party_balances',
  
  // Then restore dependent tables
  'semi_finished_ingredients',
  'finished_products',
  'finished_product_packaging',
  'production_orders',
  'production_order_ingredients',
  'packaging_orders',
  'packaging_order_materials',
  'inventory_movements',
  'invoices',
  'invoice_items', // تحريك invoice_items ليكون بعد invoices مباشرة
  'payments',
  'returns',
  'return_items',
  'ledger',
  'profits',
  'financial_transactions',
  'cash_operations' // إضافة جدول حركات الخزينة
];

// Tables with computed fields that need special handling
export const tablesWithComputedFields = {
  'invoice_items': ['total'],
  'return_items': ['total']
};

// Tables with integer primary keys that need sequence resetting
export const tablesWithIntegerPrimaryKeys = [
  'raw_materials',
  'semi_finished_products',
  'packaging_materials',
  'finished_products',
  'production_orders',
  'packaging_orders',
  'semi_finished_ingredients',
  'production_order_ingredients',
  'packaging_order_materials',
  'finished_product_packaging'
];

// Tables with UUID fields that need validation
export const tablesWithUuids = [
  'financial_transactions',
  'cash_operations', // إضافة جدول حركات الخزينة
  'return_items',
  'returns',
  'invoice_items',
  'invoices',
  'payments',
  'profits',
  'ledger',
  'party_balances',
  'parties'
];
