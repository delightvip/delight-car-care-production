
/**
 * تكوين جداول قاعدة البيانات
 * يحدد ترتيب استعادة الجداول والحقول المفتاحية والإعدادات الخاصة بكل جدول
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
    // يمكن إضافة إعدادات خاصة لبعض الجداول
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
