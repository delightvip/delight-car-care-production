
import { tablesToBackup } from '../config/backupTables.ts';

export async function getBackupData(supabaseAdmin: any) {
  // Initialize backup data object
  const backupData: Record<string, any[]> = {
    '__metadata': {
      'timestamp': new Date().toISOString(),
      'tablesCount': tablesToBackup.length,
      'version': '1.0'
    }
  };
  
  // Fetch data from all tables
  const errors = [];
  for (const table of tablesToBackup) {
    console.log(`Backing up table: ${table}`);
    try {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .order('id', { ascending: true });
        
      if (error) {
        console.error(`Error fetching data from ${table}:`, error);
        errors.push({ table, error: error.message });
        // Continue with other tables even if there's an error
        backupData[table] = [];
      } else {
        backupData[table] = data || [];
        console.log(`Backed up ${data?.length || 0} records from ${table}`);
      }
    } catch (err) {
      console.error(`Exception fetching data from ${table}:`, err);
      errors.push({ table, error: err.message });
      backupData[table] = [];
    }
  }
  
  // Add errors to metadata if there were any
  if (errors.length > 0) {
    backupData['__metadata']['errors'] = errors;
    console.warn(`Backup completed with ${errors.length} errors`);
  }

  return { backupData, errors };
}
