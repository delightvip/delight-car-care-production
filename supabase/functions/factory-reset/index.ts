
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create a Supabase client with the Admin key
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
      auth: { persistSession: false },
    }
  );

  try {
    // List of tables to reset in order that respects referential integrity
    const tablesToReset = [
      // First reset dependent tables
      'return_items',
      'returns',
      'invoice_items',
      'invoices',
      'payments',
      'profits',
      'ledger',
      'financial_transactions',
      'party_balances',
      'parties',
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
      // Then reset configuration tables
      'financial_categories'
    ];

    console.log('Starting factory reset...');
    
    // Reset all tables
    for (const table of tablesToReset) {
      console.log(`Resetting table: ${table}`);
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .neq('id', 0); // Delete all rows

      if (error) {
        console.error(`Error resetting table ${table}:`, error);
      }
    }

    // Reset sequences for tables with integer IDs
    const sequenceTables = [
      'raw_materials',
      'semi_finished_products',
      'packaging_materials',
      'finished_products',
      'production_orders',
      'packaging_orders'
    ];

    for (const table of sequenceTables) {
      const { error } = await supabaseAdmin.rpc('reset_sequence', { 
        table_name: table, 
        seq_value: 1 
      });
      
      if (error) {
        console.error(`Error resetting sequence for ${table}:`, error);
      }
    }

    // Reset the financial_balance table with initial values
    const { error: resetError } = await supabaseAdmin
      .from('financial_balance')
      .upsert([
        {
          id: '1',
          cash_balance: 0,
          bank_balance: 0,
          last_updated: new Date().toISOString()
        }
      ]);

    if (resetError) {
      console.error('Error resetting financial_balance:', resetError);
    }

    // Insert default financial categories if needed
    const defaultCategories = [
      { name: 'المبيعات', type: 'income', description: 'إيرادات من المبيعات' },
      { name: 'المشتريات', type: 'expense', description: 'مصروفات للمشتريات' },
      { name: 'المرتبات', type: 'expense', description: 'مرتبات الموظفين' },
      { name: 'إيجار', type: 'expense', description: 'إيجار المكتب أو المحل' },
      { name: 'مرافق', type: 'expense', description: 'كهرباء، ماء، إنترنت، الخ' }
    ];

    const { error: categoriesError } = await supabaseAdmin
      .from('financial_categories')
      .upsert(defaultCategories);

    if (categoriesError) {
      console.error('Error creating default categories:', categoriesError);
    }

    console.log('Factory reset completed successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Factory reset completed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Factory reset error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
