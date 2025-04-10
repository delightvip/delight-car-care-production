
// Comprehensive list of all tables to back up in the right order
export const tablesToBackup = [
  // Base tables (no dependencies)
  'financial_categories',
  'raw_materials',
  'semi_finished_products',
  'packaging_materials',
  'finished_products',
  'parties',
  'financial_balance',
  
  // Relational tables
  'semi_finished_ingredients',
  'finished_product_packaging',
  'party_balances',
  
  // Production tables
  'production_orders',
  'production_order_ingredients',
  'packaging_orders',
  'packaging_order_materials',
  
  // Financial tables
  'financial_transactions',
  
  // Commercial tables
  'invoices',
  'invoice_items',
  'payments',
  'returns',
  'return_items',
  'profits',
  'ledger',
  
  // Movement tables
  'inventory_movements'
];
