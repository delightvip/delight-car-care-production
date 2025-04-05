
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
    
    // Tables to restore
    const tables = [
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
    
    // First, clear all existing data
    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .neq('id', 0); // Delete all rows
        
      if (error) {
        console.error(`Error clearing table ${table}:`, error);
      }
    }
    
    // Then restore the backup data
    for (const table of tables) {
      if (backupData[table] && backupData[table].length > 0) {
        // Handle sequences for tables with integer primary keys
        if (['raw_materials', 'semi_finished_products', 'packaging_materials', 
             'finished_products', 'production_orders', 'packaging_orders'].includes(table)) {
          // Get the maximum ID to reset the sequence
          const maxId = Math.max(...backupData[table].map(item => item.id), 0);
          
          try {
            // Reset the sequence
            await supabaseAdmin.rpc('reset_sequence', { 
              table_name: table, 
              seq_value: maxId + 1 
            });
          } catch (seqError) {
            console.error(`Error resetting sequence for ${table}:`, seqError);
          }
        }
        
        // Insert the backup data in batches to avoid request size limits
        const batchSize = 100;
        for (let i = 0; i < backupData[table].length; i += batchSize) {
          const batch = backupData[table].slice(i, i + batchSize);
          const { error } = await supabaseAdmin
            .from(table)
            .upsert(batch);
            
          if (error) {
            console.error(`Error restoring data for ${table}:`, error);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Backup restored successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Backup restoration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
