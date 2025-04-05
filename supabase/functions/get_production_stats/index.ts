
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

  // Get the supabase client
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { 
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
      auth: { persistSession: false }
    }
  );

  try {
    // Call the RPC function
    const { data, error } = await supabaseClient.rpc('get_production_stats');

    if (error) {
      throw error;
    }

    // Ensure all fields are present in the response
    const formattedData = {
      total_production_orders: data.total_production_orders || 0,
      completed_orders: data.completed_orders || 0,
      pending_orders: data.pending_orders || 0,
      in_progress_orders: data.in_progress_orders || 0,
      cancelled_orders: data.cancelled_orders || 0,
      total_cost: data.total_cost || 0
    };

    return new Response(
      JSON.stringify({ data: formattedData }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
