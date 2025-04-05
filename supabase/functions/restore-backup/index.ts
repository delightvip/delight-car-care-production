
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
    console.log('Starting backup restoration...');
    
    // Parse the request body
    const { backup } = await req.json();
    
    if (!backup) {
      throw new Error('No backup data provided');
    }
    
    // Parse the backup data
    let backupData;
    try {
      backupData = JSON.parse(backup);
    } catch (e) {
      throw new Error('Invalid backup file format');
    }
    
    // Check for backup metadata
    if (backupData['__metadata']) {
      console.log('Backup metadata:', backupData['__metadata']);
    }
    
    // Comprehensive list of tables to clear in order that respects referential integrity
    const tablesToClear = [
      // First clear dependent tables
      'return_items',
      'returns',
      'invoice_items',
      'invoices',
      'payments',
      'profits',
      'ledger',
      'financial_transactions',
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
    const tablesToRestore = [
      // First restore base tables
      'raw_materials',
      'packaging_materials',
      'semi_finished_products',
      'parties',
      'financial_categories',
      'financial_balance',
      // Then restore dependent tables
      'semi_finished_ingredients',
      'finished_products',
      'finished_product_packaging',
      'party_balances',
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
      'ledger',
      'profits',
      'financial_transactions'
    ];
    
    // First, clear all existing data
    console.log('Clearing existing data...');
    for (const table of tablesToClear) {
      console.log(`Clearing table: ${table}`);
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .neq('id', 0); // Delete all rows
        
      if (error) {
        console.error(`Error clearing table ${table}:`, error);
      }
    }
    
    // Then restore the backup data
    console.log('Restoring backup data...');
    const tablesRestored = [];
    const errors = [];
    
    for (const table of tablesToRestore) {
      if (backupData[table] && backupData[table].length > 0) {
        console.log(`Restoring table ${table} (${backupData[table].length} records)`);
        
        // Handle sequences for tables with integer primary keys
        if (['raw_materials', 'semi_finished_products', 'packaging_materials', 
             'finished_products', 'production_orders', 'packaging_orders'].includes(table)) {
          // Get the maximum ID to reset the sequence
          const maxId = Math.max(...backupData[table].map(item => Number(item.id) || 0), 0);
          
          try {
            console.log(`Resetting sequence for ${table} to ${maxId + 1}`);
            // Reset the sequence
            await supabaseAdmin.rpc('reset_sequence', { 
              table_name: table, 
              seq_value: maxId + 1 
            });
          } catch (seqError) {
            console.error(`Error resetting sequence for ${table}:`, seqError);
            errors.push({ table, operation: 'reset_sequence', error: seqError.message });
          }
        }
        
        // Insert the backup data in batches to avoid request size limits
        const batchSize = 100;
        for (let i = 0; i < backupData[table].length; i += batchSize) {
          const batch = backupData[table].slice(i, i + batchSize);
          console.log(`Inserting batch ${i/batchSize + 1} of ${Math.ceil(backupData[table].length/batchSize)} for ${table}`);
          
          try {
            const { error } = await supabaseAdmin
              .from(table)
              .upsert(batch, { onConflict: 'id' });
              
            if (error) {
              console.error(`Error restoring data for ${table}:`, error);
              errors.push({ table, operation: 'upsert', batch: i/batchSize + 1, error: error.message });
            }
          } catch (insertError) {
            console.error(`Exception restoring data for ${table}:`, insertError);
            errors.push({ table, operation: 'upsert', batch: i/batchSize + 1, error: insertError.message });
          }
        }
        
        tablesRestored.push(table);
      } else {
        console.log(`Skipping table ${table}: no data in backup`);
      }
    }

    // Include results in the response
    const result = {
      success: true, // Return success even with some errors to avoid blocking the user
      message: errors.length === 0 ? 'Backup restored successfully' : 'Backup restored with some errors',
      tablesRestored: tablesRestored,
      errors: errors
    };
    
    console.log('Backup restoration completed', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Backup restoration error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
