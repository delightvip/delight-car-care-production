
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
    
    // First, disable foreign key constraints
    console.log('Temporarily disabling foreign key constraints...');
    try {
      await supabaseAdmin.rpc('disable_foreign_key_constraints');
      console.log('Foreign key constraints disabled successfully');
    } catch (err) {
      console.warn('Failed to disable foreign key constraints:', err);
    }

    // Comprehensive list of tables to clear in order that respects referential integrity
    const tablesToClear = [
      // First clear dependent tables
      'financial_transactions',
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
      'payments',
      'returns',
      'ledger',
      'profits',
      'financial_transactions',
      // Finally restore items that depend on previous tables
      'invoice_items',
      'return_items'
    ];
    
    // First, clear all existing data
    console.log('Clearing existing data...');
    const clearErrors = [];
    for (const table of tablesToClear) {
      console.log(`Clearing table: ${table}`);
      try {
        const { error } = await supabaseAdmin.rpc('truncate_table', {
          table_name: table,
          cascade: true
        });
          
        if (error) {
          console.error(`Error clearing table ${table}:`, error);
          clearErrors.push({ table, error: error.message });
          
          // Try using DELETE as a fallback
          try {
            const { error: deleteError } = await supabaseAdmin
              .from(table)
              .delete()
              .neq('id', '0');
              
            if (deleteError) {
              console.error(`Error clearing table ${table} with DELETE:`, deleteError);
            }
          } catch (deleteErr) {
            console.error(`Exception clearing table ${table} with DELETE:`, deleteErr);
          }
        }
      } catch (err) {
        console.error(`Exception clearing table ${table}:`, err);
        clearErrors.push({ table, error: err.message });
      }
    }
    
    // Then restore the backup data
    console.log('Restoring backup data...');
    const tablesRestored = [];
    const errors = [];
    
    // Tables with computed fields that need special handling
    const tablesWithComputedFields = {
      'invoice_items': ['total'],
      'return_items': ['total']
    };
    
    // Tables with UUID fields that need validation
    const tablesWithUuids = [
      'financial_transactions',
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
    
    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    for (const table of tablesToRestore) {
      if (backupData[table] && backupData[table].length > 0) {
        console.log(`Restoring table ${table} (${backupData[table].length} records)`);
        
        // Pre-process data for tables with UUID fields
        if (tablesWithUuids.includes(table)) {
          // Filter out records with invalid UUID format
          const originalCount = backupData[table].length;
          
          backupData[table] = backupData[table].filter(item => {
            // Skip validation if id is not a string (e.g., integer id)
            if (typeof item.id !== 'string') return true;
            
            // Validate UUID format
            return uuidRegex.test(item.id);
          });
          
          const filteredCount = originalCount - backupData[table].length;
          if (filteredCount > 0) {
            console.log(`Filtered out ${filteredCount} records from ${table} with invalid UUID format`);
          }
          
          // Process foreign key fields
          backupData[table].forEach(item => {
            // Check and process all potential UUID fields
            const uuidFields = ['id', 'party_id', 'category_id', 'invoice_id', 'return_id', 
                               'transaction_id', 'related_invoice_id', 'reference_id'];
            
            uuidFields.forEach(field => {
              if (item[field] !== undefined && item[field] !== null) {
                // If a string doesn't match UUID format, set to null or a valid value depending on nullability
                if (typeof item[field] === 'string' && !uuidRegex.test(item[field])) {
                  item[field] = null;  // Set to null - will be rejected by DB if field is NOT NULL
                }
              }
            });
          });
        }
        
        // Handle tables with integer primary keys
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
        
        // Clean data before insertion if this table has computed fields
        if (table in tablesWithComputedFields) {
          const fieldsToRemove = tablesWithComputedFields[table as keyof typeof tablesWithComputedFields];
          console.log(`Removing computed fields ${fieldsToRemove.join(', ')} from ${table}`);
          
          for (const item of backupData[table]) {
            for (const field of fieldsToRemove) {
              delete item[field];
            }
          }
        }
        
        // Insert the backup data in batches to avoid request size limits
        const batchSize = 100;
        for (let i = 0; i < backupData[table].length; i += batchSize) {
          const batch = backupData[table].slice(i, i + batchSize);
          console.log(`Inserting batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(backupData[table].length/batchSize)} for ${table}`);
          
          try {
            const { error } = await supabaseAdmin
              .from(table)
              .upsert(batch, { onConflict: 'id' });
              
            if (error) {
              console.error(`Error restoring data for ${table}:`, error);
              errors.push({ 
                table, 
                operation: 'upsert', 
                batch: Math.floor(i/batchSize) + 1, 
                error: error.message 
              });
            }
          } catch (insertError) {
            console.error(`Exception restoring data for ${table}:`, insertError);
            errors.push({ 
              table, 
              operation: 'upsert', 
              batch: Math.floor(i/batchSize) + 1, 
              error: insertError.message 
            });
          }
        }
        
        tablesRestored.push(table);
      } else {
        console.log(`Skipping table ${table}: no data in backup`);
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

    // Include results in the response
    const result = {
      success: true, // Return success even with some errors to avoid blocking the user
      message: errors.length === 0 ? 'Backup restored successfully' : 'Backup restored with some errors',
      tablesRestored: tablesRestored,
      errors: [...clearErrors, ...errors]
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
