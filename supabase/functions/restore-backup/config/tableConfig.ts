
/**
 * تكوين جداول قاعدة البيانات
 * يحدد ترتيب استعادة الجداول والحقول المفتاحية والإعدادات الخاصة بكل جدول
 */

// قائمة الجداول التي سيتم مسحها قبل استعادة النسخة الاحتياطية
export const tablesToClear = [
  'party_balances',
  'parties',
  'financial_balance',
  'financial_transactions',
  'cash_operations',
  'financial_categories',
  'invoices',
  'invoice_items',
  'payments',
  'returns',
  'return_items',
  'profits',
  'ledger',
  'raw_materials',
  'semi_finished_products',
  'packaging_materials',
  'finished_products',
  'semi_finished_ingredients',
  'finished_product_packaging',
  'production_orders',
  'production_order_ingredients',
  'packaging_orders',
  'packaging_order_materials',
  'inventory_movements'
];

// قائمة الجداول التي سيتم استعادتها من النسخة الاحتياطية
export const tablesToRestore = [
  'financial_categories',
  'raw_materials',
  'semi_finished_products',
  'packaging_materials',
  'finished_products',
  'parties',
  'party_balances',
  'semi_finished_ingredients',
  'finished_product_packaging',
  'production_orders',
  'production_order_ingredients',
  'packaging_orders',
  'packaging_order_materials',
  'financial_balance',
  'financial_transactions',
  'cash_operations',
  'invoices',
  'invoice_items',
  'payments',
  'returns',
  'return_items',
  'profits',
  'ledger',
  'inventory_movements'
];

// الجداول التي تستخدم معرفات صحيحة كمفاتيح أساسية وتحتاج إلى إعادة تعيين تسلسل
export const tablesWithIntegerPrimaryKeys = [
  'raw_materials',
  'semi_finished_products',
  'packaging_materials',
  'finished_products',
  'semi_finished_ingredients',
  'finished_product_packaging',
  'production_orders',
  'production_order_ingredients',
  'packaging_orders',
  'packaging_order_materials'
];

// الجداول التي تحتوي على حقول UUID وتحتاج إلى التحقق منها
export const tablesWithUuids = [
  'parties',
  'party_balances',
  'financial_transactions',
  'invoices',
  'invoice_items',
  'payments',
  'returns',
  'return_items',
  'profits',
  'ledger',
  'inventory_movements'
];

// الحقول المحسوبة التي يجب إزالتها قبل الإدراج
export const tablesWithComputedFields = {
  'invoices': ['total_amount'],
  'invoice_items': ['total'],
  'payments': [],
  'returns': [],
  'ledger': ['balance_after']
};

// الجداول التي تحتاج إلى استعادة بترتيب خاص للتعامل مع العلاقات
export const priorityRestoreOrder = [
  'parties',               // استعادة الأطراف أولاً
  'party_balances',        // ثم أرصدة الأطراف
  'invoices',              // ثم الفواتير
  'invoice_items',         // ثم بنود الفواتير
  'ledger'                 // ثم سجل الحساب
];

// إعدادات العلاقات بين الجداول
export const tableRelationships = {
  'invoice_items': {
    parentTable: 'invoices',
    foreignKey: 'invoice_id'
  },
  'ledger': {
    parentTable: 'parties',
    foreignKey: 'party_id'
  },
  'party_balances': {
    parentTable: 'parties',
    foreignKey: 'party_id'
  }
};

/**
 * تكوين الجداول
 * يحدد الإعدادات والسلوك الخاص بكل جدول أثناء الاستعادة
 */
