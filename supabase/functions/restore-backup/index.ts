
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from './utils/corsHeaders.ts';
import { 
  disableForeignKeyConstraints, 
  enableForeignKeyConstraints 
} from './services/constraintService.ts';
import { 
  clearExistingData, 
  restoreBackupData, 
  resetSequencesForTables 
} from './services/restoreService.ts';

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
    
    // Step 1: Disable foreign key constraints
    console.log('Temporarily disabling foreign key constraints...');
    await disableForeignKeyConstraints(supabaseAdmin);
    
    // Step 2: Clear existing data
    console.log('Clearing existing data...');
    const clearErrors = await clearExistingData(supabaseAdmin);
    
    // Step 3: Reset sequences for tables with integer primary keys
    console.log('Resetting sequences...');
    const sequenceErrors = await resetSequencesForTables(supabaseAdmin, backupData);
    
    // Step 4: Restore the backup data
    console.log('Restoring backup data...');
    const restoreErrors = await restoreBackupData(supabaseAdmin, backupData);
    
    // Step 5: Re-enable foreign key constraints
    console.log('Re-enabling foreign key constraints...');
    await enableForeignKeyConstraints(supabaseAdmin);

    // Combine all errors
    const allErrors = [...clearErrors, ...sequenceErrors, ...restoreErrors];

    // إضافة خطوة إضافية للتحقق من أرصدة العملاء وإعادة ضبطها إذا لزم الأمر
    if (backupData['parties'] && backupData['party_balances']) {
      console.log('Verifying party balances after restoration...');
      try {
        // التحقق من وجود جميع أرصدة العملاء
        const partyCount = backupData['parties'].length;
        const balanceCount = backupData['party_balances'].length;
        
        console.log(`Parties: ${partyCount}, Party Balances: ${balanceCount}`);
        
        if (partyCount > balanceCount) {
          console.log(`Warning: Found ${partyCount - balanceCount} parties without balances`);
        }
      } catch (balanceVerificationError) {
        console.error('Error during final balance verification:', balanceVerificationError);
      }
    }

    // Check financial balance
    try {
      const { data: financialBalance, error: fbError } = await supabaseAdmin
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .maybeSingle();
        
      if (fbError) {
        console.error('Error checking financial balance:', fbError);
      } else if (!financialBalance) {
        console.log('Financial balance not found, creating default');
        await supabaseAdmin
          .from('financial_balance')
          .upsert([{
            id: '1',
            cash_balance: 0,
            bank_balance: 0,
            last_updated: new Date().toISOString()
          }]);
      } else {
        console.log('Financial balance verified:', financialBalance);
      }
    } catch (fbVerificationError) {
      console.error('Error verifying financial balance:', fbVerificationError);
    }

    // Include results in the response
    const result = {
      success: true, // Return success even with some errors to avoid blocking the user
      message: allErrors.length === 0 ? 'Backup restored successfully' : 'Backup restored with some errors',
      tablesRestored: Object.keys(backupData).filter(key => !key.startsWith('__')),
      errors: allErrors
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
