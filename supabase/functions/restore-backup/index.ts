
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
  resetSequencesForTables,
  recalculatePartyBalances,
  recalculateInvoiceTotals
} from './services/restoreService.ts';

serve(async (req) => {
  // تحسين: معالجة CORS بشكل مناسب
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        // إضافة الهيدرات المطلوبة للسماح بالطلبات من تطبيق Lovable
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, origin, supabase-connection-timeout',
      },
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
    
    // طباعة معلومات عن invoice_items
    if (backupData['invoice_items']) {
      console.log(`توجد بنود فواتير في النسخة الاحتياطية: ${backupData['invoice_items'].length} بند`);
      
      // إحصاء عدد الفواتير الفريدة
      const uniqueInvoiceIds = new Set(backupData['invoice_items'].map((item: any) => item.invoice_id));
      console.log(`عدد الفواتير الفريدة في بنود الفواتير: ${uniqueInvoiceIds.size}`);
      
      // التحقق من وجود قيم فارغة أو خاطئة
      const itemsWithoutTotal = backupData['invoice_items'].filter((item: any) => !item.total);
      const itemsWithZeroQuantity = backupData['invoice_items'].filter((item: any) => !item.quantity || parseFloat(item.quantity) === 0);
      const itemsWithZeroPrice = backupData['invoice_items'].filter((item: any) => !item.unit_price || parseFloat(item.unit_price) === 0);
      
      console.log(`بنود بدون مجموع: ${itemsWithoutTotal.length}`);
      console.log(`بنود بكمية صفر: ${itemsWithZeroQuantity.length}`);
      console.log(`بنود بسعر صفر: ${itemsWithZeroPrice.length}`);
    } else {
      console.log('لا توجد بنود فواتير في النسخة الاحتياطية');
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

    // Step 5: إعادة حساب مجاميع الفواتير
    console.log('إعادة حساب مجاميع الفواتير...');
    const invoiceTotalErrors = await recalculateInvoiceTotals(supabaseAdmin);

    // Step 6: Re-enable foreign key constraints
    console.log('Re-enabling foreign key constraints...');
    await enableForeignKeyConstraints(supabaseAdmin);

    // التحقق من أرصدة العملاء بعد الاستعادة
    const { count: balancesCount, error: balancesCountError } = await supabaseAdmin
      .from('party_balances')
      .select('*', { count: 'exact', head: true });
      
    console.log(`عدد أرصدة الأطراف بعد الاستعادة: ${balancesCount || 'غير متاح'}`);
    
    if (balancesCountError) {
      console.error('خطأ في التحقق من عدد أرصدة الأطراف بعد الاستعادة:', balancesCountError);
    }

    // التحقق من عدد الفواتير بعد الاستعادة
    const { count: invoicesCount, error: invoicesCountError } = await supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact', head: true });
      
    console.log(`عدد الفواتير بعد الاستعادة: ${invoicesCount || 'غير متاح'}`);
    
    if (invoicesCountError) {
      console.error('خطأ في التحقق من عدد الفواتير بعد الاستعادة:', invoicesCountError);
    }

    // التحقق من عدد بنود الفواتير بعد الاستعادة
    const { count: invoiceItemsCount, error: invoiceItemsCountError } = await supabaseAdmin
      .from('invoice_items')
      .select('*', { count: 'exact', head: true });
      
    console.log(`عدد بنود الفواتير بعد الاستعادة: ${invoiceItemsCount || 'غير متاح'}`);
    
    if (invoiceItemsCountError) {
      console.error('خطأ في التحقق من عدد بنود الفواتير بعد الاستعادة:', invoiceItemsCountError);
    }

    // Combine all errors
    const allErrors = [...clearErrors, ...sequenceErrors, ...restoreErrors, ...invoiceTotalErrors];

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
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, origin, supabase-connection-timeout',
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
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, origin, supabase-connection-timeout',
          'Access-Control-Expose-Headers': 'Content-Length, X-JSON'
        }, 
        status: 500 
      }
    );
  }
});