export const tableConfig = {
  /**
   * ترتيب الجداول للاستعادة
   * مهم جدًا استعادة الجداول بالترتيب الصحيح بسبب قيود المفاتيح الخارجية
   */
  restoreOrder: [
    // البيانات الأساسية أولاً (بدون تبعيات)
    'financial_categories',
    'raw_materials',
    'semi_finished_products',
    'packaging_materials',
    'finished_products',
    
    // الأطراف التجارية وأرصدتهم - مهم جداً أن يتم حفظهم واستعادتهم بهذا الترتيب
    'parties',
    'party_balances',
    
    // الجداول العلائقية
    'semi_finished_ingredients',
    'finished_product_packaging',
    
    // جداول الإنتاج
    'production_orders',
    'production_order_ingredients',
    'packaging_orders',
    'packaging_order_materials',
    
    // الحسابات والمعاملات المالية
    'financial_balance',
    'financial_transactions',
    'cash_operations',
    
    // المعاملات التجارية
    'invoices',
    'invoice_items',
    'payments',
    'returns',
    'return_items',
    'profits',
    'ledger',
    
    // حركات المخزون
    'inventory_movements'
  ],
  
  /**
   * تكوين الجداول
   * يحدد الإعدادات والسلوك الخاص بكل جدول أثناء الاستعادة
   */
  tables: {
    // إعدادات خاصة لجدول party_balances
    'party_balances': {
      mustLinkTo: 'parties', // يجب أن يكون هناك ارتباط بجدول الأطراف
      foreignKey: 'party_id', // اسم حقل المفتاح الخارجي
      primaryTable: 'parties', // الجدول الأساسي المرتبط به
      primaryKey: 'id', // اسم حقل المفتاح الأساسي في الجدول الأساسي
      
      // وظيفة خاصة تُستدعى بعد استعادة البيانات في هذا الجدول
      afterRestore: async (client: any, data: any[]) => {
        // التحقق من أن جميع الأطراف لها أرصدة
        try {
          console.log('Verifying parties have balances...');
          
          // الحصول على جميع الأطراف
          const { data: parties, error: partiesError } = await client
            .from('parties')
            .select('id, name, balance_type, opening_balance');
            
          if (partiesError) {
            console.error('Error fetching parties:', partiesError);
            return;
          }
          
          // الحصول على جميع سجلات الأرصدة
          const { data: balances, error: balancesError } = await client
            .from('party_balances')
            .select('party_id');
            
          if (balancesError) {
            console.error('Error fetching balances:', balancesError);
            return;
          }
          
          // تحويل سجلات الأرصدة إلى مجموعة للبحث السريع
          const balancePartyIds = new Set(balances.map((b: any) => b.party_id));
          
          // البحث عن الأطراف التي ليس لها أرصدة
          const partiesWithoutBalances = parties.filter((p: any) => !balancePartyIds.has(p.id));
          
          if (partiesWithoutBalances.length > 0) {
            console.log(`Found ${partiesWithoutBalances.length} parties without balances. Creating balances...`);
            
            // إنشاء سجلات أرصدة جديدة
            const newBalances = partiesWithoutBalances.map((party: any) => {
              // حساب الرصيد الافتتاحي بناءً على نوع الرصيد
              const initialBalance = party.balance_type === 'credit' 
                ? -Number(party.opening_balance || 0) 
                : Number(party.opening_balance || 0);
                
              return {
                party_id: party.id,
                balance: initialBalance,
                last_updated: new Date().toISOString()
              };
            });
            
            // إدراج سجلات الأرصدة الجديدة
            const { error: insertError } = await client
              .from('party_balances')
              .insert(newBalances);
              
            if (insertError) {
              console.error('Error creating balances:', insertError);
            } else {
              console.log(`Successfully created ${newBalances.length} balance records`);
            }
          } else {
            console.log('All parties have balances');
          }
        } catch (error) {
          console.error('Error in party_balances afterRestore:', error);
        }
      }
    },
    
    // إعدادات خاصة لجدول invoice_items
    'invoice_items': {
      mustLinkTo: 'invoices', // يجب أن يكون هناك ارتباط بجدول الفواتير
      foreignKey: 'invoice_id', // اسم حقل المفتاح الخارجي
      primaryTable: 'invoices', // الجدول الأساسي المرتبط به
      primaryKey: 'id', // اسم حقل المفتاح الأساسي في الجدول الأساسي
      
      // وظيفة خاصة تُستدعى قبل استعادة البيانات لهذا الجدول
      prepareForRestore: (items: any[]) => {
        console.log(`Preparing ${items.length} invoice items for restore...`);
        
        // إزالة حقل total من جميع العناصر لأنه يتم حسابه تلقائيًا
        return items.map(item => {
          const { total, ...itemWithoutTotal } = item;
          
          // حساب total كعملية ضرب الكمية بسعر الوحدة
          const calculatedTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
          
          // إعادة العنصر مع تحديث حقل total فقط إذا كان هناك سبب لتعيينه (اختياري)
          return {
            ...itemWithoutTotal,
            // إعادة حساب حقل total لضمان دقته
            total: calculatedTotal
          };
        });
      }
    },
    
    // إعدادات خاصة لجدول ledger (سجل الحساب)
    'ledger': {
      mustLinkTo: 'parties', // يجب أن يكون هناك ارتباط بجدول الأطراف
      foreignKey: 'party_id', // اسم حقل المفتاح الخارجي
      primaryTable: 'parties', // الجدول الأساسي المرتبط به
      primaryKey: 'id', // اسم حقل المفتاح الأساسي في الجدول الأساسي
      
      // وظيفة خاصة تُستدعى قبل استعادة البيانات لهذا الجدول
      prepareForRestore: (entries: any[]) => {
        console.log(`Preparing ${entries.length} ledger entries for restore...`);
        
        // فرز المدخلات حسب تاريخ الإنشاء والطرف التجاري
        const sortedEntries = [...entries].sort((a, b) => {
          // أولاً، رتب حسب الطرف التجاري
          if (a.party_id !== b.party_id) {
            return a.party_id > b.party_id ? 1 : -1;
          }
          // ثم رتب حسب التاريخ
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        
        // إنشاء مخطط للأرصدة لكل طرف تجاري
        const partyBalanceMap: Record<string, number> = {};
        
        // تحديث حقل balance_after لكل مدخل
        return sortedEntries.map(entry => {
          // الحصول على رصيد الطرف الحالي، أو تعيينه إلى 0 إذا لم يكن موجوداً
          if (!partyBalanceMap[entry.party_id]) {
            partyBalanceMap[entry.party_id] = 0;
          }
          
          // حساب الرصيد بعد الحركة
          const debit = parseFloat(entry.debit || 0);
          const credit = parseFloat(entry.credit || 0);
          
          // تحديث رصيد الطرف
          partyBalanceMap[entry.party_id] += debit - credit;
          
          // إنشاء نسخة جديدة من المدخل مع تحديث balance_after
          return {
            ...entry,
            balance_after: partyBalanceMap[entry.party_id]
          };
        });
      },
      
      // وظيفة خاصة تُستدعى بعد استعادة البيانات لهذا الجدول
      afterRestore: async (client: any, data: any[]) => {
        try {
          console.log('Updating party balances based on ledger entries...');
          
          // الحصول على جميع الأطراف
          const { data: parties, error: partiesError } = await client
            .from('parties')
            .select('id, name, balance_type, opening_balance');
            
          if (partiesError) {
            console.error('Error fetching parties:', partiesError);
            return;
          }
          
          // لكل طرف، نحدث رصيده بناءً على آخر حركة في سجل الحساب
          for (const party of parties) {
            try {
              // الحصول على آخر حركة في سجل الحساب للطرف
              const { data: latestEntry, error: entryError } = await client
                .from('ledger')
                .select('balance_after')
                .eq('party_id', party.id)
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle();
                
              if (entryError) {
                console.error(`Error fetching latest ledger entry for party ${party.id}:`, entryError);
                continue;
              }
              
              // إذا كان هناك حركات في سجل الحساب، نستخدم آخر رصيد
              // وإلا نستخدم الرصيد الافتتاحي
              let finalBalance;
              
              if (latestEntry) {
                finalBalance = latestEntry.balance_after;
              } else {
                // الرصيد الافتتاحي، مع مراعاة نوع الرصيد
                finalBalance = party.balance_type === 'credit' 
                  ? -Number(party.opening_balance || 0) 
                  : Number(party.opening_balance || 0);
              }
              
              // تحديث رصيد الطرف
              const { data: existingBalance, error: balanceError } = await client
                .from('party_balances')
                .select('*')
                .eq('party_id', party.id);
                
              if (balanceError) {
                console.error(`Error checking balance for party ${party.id}:`, balanceError);
                continue;
              }
              
              if (existingBalance && existingBalance.length > 0) {
                // إذا كان هناك أكثر من سجل، نحذف السجلات الزائدة
                if (existingBalance.length > 1) {
                  console.warn(`Found ${existingBalance.length} balance records for party ${party.id}, keeping only one`);
                  
                  // حذف السجلات الزائدة
                  for (let i = 1; i < existingBalance.length; i++) {
                    await client
                      .from('party_balances')
                      .delete()
                      .eq('id', existingBalance[i].id);
                  }
                }
                
                // تحديث سجل الرصيد الموجود
                const { error: updateError } = await client
                  .from('party_balances')
                  .update({ 
                    balance: finalBalance,
                    last_updated: new Date().toISOString()
                  })
                  .eq('id', existingBalance[0].id);
                  
                if (updateError) {
                  console.error(`Error updating balance for party ${party.id}:`, updateError);
                } else {
                  console.log(`Updated balance for party ${party.id} to ${finalBalance}`);
                }
              } else {
                // إنشاء سجل جديد للرصيد
                const { error: insertError } = await client
                  .from('party_balances')
                  .insert({
                    party_id: party.id,
                    balance: finalBalance,
                    last_updated: new Date().toISOString()
                  });
                  
                if (insertError) {
                  console.error(`Error creating balance for party ${party.id}:`, insertError);
                } else {
                  console.log(`Created balance for party ${party.id} with value ${finalBalance}`);
                }
              }
            } catch (error) {
              console.error(`Error processing party ${party.id}:`, error);
            }
          }
        } catch (error) {
          console.error('Error in ledger afterRestore:', error);
        }
      }
    },
    
    'financial_balance': {
      // التأكد من وجود سجل واحد على الأقل لأرصدة الخزينة
      afterRestore: async (client: any, data: any[]) => {
        try {
          // التحقق من وجود سجل
          const { data: balance, error } = await client
            .from('financial_balance')
            .select('*')
            .eq('id', '1')
            .maybeSingle();
            
          if (error) {
            console.error('Error checking financial balance:', error);
            return;
          }
          
          // إذا لم يكن هناك سجل، نقوم بإنشاء سجل افتراضي
          if (!balance) {
            console.log('No financial balance record found. Creating default...');
            
            const { error: insertError } = await client
              .from('financial_balance')
              .insert({
                id: '1',
                cash_balance: 0,
                bank_balance: 0,
                last_updated: new Date().toISOString()
              });
              
            if (insertError) {
              console.error('Error creating financial balance:', insertError);
            } else {
              console.log('Successfully created financial balance record');
            }
          }
        } catch (error) {
          console.error('Error in financial_balance afterRestore:', error);
        }
      }
    }
  }
};

export default {
  tablesToClear,
  tablesToRestore,
  tablesWithIntegerPrimaryKeys,
  tablesWithUuids,
  tablesWithComputedFields,
  priorityRestoreOrder,
  tableRelationships,
  tableConfig
};
