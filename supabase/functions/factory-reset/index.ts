
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
    
    // Disable foreign key constraints first
    console.log('Temporarily disabling foreign key constraints...');
    try {
      await supabaseAdmin.rpc('disable_foreign_key_constraints');
      console.log('Foreign key constraints disabled successfully');
    } catch (err) {
      console.warn('Failed to disable foreign key constraints:', err);
      console.log('Will attempt reset with constraints enabled');
    }
    
    // Comprehensive list of all tables to reset in proper order
    // Order is important for handling data dependencies
    const tablesToReset = [
      // First clear all tables with foreign key relationships
      // Financial module - Transactions first
      'financial_transactions',
      
      // Commercial module - Returns
      'return_items',
      'returns',
      
      // Commercial module - Invoices and Payments
      'invoice_items',
      'invoices',
      'payments',
      
      // Ledger and balance tracking
      'profits',
      'ledger',
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
      
      // Base entities
      'finished_products',
      'semi_finished_products',
      'packaging_materials',
      'raw_materials',
      'parties',
      
      // Clear categories after ensuring no transactions reference them
      'financial_categories',
      
      // Reset financial balance last
      'financial_balance'
    ];

    // Track errors but don't stop on failure
    const errors = [];
    
    // Try different methods to ensure all data is deleted
    for (const table of tablesToReset) {
      console.log(`Resetting table: ${table}`);
      
      try {
        // First try using our specific truncate_table function with the correct parameter order
        const { error: truncateError } = await supabaseAdmin.rpc('truncate_table', { 
          table_name: table,
          cascade: true 
        });
        
        if (truncateError) {
          console.error(`Error truncating table ${table}:`, truncateError);
          
          // Try with alternative parameter order if that's what might be registered
          try {
            const { error: altTruncateError } = await supabaseAdmin.rpc('truncate_table', {
              cascade: true,
              table_name: table
            });
            
            if (altTruncateError) {
              console.error(`Error truncating table ${table} with alt params:`, altTruncateError);
              
              // If truncation fails, try deleting all rows
              try {
                const { error: deleteError } = await supabaseAdmin
                  .from(table)
                  .delete()
                  .neq('id', '0');  // Delete all rows
                
                if (deleteError) {
                  console.error(`Error deleting from table ${table}:`, deleteError);
                  
                  // Last resort: Call the more comprehensive delete function
                  try {
                    const { error: finalDeleteError } = await supabaseAdmin.rpc('delete_all_from_table', {
                      table_name: table
                    });
                    
                    if (finalDeleteError) {
                      console.error(`Final attempt to clear ${table} failed:`, finalDeleteError);
                      errors.push({ table, error: finalDeleteError.message });
                    }
                  } catch (finalErr) {
                    console.error(`Exception in final delete for ${table}:`, finalErr);
                    errors.push({ table, error: finalErr.message });
                  }
                }
              } catch (deleteErr) {
                console.error(`Exception during delete for ${table}:`, deleteErr);
                errors.push({ table, error: deleteErr.message });
              }
            }
          } catch (altErr) {
            console.error(`Exception during alt truncate for ${table}:`, altErr);
            errors.push({ table, error: altErr.message });
          }
        }
      } catch (err) {
        console.error(`Exception resetting table ${table}:`, err);
        errors.push({ table, error: err.message });
      }
    }

    // Re-enable foreign key constraints
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

    // Initialize the financial_balance table with default values
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

    // Insert default financial categories after clearing the existing ones
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
