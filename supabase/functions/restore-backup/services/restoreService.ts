
import { 
  tablesToClear, 
  tablesToRestore, 
  tablesWithComputedFields,
  tablesWithIntegerPrimaryKeys,
  tablesWithUuids,
  priorityRestoreOrder,
  tableRelationships,
  tableConfig
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

// تحضير البيانات قبل الاستعادة باستخدام المعالجات المخصصة لكل جدول
function prepareTableDataForRestore(table: string, data: any[]) {
  const config = tableConfig.tables[table as keyof typeof tableConfig.tables];
  
  // التحقق مما إذا كان هناك معالج مخصص لهذا الجدول
  if (config && typeof config.prepareForRestore === 'function') {
    console.log(`Using custom prepare handler for table ${table}`);
    return config.prepareForRestore(data);
  }
  
  // إذا لم يكن هناك معالج مخصص، نقوم بمعالجة البيانات بشكل قياسي
  let preparedData = [...data];
  
  // إزالة الحقول المحسوبة إذا كان ذلك مطلوباً
  if (table in tablesWithComputedFields) {
    const fieldsToRemove = tablesWithComputedFields[table as keyof typeof tablesWithComputedFields];
    console.log(`Removing computed fields ${fieldsToRemove.join(', ')} from ${table}`);
    preparedData = removeComputedFields(preparedData, fieldsToRemove);
  }
  
  // تنظيف حقول UUID إذا كان ذلك مطلوباً
  if (tablesWithUuids.includes(table)) {
    const uuidFields = ['id', 'party_id', 'category_id', 'invoice_id', 'return_id', 
                      'transaction_id', 'related_invoice_id', 'reference_id'];
    preparedData = cleanUuids(preparedData, uuidFields);
  }
  
  return preparedData;
}

// معالجة دفعات البيانات بأحجام أصغر لتجنب أخطاء الاتصال
async function processBatchWithRetry(supabaseAdmin: any, table: string, batch: any[], batchIndex: number, totalBatches: number) {
  console.log(`Inserting batch ${batchIndex + 1} of ${totalBatches} for ${table}`);
  
  try {
    const { error } = await supabaseAdmin
      .from(table)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
      
    if (error) {
      console.error(`Error restoring batch for ${table}:`, error);
      
      // محاولة إدراج السجلات واحداً تلو الآخر في حالة فشل الدفعة
      console.log(`Attempting individual inserts for ${table}`);
      let successCount = 0;
      
      for (const record of batch) {
        try {
          const { error: indError } = await supabaseAdmin
            .from(table)
            .upsert([record], { onConflict: 'id' });
            
          if (!indError) {
            successCount++;
          }
        } catch (e) {
          // استمرار المحاولة مع السجل التالي
        }
      }
      
      console.log(`Successfully inserted ${successCount} of ${batch.length} records individually`);
      return { error, successCount };
    }
    
    return { error: null, successCount: batch.length };
  } catch (e) {
    console.error(`Exception inserting batch for ${table}:`, e);
    
    // محاولة بحجم دفعة أصغر
    if (batch.length > 1) {
      console.log(`Retrying with smaller batches for ${table}`);
      const mid = Math.floor(batch.length / 2);
      const firstHalf = batch.slice(0, mid);
      const secondHalf = batch.slice(mid);
      
      const result1 = await processBatchWithRetry(supabaseAdmin, table, firstHalf, batchIndex * 2, totalBatches * 2);
      const result2 = await processBatchWithRetry(supabaseAdmin, table, secondHalf, batchIndex * 2 + 1, totalBatches * 2);
      
      return { 
        error: e,
        successCount: result1.successCount + result2.successCount
      };
    }
    
    return { error: e, successCount: 0 };
  }
}

// Function to restore backup data
export async function restoreBackupData(supabaseAdmin: any, backupData: any) {
  const errors = [];
  const tablesRestored = [];
  
  // تحليل حالة الأرصدة قبل الاستعادة
  try {
    // تغيير طريقة استعلام عدد الأطراف لاستخدام صيغة مدعومة من PostgREST
    const { count: partiesCount, error: partiesCountError } = await supabaseAdmin
      .from('parties')
      .select('*', { count: 'exact', head: true });
      
    console.log(`الحالة الأولية: عدد الأطراف = ${partiesCount || 'غير متاح'}`);
    
    if (partiesCountError) {
      console.error("خطأ في التحقق من عدد الأطراف:", partiesCountError);
    }
    
    // تغيير طريقة استعلام عدد أرصدة الأطراف لاستخدام صيغة مدعومة من PostgREST
    const { count: balancesCount, error: balancesCountError } = await supabaseAdmin
      .from('party_balances')
      .select('*', { count: 'exact', head: true });
      
    console.log(`الحالة الأولية: عدد أرصدة الأطراف = ${balancesCount || 'غير متاح'}`);
    
    if (balancesCountError) {
      console.error("خطأ في التحقق من عدد أرصدة الأطراف:", balancesCountError);
    }
  } catch (initialCheckError) {
    console.error("خطأ في الفحص الأولي:", initialCheckError);
  }

  // استخدام ترتيب استعادة مخصص للجداول المرتبطة
  // تعطي الأولوية للجداول المحددة في priorityRestoreOrder ثم باقي الجداول
  const customRestoreOrder = [
    ...priorityRestoreOrder,
    ...tablesToRestore.filter(table => !priorityRestoreOrder.includes(table))
  ];

  console.log("ترتيب الاستعادة المخصص:", customRestoreOrder);
  
  for (const table of customRestoreOrder) {
    if (backupData[table] && backupData[table].length > 0) {
      console.log(`Restoring table ${table} (${backupData[table].length} records)`);
      
      // تحضير البيانات قبل الاستعادة
      let tableData = prepareTableDataForRestore(table, backupData[table]);
      
      // تقليل حجم الدفعة للتعامل مع كميات كبيرة من البيانات
      const batchSize = 20; // حجم دفعة صغير للتعامل مع البيانات الكبيرة
      const totalBatches = Math.ceil(tableData.length / batchSize);
      
      // تتبع عدد السجلات التي تمت استعادتها بنجاح
      let successfullyRestoredCount = 0;
      
      for (let i = 0; i < tableData.length; i += batchSize) {
        const batch = tableData.slice(i, i + batchSize);
        const batchIndex = Math.floor(i / batchSize);
        
        const { successCount } = await processBatchWithRetry(
          supabaseAdmin, 
          table, 
          batch, 
          batchIndex, 
          totalBatches
        );
        
        successfullyRestoredCount += successCount;
      }
      
      console.log(`تم استعادة ${successfullyRestoredCount} من أصل ${tableData.length} سجل في جدول ${table}`);
      tablesRestored.push(table);
      
      // استدعاء وظيفة afterRestore إذا كانت موجودة لهذا الجدول
      const config = tableConfig.tables[table as keyof typeof tableConfig.tables];
      if (config && typeof config.afterRestore === 'function') {
        console.log(`Running afterRestore for ${table}`);
        try {
          await config.afterRestore(supabaseAdmin, tableData);
        } catch (afterRestoreError) {
          console.error(`Error in afterRestore for ${table}:`, afterRestoreError);
        }
      }
    } else {
      console.log(`Skipping table ${table}: no data in backup`);
    }
  }
  
  // إعادة حساب أرصدة الأطراف بعد استعادة جميع البيانات
  const balanceErrors = await recalculatePartyBalances(supabaseAdmin);
  if (balanceErrors.length > 0) {
    errors.push(...balanceErrors);
  }
  
  return errors;
}

// وظيفة لإعادة حساب أرصدة الأطراف بناءً على سجل الحساب
export async function recalculatePartyBalances(supabaseAdmin: any): Promise<any[]> {
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
            
            // تحديث حقل balance_after في سجل الحساب
            const { error: updateError } = await supabaseAdmin
              .from('ledger')
              .update({ balance_after: currentBalance })
              .eq('id', entry.id);
              
            if (updateError) {
              console.error(`خطأ في تحديث حقل balance_after لمعاملة ${entry.id}:`, updateError);
            }
          }
          
          console.log(`الرصيد المحسوب: ${currentBalance}`);
        }
        
        // تحديث رصيد الطرف في جدول الأرصدة
        // أولاً، نتحقق من وجود سجل للرصيد - تعديل طريقة الاستعلام
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

