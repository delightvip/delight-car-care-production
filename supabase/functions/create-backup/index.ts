
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
    // Tables to backup
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

    // Fetch data from each table
    const backupData = {};
    
    for (const table of tables) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*');
        
      if (error) {
        console.error(`Error fetching data from ${table}:`, error);
        continue;
      }
      
      backupData[table] = data;
    }

    // Create a downloadable backup file
    const backupJson = JSON.stringify(backupData, null, 2);
    const backupBlob = new Blob([backupJson], { type: 'application/json' });
    
    // Create a data URL for the backup file
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(backupBlob);
    });

    return new Response(
      JSON.stringify({ success: true, url: dataUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Backup creation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
