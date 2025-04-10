
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getBackupData } from './services/backupService.ts';
import { corsHeaders } from './utils/corsHeaders.ts';

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
    
    // Get backup data using the service
    const { backupData, errors } = await getBackupData(supabaseAdmin);
    
    // إضافة معلومات إضافية للبيانات الوصفية
    backupData.__metadata.generatedAt = new Date().toISOString();
    backupData.__metadata.errors = errors;
    
    console.log('Backup creation completed:', {
      tables: Object.keys(backupData).filter(k => k !== '__metadata').length,
      totalRecords: backupData.__metadata.recordsCount,
      errors: errors.length
    });
    
    // إضافة تحسين للأداء بإزالة خاصية الـ header Cache-Control
    const headers = {
      ...corsHeaders, 
      'Content-Type': 'application/json'
    };
    
    // Return the backup data directly
    return new Response(
      JSON.stringify(backupData),
      { headers, status: 200 }
    );
  } catch (error) {
    console.error('Backup creation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