// إعادة حساب مجاميع الفواتير بعد استعادة البيانات
export async function recalculateInvoiceTotals(supabaseAdmin: any): Promise<any[]> {
  const errors = [];
  
  try {
    console.log('بدء إعادة حساب مجاميع الفواتير...');
    
    // الحصول على جميع الفواتير
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select('id');
      
    if (invoicesError) {
      console.error('خطأ في جلب الفواتير:', invoicesError);
      return [{ table: 'invoices', operation: 'select', error: invoicesError.message }];
    }
    
    console.log(`تم العثور على ${invoices.length} فاتورة`);
    
    // لكل فاتورة، نحسب المجموع الصحيح
    for (const invoice of invoices) {
      try {
        // جلب بنود الفاتورة
        const { data: items, error: itemsError } = await supabaseAdmin
          .from('invoice_items')
          .select('quantity, unit_price, total')
          .eq('invoice_id', invoice.id);
          
        if (itemsError) {
          console.error(`خطأ في جلب بنود الفاتورة ${invoice.id}:`, itemsError);
          errors.push({ 
            table: 'invoice_items', 
            operation: 'select', 
            invoice_id: invoice.id, 
            error: itemsError.message 
          });
          continue;
        }
        
        // حساب مجموع الفاتورة
        let totalAmount = 0;
        
        for (const item of items) {
          // تحديث حقل total لكل بند إذا كان فارغاً
          const calculatedItemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
          
          if (!item.total || parseFloat(item.total) !== calculatedItemTotal) {
            const { error: updateItemError } = await supabaseAdmin
              .from('invoice_items')
              .update({ total: calculatedItemTotal })
              .eq('invoice_id', invoice.id)
              .eq('quantity', item.quantity)
              .eq('unit_price', item.unit_price);
              
            if (updateItemError) {
              console.error(`خطأ في تحديث حقل total لبند الفاتورة:`, updateItemError);
            }
          }
          
          totalAmount += calculatedItemTotal;
        }
        
        // تحديث مجموع الفاتورة
        const { error: updateInvoiceError } = await supabaseAdmin
          .from('invoices')
          .update({ total_amount: totalAmount })
          .eq('id', invoice.id);
          
        if (updateInvoiceError) {
          console.error(`خطأ في تحديث مجموع الفاتورة ${invoice.id}:`, updateInvoiceError);
          errors.push({ 
            table: 'invoices', 
            operation: 'update', 
            invoice_id: invoice.id, 
            error: updateInvoiceError.message 
          });
        } else {
          console.log(`تم تحديث مجموع الفاتورة ${invoice.id} بنجاح إلى ${totalAmount}`);
        }
      } catch (invoiceError) {
        console.error(`خطأ في معالجة الفاتورة ${invoice.id}:`, invoiceError);
        errors.push({ 
          table: 'invoices', 
          operation: 'process', 
          invoice_id: invoice.id, 
          error: invoiceError.message 
        });
      }
    }
    
    console.log(`اكتملت إعادة حساب مجاميع الفواتير. عدد الأخطاء: ${errors.length}`);
    return errors;
  } catch (error) {
    console.error('خطأ أثناء إعادة حساب مجاميع الفواتير:', error);
    return [{ table: 'invoices', operation: 'recalculate', error: error.message }];
  }
}
