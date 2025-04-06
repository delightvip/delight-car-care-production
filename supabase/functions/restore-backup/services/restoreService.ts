
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
      // Try with primary parameter order first
      const { error } = await supabaseAdmin.rpc('truncate_table', {
        table_name: table,
        cascade: true
      });
        
      if (error) {
        console.error(`Error clearing table ${table} with primary param order:`, error);
        
        // Try with alternative parameter order
        try {
          const { error: altError } = await supabaseAdmin.rpc('truncate_table', {
            cascade: true,
            table_name: table
          });
          
          if (altError) {
            console.error(`Error clearing table ${table} with alt param order:`, altError);
            errors.push({ table, error: altError.message });
            
            // Try using DELETE as a fallback
            try {
              const { error: deleteError } = await supabaseAdmin
                .from(table)
                .delete()
                .neq('id', '0');
                
              if (deleteError) {
                console.error(`Error clearing table ${table} with DELETE:`, deleteError);
                
                // Last resort: Call the more comprehensive delete function
                try {
                  const { error: finalDeleteError } = await supabaseAdmin.rpc('delete_all_from_table', {
                    table_name: table
                  });
                  
                  if (finalDeleteError) {
                    console.error(`Final attempt to clear ${table} failed:`, finalDeleteError);
                  }
                } catch (finalErr) {
                  console.error(`Exception in final delete for ${table}:`, finalErr);
                }
              }
            } catch (deleteErr) {
              console.error(`Exception clearing table ${table} with DELETE:`, deleteErr);
            }
          }
        } catch (altErr) {
          console.error(`Exception during alt param order for ${table}:`, altErr);
          errors.push({ table, error: altErr.message });
        }
      }
    } catch (err) {
      console.error(`Exception clearing table ${table}:`, err);
      errors.push({ table, error: err.message });
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
      const batchSize = 50; // Reduced batch size for safer processing
      for (let i = 0; i < tableData.length; i += batchSize) {
        const batch = tableData.slice(i, i + batchSize);
        console.log(`Inserting batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(tableData.length/batchSize)} for ${table}`);
        
        try {
          const { error } = await supabaseAdmin
            .from(table)
            .upsert(batch, { onConflict: 'id' });
            
          if (error) {
            console.error(`Error restoring data for ${table}:`, error);
            errors.push({ 
              table, 
              operation: 'upsert', 
              batch: Math.floor(i/batchSize) + 1, 
              error: error.message 
            });
            
            // Try with individual records to isolate problematic ones
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
          }
        } catch (insertError) {
          console.error(`Exception restoring data for ${table}:`, insertError);
          errors.push({ 
            table, 
            operation: 'upsert', 
            batch: Math.floor(i/batchSize) + 1, 
            error: insertError.message 
          });
        }
      }
      
      tablesRestored.push(table);
    } else {
      console.log(`Skipping table ${table}: no data in backup`);
    }
  }
  
  return errors;
}
