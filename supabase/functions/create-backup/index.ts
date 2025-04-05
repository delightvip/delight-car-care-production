
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
    
    // Comprehensive list of all tables to backup in a specific order to maintain relationships
    const tables = [
      // Base tables first
      'raw_materials',
      'packaging_materials',
      'semi_finished_products',
      'semi_finished_ingredients',
      'finished_products',
      'finished_product_packaging',
      'parties',
      'party_balances',
      'financial_categories',
      'financial_balance',
      // Transaction and operational tables
      'production_orders',
      'production_order_ingredients',
      'packaging_orders',
      'packaging_order_materials',
      'inventory_movements',
      // Financial and commercial tables
      'invoices',
      'invoice_items',
      'payments',
      'returns',
      'return_items',
      'ledger',
      'profits',
      'financial_transactions'
    ];

    // Fetch data from each table
    const backupData = {};
    const errors = [];
    
    for (const table of tables) {
      console.log(`Backing up table: ${table}`);
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*');
        
      if (error) {
        console.error(`Error fetching data from ${table}:`, error);
        errors.push({ table, error: error.message });
        continue;
      }
      
      backupData[table] = data || [];
      console.log(`Backed up ${data?.length || 0} rows from ${table}`);
    }

    // Include any errors in the backup data
    if (errors.length > 0) {
      backupData['__errors'] = errors;
    }

    // Add backup metadata
    backupData['__metadata'] = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      tables: tables,
      tablesCount: Object.keys(backupData).filter(k => !k.startsWith('__')).length
    };

    // Create a downloadable backup file
    const backupJson = JSON.stringify(backupData, null, 2);
    const backupBlob = new Blob([backupJson], { type: 'application/json' });
    
    // Create a data URL for the backup file
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(backupBlob);
    });

    console.log('Backup created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: dataUrl,
        metadata: backupData['__metadata']
      }),
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
