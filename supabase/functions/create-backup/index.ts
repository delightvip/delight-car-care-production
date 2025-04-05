
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
    console.log('Starting backup creation...');
    
    // Comprehensive list of all tables to back up
    const tablesToBackup = [
      // Inventory tables
      'raw_materials',
      'semi_finished_products',
      'packaging_materials',
      'finished_products',
      'semi_finished_ingredients',
      'finished_product_packaging',
      'inventory_movements',
      
      // Production tables
      'production_orders',
      'production_order_ingredients',
      'packaging_orders',
      'packaging_order_materials',
      
      // Commercial tables
      'parties',
      'party_balances',
      'invoices',
      'invoice_items',
      'payments',
      'returns',
      'return_items',
      'ledger',
      'profits',
      
      // Financial tables
      'financial_categories',
      'financial_transactions',
      'financial_balance'
    ];
    
    // Initialize backup data object
    const backupData: Record<string, any[]> = {
      '__metadata': {
        'timestamp': new Date().toISOString(),
        'tablesCount': tablesToBackup.length,
        'version': '1.0'
      }
    };
    
    // Fetch data from all tables
    const errors = [];
    for (const table of tablesToBackup) {
      console.log(`Backing up table: ${table}`);
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .order('id', { ascending: true });
          
        if (error) {
          console.error(`Error fetching data from ${table}:`, error);
          errors.push({ table, error: error.message });
          // Continue with other tables even if there's an error
          backupData[table] = [];
        } else {
          backupData[table] = data || [];
          console.log(`Backed up ${data?.length || 0} records from ${table}`);
        }
      } catch (err) {
        console.error(`Exception fetching data from ${table}:`, err);
        errors.push({ table, error: err.message });
        backupData[table] = [];
      }
    }
    
    // Add errors to metadata if there were any
    if (errors.length > 0) {
      backupData['__metadata']['errors'] = errors;
      console.warn(`Backup completed with ${errors.length} errors`);
    }
    
    console.log('Backup creation completed');
    
    // Return the backup data as JSON
    const jsonData = JSON.stringify(backupData, null, 2);
    
    // Create a temporary URL for download
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    return new Response(
      JSON.stringify({ success: true, url: url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Backup creation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
