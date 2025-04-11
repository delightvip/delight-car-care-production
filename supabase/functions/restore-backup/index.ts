
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
    
    // التحقق من وجود الجداول الأساسية
    const requiredTables = ['parties', 'party_balances', 'financial_balance'];
    const missingTables = requiredTables.filter(table => !backupData[table] || (Array.isArray(backupData[table]) && backupData[table].length === 0));
    
    if (missingTables.length > 0) {
      if (missingTables.includes('parties') || missingTables.includes('party_balances')) {
        throw new Error(`النسخة الاحتياطية غير مكتملة. الجداول التالية غير موجودة أو فارغة: ${missingTables.join(', ')}`);
      }
      
      console.warn(`Warning: Missing some required tables: ${missingTables.join(', ')}. Will proceed anyway.`);
      
      if (missingTables.includes('financial_balance')) {
        console.log('Creating default financial balance');
        backupData['financial_balance'] = [{
          id: '1',
          cash_balance: 0,
          bank_balance: 0,
          last_updated: new Date().toISOString()
        }];
      }
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
    try {
      console.log('Verifying party balances after restoration...');
      
      // التحقق من وجود جميع أرصدة العملاء
      const { data: parties, error: partiesError } = await supabaseAdmin
        .from('parties')
        .select('id, name, opening_balance, balance_type');
        
      if (partiesError) {
        console.error('Error fetching parties after restoration:', partiesError);
      } else {
        console.log(`Found ${parties.length} parties after restoration`);
        
        const { data: balances, error: balancesError } = await supabaseAdmin
          .from('party_balances')
          .select('party_id, balance');
          
        if (balancesError) {
          console.error('Error fetching party balances after restoration:', balancesError);
        } else {
          console.log(`Found ${balances.length} party balances after restoration`);
          
          const partyIds = new Set(parties.map(p => p.id));
          const balancePartyIds = new Set(balances.map(b => b.party_id));
          
          const missingBalances = Array.from(partyIds).filter(id => !balancePartyIds.has(id));
          if (missingBalances.length > 0) {
            console.log(`Creating ${missingBalances.length} missing party balances`);
            
            for (const partyId of missingBalances) {
              const party = parties.find(p => p.id === partyId);
              if (party) {
                const initialBalance = party.balance_type === 'credit' 
                  ? -parseFloat(party.opening_balance || 0) 
                  : parseFloat(party.opening_balance || 0);
                  
                console.log(`Creating balance for party ${party.name}: ${initialBalance}`);
                
                const { error: createError } = await supabaseAdmin
                  .from('party_balances')
                  .upsert([{
                    party_id: partyId,
                    balance: initialBalance,
                    last_updated: new Date().toISOString()
                  }]);
                  
                if (createError) {
                  console.error(`Error creating balance for party ${partyId}:`, createError);
                } else {
                  console.log(`Successfully created balance for party ${party.name}`);
                }
              }
            }
          }
        }
      }
    } catch (balanceVerificationError) {
      console.error('Error verifying party balances after restoration:', balanceVerificationError);
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
    
    // التأكد من وجود سجل الأرصدة المالية
    try {
      const { data: financialBalance, error: fbError } = await supabaseAdmin
        .from('financial_balance')
        .select('*')
        .eq('id', '1')
        .maybeSingle();
        
      if (!financialBalance || fbError) {
        console.log('Ensuring financial balance exists');
        await supabaseAdmin
          .from('financial_balance')
          .upsert([{
            id: '1',
            cash_balance: backupData['financial_balance']?.[0]?.cash_balance || 0,
            bank_balance: backupData['financial_balance']?.[0]?.bank_balance || 0,
            last_updated: new Date().toISOString()
          }], { onConflict: 'id' });
      }
    } catch (fbError) {
      console.error('Error ensuring financial balance:', fbError);
    }

    // Include results in the response
    const result = {
      success: allErrors.length === 0 || allErrors.length < 5, // نعتبر النجاح إذا كان عدد الأخطاء أقل من 5
      message: allErrors.length === 0 ? 'Backup restored successfully' : 'Backup restored with some errors',
      tablesRestored: Object.keys(backupData).filter(key => !key.startsWith('__')),
      errors: allErrors
    };
    
    console.log('Backup restoration completed', {
      success: result.success,
      tablesRestored: result.tablesRestored.length,
      errors: result.errors.length
    });

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
