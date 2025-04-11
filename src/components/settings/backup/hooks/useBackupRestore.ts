
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackupMetadata, RestoreError } from "../types";
import { toast } from "sonner";

export const useBackupRestore = () => {
  const [isValidating, setIsValidating] = useState(false);
  
  const validateFile = async (file: File): Promise<{ 
    valid: boolean; 
    metadata: BackupMetadata | null; 
    error: string | null;
  }> => {
    setIsValidating(true);
    try {
      if (file.size > 50 * 1024 * 1024) {
        return {
          valid: false,
          metadata: null,
          error: "حجم الملف كبير جداً. الحد الأقصى هو 50 ميجابايت"
        };
      }
      
      const fileContent = await file.text();
      
      try {
        const jsonData = JSON.parse(fileContent);
        
        const requiredTables = ['parties', 'party_balances', 'financial_balance'];
        const missingTables = requiredTables.filter(table => !jsonData[table] || jsonData[table].length === 0);
        
        if (missingTables.length > 0) {
          return {
            valid: false,
            metadata: null,
            error: `النسخة الاحتياطية غير مكتملة. الجداول التالية غير موجودة أو فارغة: ${missingTables.join(', ')}`
          };
        }
        
        // التحقق من وجود بنود الفواتير
        if (!jsonData['invoice_items'] || jsonData['invoice_items'].length === 0) {
          console.warn("تحذير: لا توجد بنود فواتير في النسخة الاحتياطية");
        } else {
          console.log(`تم العثور على ${jsonData['invoice_items'].length} بند فاتورة في النسخة الاحتياطية`);
        }
        
        if (jsonData['parties'] && jsonData['party_balances']) {
          const partyIds = new Set(jsonData['parties'].map((p: any) => p.id));
          const balancePartyIds = new Set(jsonData['party_balances'].map((b: any) => b.party_id));
          
          const partiesWithoutBalances = [...partyIds].filter(id => !balancePartyIds.has(id));
          
          if (partiesWithoutBalances.length > 0) {
            console.warn(`تحذير: هناك ${partiesWithoutBalances.length} من الأطراف بدون أرصدة في النسخة الاحتياطية`);
          }
          
          // تحقق من وجود أرصدة مكررة
          const partyBalancesMap = new Map();
          const duplicateBalances = [];
          
          jsonData['party_balances'].forEach((balance: any) => {
            if (partyBalancesMap.has(balance.party_id)) {
              duplicateBalances.push(balance);
            } else {
              partyBalancesMap.set(balance.party_id, balance);
            }
          });
          
          if (duplicateBalances.length > 0) {
            console.warn(`تحذير: هناك ${duplicateBalances.length} أرصدة مكررة في النسخة الاحتياطية. سيتم معالجتها أثناء الاستعادة.`);
          }
        }
        
        // التحقق من الفواتير وبنودها
        if (jsonData['invoices'] && jsonData['invoice_items']) {
          const invoiceIds = new Set(jsonData['invoices'].map((inv: any) => inv.id));
          const invoiceItemInvoiceIds = new Set(jsonData['invoice_items'].map((item: any) => item.invoice_id));
          
          const itemsWithoutInvoice = [...invoiceItemInvoiceIds].filter(id => !invoiceIds.has(id));
          const invoicesWithoutItems = [...invoiceIds].filter(id => 
            !jsonData['invoice_items'].some((item: any) => item.invoice_id === id)
          );
          
          if (itemsWithoutInvoice.length > 0) {
            console.warn(`تحذير: هناك ${itemsWithoutInvoice.length} بند فاتورة بدون فاتورة مرتبطة`);
          }
          
          if (invoicesWithoutItems.length > 0) {
            console.warn(`تحذير: هناك ${invoicesWithoutItems.length} فاتورة بدون بنود`);
          }
        }
        
        if (jsonData['__metadata']) {
          return {
            valid: true,
            metadata: jsonData['__metadata'] as BackupMetadata,
            error: null
          };
        } 
        
        const tableKeys = Object.keys(jsonData).filter(key => !key.startsWith('__'));
        if (tableKeys.length === 0) {
          return {
            valid: false,
            metadata: null,
            error: "الملف لا يحتوي على بيانات صالحة للاستعادة"
          };
        }
        
        // حساب إجمالي عدد السجلات بشكل صحيح
        let totalRecords = 0;
        Object.entries(jsonData).forEach(([key, table]) => {
          if (key !== '__metadata' && Array.isArray(table)) {
            totalRecords += (table as any[]).length;
          }
        });
            
        return {
          valid: true,
          metadata: {
            timestamp: new Date().toISOString(),
            tablesCount: tableKeys.length,
            version: "unknown",
            recordsCount: totalRecords
          },
          error: null
        };
        
      } catch (e) {
        return {
          valid: false,
          metadata: null,
          error: "ملف النسخة الاحتياطية غير صالح"
        };
      }
    } catch (e) {
      console.error("Error reading backup file:", e);
      return {
        valid: false,
        metadata: null,
        error: "حدث خطأ أثناء قراءة الملف"
      };
    } finally {
      setIsValidating(false);
    }
  };
  
  // استدعاء وظيفة استعادة النسخة الاحتياطية مع آلية محاولة إعادة الاتصال
  const callRestoreFunction = async (fileContent: string, retries = 3): Promise<any> => {
    try {
      console.log("Calling restore function with retry mechanism...");
      
      // استدعاء وظيفة استعادة النسخة الاحتياطية مع التعامل مع CORS
      const { data, error } = await supabase.functions.invoke("restore-backup", {
        body: { backup: fileContent }
      });
      
      if (error) {
        console.error("Backup restoration error:", error);
        throw error;
      }
      
      return { data, error: null };
    } catch (error: any) {
      console.warn(`Error calling restore function (retries left: ${retries}):`, error);
      
      if (retries > 0) {
        console.log(`Retrying restoration... (${retries} attempts left)`);
        // تأخير قبل إعادة المحاولة - كل مرة سنزيد فترة الانتظار
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 3000));
        return callRestoreFunction(fileContent, retries - 1);
      }
      
      throw error;
    }
  };
  
  // معالجة البيانات قبل الاستعادة
  const preprocessBackupData = (jsonData: any): any => {
    console.log("Preprocessing backup data...");
    
    if (jsonData['parties'] && jsonData['party_balances']) {
      const partyIds = new Set(jsonData['parties'].map((p: any) => p.id));
      const balancePartyIds = new Set(jsonData['party_balances'].map((b: any) => b.party_id));
      
      // إضافة الأرصدة المفقودة
      const partiesWithoutBalances = [...partyIds].filter(id => !balancePartyIds.has(id));
      
      if (partiesWithoutBalances.length > 0) {
        console.log(`تم العثور على ${partiesWithoutBalances.length} من الأطراف بدون أرصدة. جاري إنشاء الأرصدة المفقودة...`);
        
        for (const partyId of partiesWithoutBalances) {
          const party = jsonData['parties'].find((p: any) => p.id === partyId);
          if (party) {
            const initialBalance = party.balance_type === 'credit' 
              ? -parseFloat(party.opening_balance || 0) 
              : parseFloat(party.opening_balance || 0);
              
            jsonData['party_balances'].push({
              id: crypto.randomUUID(),
              party_id: partyId,
              balance: initialBalance,
              last_updated: new Date().toISOString()
            });
          }
        }
        
        console.log(`تمت إضافة ${partiesWithoutBalances.length} سجل رصيد للأطراف بدون أرصدة`);
      }
      
      // إزالة الأرصدة المكررة
      const partyBalancesMap = new Map();
      let duplicateCount = 0;
      
      // الاحتفاظ بأول سجل لكل طرف فقط
      jsonData['party_balances'].forEach((balance: any) => {
        if (!partyBalancesMap.has(balance.party_id)) {
          partyBalancesMap.set(balance.party_id, balance);
        } else {
          duplicateCount++;
        }
      });
      
      if (duplicateCount > 0) {
        console.log(`تم العثور على ${duplicateCount} أرصدة مكررة. جاري إزالة التكرارات...`);
        jsonData['party_balances'] = Array.from(partyBalancesMap.values());
        console.log(`تمت إزالة الأرصدة المكررة. العدد الجديد: ${jsonData['party_balances'].length}`);
      }
    }
    
    // معالجة خاصة لجدول invoice_items
    if (jsonData['invoice_items'] && jsonData['invoice_items'].length > 0) {
      console.log(`معالجة عناصر الفواتير (${jsonData['invoice_items'].length} عنصر)...`);
      
      // إحصاء الفواتير المرتبطة ببنود الفواتير
      const invoiceIdSet = new Set();
      jsonData['invoice_items'].forEach((item: any) => {
        if (item.invoice_id) {
          invoiceIdSet.add(item.invoice_id);
        }
      });
      console.log(`عدد الفواتير المختلفة في جدول invoice_items: ${invoiceIdSet.size}`);
      
      // إعادة حساب حقل total لجميع بنود الفواتير
      jsonData['invoice_items'] = jsonData['invoice_items'].map((item: any) => {
        // تحويل القيم إلى أرقام
        const quantity = parseFloat(item.quantity || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        
        // حساب المجموع الصحيح
        const calculatedTotal = quantity * unitPrice;
        
        // إنشاء نسخة معدلة من العنصر
        return {
          ...item,
          quantity: quantity,
          unit_price: unitPrice,
          total: calculatedTotal
        };
      });
      
      console.log(`تم إعادة حساب حقل total لجميع بنود الفواتير (${jsonData['invoice_items'].length} بند)`);
    } else {
      console.warn("لا توجد بنود فواتير في النسخة الاحتياطية!");
    }
    
    // إذا كان جدول ledger موجودًا، نتأكد من حقل balance_after
    if (jsonData['ledger'] && jsonData['ledger'].length > 0) {
      console.log(`معالجة سجلات الحساب (${jsonData['ledger'].length} سجل)...`);
      
      // فرز سجلات الحساب حسب الطرف والتاريخ
      jsonData['ledger'].sort((a: any, b: any) => {
        if (a.party_id !== b.party_id) {
          return a.party_id > b.party_id ? 1 : -1;
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      // إعادة حساب balance_after
      const partyBalances: Record<string, number> = {};
      
      jsonData['ledger'].forEach((entry: any) => {
        if (!partyBalances[entry.party_id]) {
          // البحث عن الرصيد الافتتاحي للطرف
          const party = jsonData['parties']?.find((p: any) => p.id === entry.party_id);
          if (party) {
            partyBalances[entry.party_id] = party.balance_type === 'credit' 
              ? -parseFloat(party.opening_balance || 0) 
              : parseFloat(party.opening_balance || 0);
          } else {
            partyBalances[entry.party_id] = 0;
          }
        }
        
        // تحديث الرصيد بناءً على الحركة
        const debit = parseFloat(entry.debit || 0);
        const credit = parseFloat(entry.credit || 0);
        partyBalances[entry.party_id] += debit - credit;
        
        // تحديث balance_after
        entry.balance_after = partyBalances[entry.party_id];
      });
    }
    
    // التحقق من الفواتير وحسابها
    if (jsonData['invoices'] && jsonData['invoices'].length > 0) {
      const invoicesWithoutTotal = jsonData['invoices'].filter((inv: any) => 
        inv.total_amount === null || inv.total_amount === undefined
      );
      
      if (invoicesWithoutTotal.length > 0) {
        console.log(`هناك ${invoicesWithoutTotal.length} فاتورة بدون قيمة إجمالية`);
      }
      
      // إعادة حساب مجاميع الفواتير
      if (jsonData['invoice_items'] && jsonData['invoice_items'].length > 0) {
        // حساب مجموع كل فاتورة بناءً على بنودها
        const invoiceTotals: Record<string, number> = {};
        
        jsonData['invoice_items'].forEach((item: any) => {
          if (item.invoice_id) {
            const itemTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
            invoiceTotals[item.invoice_id] = (invoiceTotals[item.invoice_id] || 0) + itemTotal;
          }
        });
        
        // تحديث مجاميع الفواتير
        jsonData['invoices'] = jsonData['invoices'].map((invoice: any) => {
          if (invoiceTotals[invoice.id]) {
            return {
              ...invoice,
              total_amount: invoiceTotals[invoice.id]
            };
          }
          return invoice;
        });
        
        console.log(`تم تحديث مجاميع ${Object.keys(invoiceTotals).length} فاتورة`);
      }
    }
    
    return jsonData;
  };
  
  const restoreBackup = async (file: File): Promise<{
    success: boolean;
    errors: RestoreError[] | null;
  }> => {
    try {
      let fileContent = await file.text();
      
      try {
        // تحليل البيانات
        const jsonData = JSON.parse(fileContent);
        
        // معالجة البيانات قبل الاستعادة
        const processedData = preprocessBackupData(jsonData);
        
        // تحويل البيانات المعالجة إلى نص
        fileContent = JSON.stringify(processedData);
        
      } catch (e) {
        return {
          success: false,
          errors: [{ 
            table: 'system',
            operation: 'validate',
            error: 'ملف النسخة الاحتياطية غير صالح' 
          }]
        };
      }
      
      try {
        // استخدام الدالة المُحسّنة مع محاولات إعادة الاتصال
        const { data, error } = await callRestoreFunction(fileContent);
        
        if (error) {
          console.error("Backup restoration error:", error);
          return {
            success: false,
            errors: [{ 
              table: 'system',
              operation: 'restore',
              error: error.message 
            }]
          };
        }
        
        console.log("Backup restoration response:", data);
        
        if (data.success) {
          try {
            console.log("Verifying restoration results...");
            
            // التحقق من أرصدة الأطراف
            const { count: partyBalancesCount, error: balanceCheckError } = await supabase
              .from('party_balances')
              .select('*', { count: 'exact', head: true });
              
            console.log("Party balances check result:", partyBalancesCount);
              
            if (balanceCheckError) {
              console.error("Error checking party balances:", balanceCheckError);
            }
            
            // التحقق من الرصيد المالي
            const { data: financialBalance, error: financialError } = await supabase
              .from('financial_balance')
              .select('*')
              .maybeSingle();
              
            if (financialError) {
              console.error("Error checking financial balance:", financialError);
            } else {
              console.log("Financial balance restored:", financialBalance);
            }
            
            // التحقق من استعادة الفواتير
            const { count: invoicesCount, error: invoicesCheckError } = await supabase
              .from('invoices')
              .select('*', { count: 'exact', head: true });
              
            console.log("Invoices restored:", invoicesCount);
              
            if (invoicesCheckError) {
              console.error("Error checking invoices:", invoicesCheckError);
            }
            
            // التحقق من استعادة بنود الفواتير
            const { count: invoiceItemsCount, error: itemsCheckError } = await supabase
              .from('invoice_items')
              .select('*', { count: 'exact', head: true });
              
            console.log("Invoice items restored:", invoiceItemsCount);
              
            if (itemsCheckError) {
              console.error("Error checking invoice items:", itemsCheckError);
            } else if (invoiceItemsCount === 0) {
              console.warn("تحذير: لم يتم استعادة أي بنود فواتير!");
            }
          } catch (verificationError) {
            console.error("Error during verification:", verificationError);
          }
        }
        
        return {
          success: data.success,
          errors: data.errors || null
        };
      } catch (error: any) {
        console.error("Backup restoration error:", error);
        return {
          success: false,
          errors: [{ 
            table: 'system',
            operation: 'restore',
            error: error?.message || 'حدث خطأ غير معروف' 
          }]
        };
      }
    } catch (error: any) {
      console.error("Backup restoration error:", error);
      return {
        success: false,
        errors: [{ 
          table: 'system',
          operation: 'restore',
          error: error?.message || 'حدث خطأ غير معروف' 
        }]
      };
    }
  };
  
  return {
    validateFile,
    restoreBackup,
    isValidating
  };
};
