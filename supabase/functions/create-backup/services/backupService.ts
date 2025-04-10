
import { tablesToBackup } from '../config/backupTables.ts';

export async function getBackupData(supabaseAdmin: any) {
  // Initialize backup data object
  const backupData: Record<string, any[]> = {
    '__metadata': {
      'timestamp': new Date().toISOString(),
      'tablesCount': tablesToBackup.length,
      'version': '1.0',
      'creator': 'System Backup Service'
    }
  };
  
  // Fetch data from all tables
  const errors = [];
  
  // للتعامل مع الجداول الكبيرة، نقوم بجلب البيانات على دفعات
  const pageSize = 1000; // حجم الصفحة
  
  for (const table of tablesToBackup) {
    console.log(`Backing up table: ${table}`);
    backupData[table] = []; // تهيئة مصفوفة فارغة للجدول
    
    try {
      let page = 0;
      let hasMoreData = true;
      let totalRecords = 0;
      
      // جلب عدد السجلات في الجدول
      const { count, error: countError } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error(`Error counting records in ${table}:`, countError);
      } else {
        console.log(`Table ${table} has ${count} records`);
      }
      
      // جلب البيانات على دفعات
      while (hasMoreData) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('id', { ascending: true });
          
        if (error) {
          console.error(`Error fetching data from ${table} (page ${page}):`, error);
          errors.push({ table, error: error.message });
          hasMoreData = false;
        } else if (!data || data.length === 0) {
          hasMoreData = false;
        } else {
          backupData[table].push(...data);
          totalRecords += data.length;
          console.log(`Backed up ${data.length} records from ${table} (page ${page}), total: ${totalRecords}`);
          
          // إذا كانت الصفحة غير مكتملة، فهذا يعني أنه لا توجد المزيد من البيانات
          if (data.length < pageSize) {
            hasMoreData = false;
          } else {
            page++;
          }
        }
      }
      
      console.log(`Completed backup of ${table}: ${backupData[table].length} records`);
      
      // التحقق من العلاقات بين الأطراف والأرصدة
      if (table === 'party_balances' && backupData['parties']) {
        const partyIds = new Set(backupData['parties'].map((p: any) => p.id));
        const balancePartyIds = new Set(backupData['party_balances'].map((b: any) => b.party_id));
        
        const partiesWithoutBalances = [...partyIds].filter(id => !balancePartyIds.has(id));
        if (partiesWithoutBalances.length > 0) {
          console.log(`WARNING: Found ${partiesWithoutBalances.length} parties without balances`);
          
          // إنشاء سجلات أرصدة للأطراف التي ليس لها أرصدة
          for (const partyId of partiesWithoutBalances) {
            const party = backupData['parties'].find((p: any) => p.id === partyId);
            if (party) {
              const initialBalance = party.balance_type === 'credit' 
                ? -parseFloat(party.opening_balance || 0) 
                : parseFloat(party.opening_balance || 0);
                
              console.log(`Creating balance for party ${party.name}: ${initialBalance}`);
              
              backupData['party_balances'].push({
                id: crypto.randomUUID(),
                party_id: partyId,
                balance: initialBalance,
                last_updated: new Date().toISOString()
              });
            }
          }
          
          console.log(`Added ${partiesWithoutBalances.length} missing balances`);
        }
      }
    } catch (err) {
      console.error(`Exception fetching data from ${table}:`, err);
      errors.push({ table, error: err.message });
    }
  }
  
  // Add errors to metadata if there were any
  if (errors.length > 0) {
    backupData['__metadata']['errors'] = errors;
    console.warn(`Backup completed with ${errors.length} errors`);
  }
  
  // اضافة معلومات حول الاحصائيات
  const totalRecords = Object.keys(backupData)
    .filter(key => key !== '__metadata')
    .reduce((total, table) => total + (Array.isArray(backupData[table]) ? backupData[table].length : 0), 0);
    
  backupData['__metadata']['recordsCount'] = totalRecords;
  backupData['__metadata']['completedAt'] = new Date().toISOString();
  
  console.log(`Backup completed: ${totalRecords} records from ${tablesToBackup.length} tables`);

  return { backupData, errors };
}
