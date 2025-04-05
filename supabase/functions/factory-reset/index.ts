
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
    // List of tables to reset
    const tablesToReset = [
      'raw_materials',
      'semi_finished_products',
      'semi_finished_ingredients',
      'packaging_materials',
      'finished_products',
      'finished_product_packaging',
      'production_orders',
      'production_order_ingredients',
      'packaging_orders',
      'packaging_order_materials',
      'inventory_movements',
      'invoices',
      'invoice_items',
      'payments',
      'returns',
      'return_items',
      'parties',
      'party_balances',
      'ledger',
      'profits',
      'financial_transactions',
      'financial_categories',
      'financial_balance'
    ];

    // Reset all tables
    for (const table of tablesToReset) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .neq('id', 0); // Delete all rows

      if (error) {
        console.error(`Error resetting table ${table}:`, error);
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
