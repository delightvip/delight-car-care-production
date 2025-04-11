
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BackupMetadata, RestoreError } from "../types";

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
        
        // Fix: Calculate total records count properly
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
  
  // تحسين: إضافة آلية محاولة إعادة الاتصال
  const callRestoreFunction = async (fileContent: string, retries = 3): Promise<any> => {
    try {
      console.log("Calling restore function with retry mechanism...");
      
      // تغيير طريقة الاستدعاء لتجنب مشكلة CORS - إزالة الهيدر المسبب للمشكلة
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
            
            // التحقق من أرصدة الأطراف - تعديل طريقة الاستعلام
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
