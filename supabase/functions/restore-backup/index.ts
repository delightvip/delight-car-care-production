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

// خدمة جديدة لحساب وتحديث أرصدة الأطراف
async function recalculatePartyBalances(supabaseAdmin: any): Promise<any[]> {
  const errors = [];
  
  try {
    console.log('بدء إعادة حساب أرصدة الأطراف...');
    
    // الحصول على جميع الأطراف
    const { data: parties, error: partiesError } = await supabaseAdmin
      .from('parties')
      .select('id, name, opening_balance, balance_type');
      
    if (partiesError) {
      console.error('خطأ في جلب الأطراف:', partiesError);
      return [{ table: 'parties', operation: 'select', error: partiesError.message }];
    }
    
    console.log(`تم العثور على ${parties.length} طرف`);
    
    // لكل طرف، نحسب الرصيد الصحيح
    for (const party of parties) {
      try {
        console.log(`إعادة حساب رصيد الطرف ${party.name} (${party.id})...`);
        
        // تحديد الرصيد الافتتاحي
        let currentBalance = party.balance_type === 'credit' 
          ? -parseFloat(party.opening_balance || 0) 
          : parseFloat(party.opening_balance || 0);
          
        console.log(`الرصيد الافتتاحي: ${currentBalance}`);
        
        // جلب كل المعاملات من سجل الحساب للطرف بترتيب تاريخي
        const { data: ledgerEntries, error: ledgerError } = await supabaseAdmin
          .from('ledger')
          .select('*')
          .eq('party_id', party.id)
          .order('date', { ascending: true });
          
        if (ledgerError) {
          console.error(`خطأ في جلب سجل حساب الطرف ${party.id}:`, ledgerError);
          errors.push({ 
            table: 'ledger', 
            operation: 'select', 
            party_id: party.id, 
            error: ledgerError.message 
          });
          continue;
        }
        
        if (ledgerEntries.length === 0) {
          console.log(`لا توجد معاملات للطرف ${party.name} - سيتم استخدام الرصيد الافتتاحي فقط`);
        } else {
          console.log(`تم العثور على ${ledgerEntries.length} معاملة للطرف ${party.name}`);
          
          // إعادة حساب الرصيد المتوقع كما لو كنا نعيد تشغيل جميع المعاملات
          for (const entry of ledgerEntries) {
            const debit = parseFloat(entry.debit || 0);
            const credit = parseFloat(entry.credit || 0);
            
            currentBalance += debit - credit;
          }
          
          console.log(`الرصيد المحسوب: ${currentBalance}`);
        }
        
        // تحديث رصيد الطرف في جدول الأرصدة
        // أولاً، نتحقق من وجود سجل للرصيد
        const { data: existingBalance, error: balanceCheckError } = await supabaseAdmin
          .from('party_balances')
          .select('*')
          .eq('party_id', party.id);
          
        if (balanceCheckError) {
          console.error(`خطأ في التحقق من رصيد الطرف ${party.id}:`, balanceCheckError);
          errors.push({ 
            table: 'party_balances', 
            operation: 'select', 
            party_id: party.id, 
            error: balanceCheckError.message 
          });
          continue;
        }
        
        if (existingBalance && existingBalance.length > 0) {
          // إذا كان هناك أكثر من سجل، نحذف السجلات الزائدة
          if (existingBalance.length > 1) {
            console.warn(`تم العثور على ${existingBalance.length} سجل رصيد للطرف ${party.name} - سيتم حذف السجلات الزائدة`);
            
            // الاحتفاظ بالسجل الأول وحذف الباقي
            for (let i = 1; i < existingBalance.length; i++) {
              const { error: deleteError } = await supabaseAdmin
                .from('party_balances')
                .delete()
                .eq('id', existingBalance[i].id);
                
              if (deleteError) {
                console.error(`خطأ في حذف سجل الرصيد الزائد ${existingBalance[i].id}:`, deleteError);
                errors.push({ 
                  table: 'party_balances', 
                  operation: 'delete', 
                  party_id: party.id, 
                  error: deleteError.message 
                });
              }
            }
          }
          
          // تحديث السجل الموجود
          const { error: updateError } = await supabaseAdmin
            .from('party_balances')
            .update({ 
              balance: currentBalance, 
              last_updated: new Date().toISOString() 
            })
            .eq('id', existingBalance[0].id);
            
          if (updateError) {
            console.error(`خطأ في تحديث رصيد الطرف ${party.id}:`, updateError);
            errors.push({ 
              table: 'party_balances', 
              operation: 'update', 
              party_id: party.id, 
              error: updateError.message 
            });
          } else {
            console.log(`تم تحديث رصيد الطرف ${party.name} بنجاح إلى ${currentBalance}`);
          }
        } else {
          // إنشاء سجل جديد للرصيد
          const { error: insertError } = await supabaseAdmin
            .from('party_balances')
            .insert([{ 
              party_id: party.id, 
              balance: currentBalance, 
              last_updated: new Date().toISOString() 
            }]);
            
          if (insertError) {
            console.error(`خطأ في إنشاء رصيد للطرف ${party.id}:`, insertError);
            errors.push({ 
              table: 'party_balances', 
              operation: 'insert', 
              party_id: party.id, 
              error: insertError.message 
            });
          } else {
            console.log(`تم إنشاء رصيد للطرف ${party.name} بنجاح بقيمة ${currentBalance}`);
          }
        }
      } catch (partyError) {
        console.error(`خطأ في معالجة الطرف ${party.id}:`, partyError);
        errors.push({ 
          table: 'parties', 
          operation: 'process', 
          party_id: party.id, 
          error: partyError.message 
        });
      }
    }
    
    console.log(`اكتملت إعادة حساب أرصدة الأطراف. عدد الأخطاء: ${errors.length}`);
    return errors;
  } catch (error) {
    console.error('خطأ أثناء إعادة حساب أرصدة الأطراف:', error);
    return [{ table: 'party_balances', operation: 'recalculate', error: error.message }];
  }
}

serve(async (req) => {
  // تحسين: إضافة معالجة CORS مناسبة
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
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

    // Step 6: Recalculate party balances (خطوة جديدة)
    console.log('إعادة حساب أرصدة الأطراف بعد الاستعادة...');
    const balanceErrors = await recalculatePartyBalances(supabaseAdmin);

    // Combine all errors
    const allErrors = [...clearErrors, ...sequenceErrors, ...restoreErrors, ...balanceErrors];

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
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Expose-Headers': 'Content-Length, X-JSON'
        }, 
        status: 200 
      }
    );
  } catch (error) {
    console.error('Backup restoration error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Expose-Headers': 'Content-Length, X-JSON'
        }, 
        status: 500 
      }
    );
  }
});
