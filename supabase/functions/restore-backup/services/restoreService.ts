
import { 
  tablesToClear, 
  tablesToRestore, 
  tablesWithComputedFields,
  tablesWithIntegerPrimaryKeys,
  tablesWithUuids
} from '../config/tableConfig.ts';
import { cleanUuids, removeComputedFields } from '../utils/dataValidation.ts';

// Function to clear existing data
export async function clearExistingData(supabaseAdmin: any) {
  const errors = [];
  
  for (const table of tablesToClear) {
    console.log(`Clearing table: ${table}`);
    try {
      // Call with positional parameters to avoid ambiguity
      const { error } = await supabaseAdmin.rpc('delete_all_from_table', {
        table_name: table
      });
        
      if (error) {
        console.error(`Error clearing table ${table}:`, error);
        errors.push({ table, operation: 'clear', error: error.message });
      }
    } catch (err) {
      console.error(`Exception clearing table ${table}:`, err);
      errors.push({ table, operation: 'clear', error: err.message });
    }
  }
  
  return errors;
}

// Function to reset sequences for tables with integer primary keys
export async function resetSequencesForTables(supabaseAdmin: any, backupData: any) {
  const errors = [];
  
  for (const table of tablesWithIntegerPrimaryKeys) {
    if (backupData[table] && backupData[table].length > 0) {
      // Get the maximum ID to reset the sequence
      const maxId = Math.max(...backupData[table].map((item: any) => Number(item.id) || 0), 0);
      
      try {
        console.log(`Resetting sequence for ${table} to ${maxId + 1}`);
        // Reset the sequence
        await supabaseAdmin.rpc('reset_sequence', { 
          table_name: table, 
          seq_value: maxId + 1 
        });
      } catch (seqError) {
        console.error(`Error resetting sequence for ${table}:`, seqError);
        errors.push({ table, operation: 'reset_sequence', error: seqError.message });
      }
    }
  }
  
  return errors;
}

