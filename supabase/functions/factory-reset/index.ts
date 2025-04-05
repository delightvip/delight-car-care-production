
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
    console.log('Starting factory reset...');
    
    // First, check for and disable foreign key constraints
    console.log('Temporarily disabling foreign key constraints...');
    try {
      await supabaseAdmin.rpc('disable_foreign_key_constraints');
      console.log('Foreign key constraints disabled successfully');
    } catch (err) {
      console.warn('Failed to disable foreign key constraints:', err);
      console.log('Will attempt reset with constraints enabled');
    }
    
    // Comprehensive list of all tables to reset in proper order to respect referential integrity
    // Carefully ordered to avoid foreign key constraints
    const tablesToReset = [
      // First reset dependent tables with foreign keys
      // Financial module - Transactions first
      'financial_transactions',
      
      // Commercial module - Returns
      'return_items',
      'returns',
      
      // Commercial module - Invoices and Payments
      'invoice_items',
      'invoices',
      'payments',
      'profits',
      'ledger',
      
      // Inventory and Party
      'party_balances',
      'inventory_movements',
      
      // Production module
      'packaging_order_materials',
      'packaging_orders',
      'production_order_ingredients',
      'production_orders',
      
      // Product relationships
      'finished_product_packaging',
      'semi_finished_ingredients',
      
      // Base tables (no dependencies)
      'finished_products',
      'semi_finished_products',
      'packaging_materials',
      'raw_materials',
      'parties',
      
      // Important: Clear financial categories after transactions
      'financial_categories',
      
      // Reset financial balance last
      'financial_balance'
    ];

    // Reset all tables
    const errors = [];
    for (const table of tablesToReset) {
      console.log(`Resetting table: ${table}`);
      try {
        // Use TRUNCATE instead of DELETE for faster operation and to avoid triggers
        // Add CASCADE to force deletion even with foreign key constraints
        const { error } = await supabaseAdmin.rpc('truncate_table', { 
          table_name: table,
          cascade: true 
        });

        if (error) {
          console.error(`Error resetting table ${table} with truncate:`, error);
          // Fall back to DELETE if TRUNCATE fails
          try {
            const { error: deleteError } = await supabaseAdmin
              .from(table)
              .delete()
              .neq('id', 0); // Delete all rows
              
            if (deleteError) {
              console.error(`Error resetting table ${table} with delete:`, deleteError);
              errors.push({ table, error: deleteError.message });
            }
          } catch (deleteErr) {
            console.error(`Exception during delete fallback for ${table}:`, deleteErr);
            errors.push({ table, error: deleteErr.message });
          }
        }
      } catch (err) {
        console.error(`Exception resetting table ${table}:`, err);
        errors.push({ table, error: err.message });
      }
    }

    // Re-enable foreign key constraints if we disabled them
    console.log('Re-enabling foreign key constraints...');
    try {
      await supabaseAdmin.rpc('enable_foreign_key_constraints');
      console.log('Foreign key constraints re-enabled successfully');
    } catch (err) {
      console.warn('Failed to re-enable foreign key constraints:', err);
      errors.push({ table: 'system', error: 'Failed to re-enable foreign key constraints: ' + err.message });
    }

    // Reset sequences for tables with integer IDs
    const sequenceTables = [
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

    const sequenceErrors = [];
    for (const table of sequenceTables) {
      console.log(`Resetting sequence for ${table}`);
      try {
        const { error } = await supabaseAdmin.rpc('reset_sequence', { 
          table_name: table, 
          seq_value: 1 
        });
        
        if (error) {
          console.error(`Error resetting sequence for ${table}:`, error);
          sequenceErrors.push({ table, error: error.message });
        }
      } catch (err) {
        console.error(`Exception resetting sequence for ${table}:`, err);
        sequenceErrors.push({ table, error: err.message });
      }
    }

    // Reset the financial_balance table with initial values
    try {
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
        errors.push({ table: 'financial_balance', error: resetError.message });
      }
    } catch (err) {
      console.error('Exception resetting financial_balance:', err);
      errors.push({ table: 'financial_balance', error: err.message });
    }

    // Insert default financial categories AFTER clearing the existing ones
    try {
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
        errors.push({ table: 'financial_categories', error: categoriesError.message });
      }
    } catch (err) {
      console.error('Exception creating default categories:', err);
      errors.push({ table: 'financial_categories', error: err.message });
    }

    console.log('Factory reset completed');

    // Return all errors if any
    if (errors.length > 0 || sequenceErrors.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Factory reset completed with some non-critical errors',
          errors: [...errors, ...sequenceErrors]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Factory reset completed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Factory reset error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