// Function to restore backup data
export async function restoreBackupData(supabaseAdmin: any, backupData: any) {
  const errors = [];
  const tablesRestored = [];
  
  // UUID fields to check and clean
  const uuidFields = ['id', 'party_id', 'category_id', 'invoice_id', 'return_id', 
                      'transaction_id', 'related_invoice_id', 'reference_id'];
  
  for (const table of tablesToRestore) {
    if (backupData[table] && backupData[table].length > 0) {
      console.log(`Restoring table ${table} (${backupData[table].length} records)`);
      
      // Pre-process data for tables with UUID fields
      let tableData = backupData[table];
      if (tablesWithUuids.includes(table)) {
        const originalCount = tableData.length;
        tableData = cleanUuids(tableData, uuidFields);
        
        const filteredCount = originalCount - tableData.length;
        if (filteredCount > 0) {
          console.log(`Filtered out ${filteredCount} records from ${table} with invalid UUID format`);
        }
      }
      
      // Clean data before insertion if this table has computed fields
      if (table in tablesWithComputedFields) {
        const fieldsToRemove = tablesWithComputedFields[table as keyof typeof tablesWithComputedFields];
        console.log(`Removing computed fields ${fieldsToRemove.join(', ')} from ${table}`);
        tableData = removeComputedFields(tableData, fieldsToRemove);
      }
      
      // Insert the backup data in batches to avoid request size limits
      // تقليل حجم الدفعة للتعامل مع كميات كبيرة من البيانات
      const batchSize = 25; // تم تقليل حجم الدفعة من 50 إلى 25 للتعامل بشكل أفضل مع البيانات الكبيرة
      
      for (let i = 0; i < tableData.length; i += batchSize) {
        const batch = tableData.slice(i, i + batchSize);
        console.log(`Inserting batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(tableData.length/batchSize)} for ${table}`);
        
        try {
          const { error } = await supabaseAdmin
            .from(table)
            .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
            
          if (error) {
            console.error(`Error restoring data for ${table}:`, error);
            errors.push({ 
              table, 
              operation: 'upsert', 
              batch: Math.floor(i/batchSize) + 1, 
              error: error.message 
            });
            
            // إذا فشلت الدفعة، نحاول تنفيذ كل سجل على حدة
            if (batch.length > 1) {
              console.log(`Attempting individual inserts for ${table}`);
              for (const record of batch) {
                try {
                  const { error: individualError } = await supabaseAdmin
                    .from(table)
                    .upsert([record], { onConflict: 'id' });
                    
                  if (individualError) {
                    console.error(`Error with individual record in ${table}:`, individualError, record);
                  }
                } catch (indErr) {
                  console.error(`Exception with individual record in ${table}:`, indErr);
                }
              }
            }
          } else {
            console.log(`Successfully inserted batch ${Math.floor(i/batchSize) + 1} for ${table}`);
          }
        } catch (insertError) {
          console.error(`Exception restoring data for ${table}:`, insertError);
          errors.push({ 
            table, 
            operation: 'upsert', 
            batch: Math.floor(i/batchSize) + 1, 
            error: insertError.message 
          });
          
          // محاولة مع حجم دفعة أصغر في حالة الفشل
          if (batch.length > 5) {
            console.log(`Retrying with smaller batch size for ${table}`);
            const smallerBatchSize = 5;
            for (let j = 0; j < batch.length; j += smallerBatchSize) {
              const smallerBatch = batch.slice(j, j + smallerBatchSize);
              try {
                const { error: retryError } = await supabaseAdmin
                  .from(table)
                  .upsert(smallerBatch, { onConflict: 'id' });
                  
                if (retryError) {
                  console.error(`Error with smaller batch in ${table}:`, retryError);
                }
              } catch (retryErr) {
                console.error(`Exception with smaller batch in ${table}:`, retryErr);
              }
            }
          }
        }
      }
      
      tablesRestored.push(table);
    } else {
      console.log(`Skipping table ${table}: no data in backup`);
    }
  }
  
  // بعد الانتهاء من استعادة البيانات، نقوم بإعادة حساب أرصدة العملاء إذا لزم الأمر
  if (tablesRestored.includes('parties') && tablesRestored.includes('party_balances')) {
    console.log('Verifying party balances...');
    try {
      // التحقق من تطابق عدد سجلات العملاء مع سجلات الأرصدة
      const { data: parties, error: partiesError } = await supabaseAdmin
        .from('parties')
        .select('id');
        
      const { data: balances, error: balancesError } = await supabaseAdmin
        .from('party_balances')
        .select('party_id');
        
      if (partiesError) {
        console.error('Error fetching parties:', partiesError);
      } else if (balancesError) {
        console.error('Error fetching party balances:', balancesError);
      } else if (parties && balances) {
        const partyIds = new Set(parties.map(p => p.id));
        const balancePartyIds = new Set(balances.map(b => b.party_id));
        
        // إذا كان هناك طرف بدون رصيد، نقوم بإنشاء رصيد له
        const missingBalances = Array.from(partyIds).filter(id => !balancePartyIds.has(id));
        if (missingBalances.length > 0) {
          console.log(`Creating missing party balances for ${missingBalances.length} parties`);
          
          for (const partyId of missingBalances) {
            // الحصول على بيانات الطرف
            const { data: party } = await supabaseAdmin
              .from('parties')
              .select('*')
              .eq('id', partyId)
              .single();
              
            if (party) {
              // إنشاء رصيد مبدئي بناءً على نوع الرصيد والرصيد الافتتاحي
              const initialBalance = party.balance_type === 'credit' 
                ? -parseFloat(party.opening_balance || 0) 
                : parseFloat(party.opening_balance || 0);
                
              const { error: createBalanceError } = await supabaseAdmin
                .from('party_balances')
                .upsert([{
                  party_id: partyId,
                  balance: initialBalance,
                  last_updated: new Date().toISOString()
                }]);
                
              if (createBalanceError) {
                console.error(`Error creating balance for party ${partyId}:`, createBalanceError);
              }
            }
          }
        }
      }
    } catch (balanceVerificationError) {
      console.error('Error verifying party balances:', balanceVerificationError);
    }
  }
  
  return errors;
}
