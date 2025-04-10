
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
        
        // Fix: Properly type the calculation of total records
        const totalRecords = Object.values(jsonData)
          .reduce((total: number, table: any) => 
            total + (Array.isArray(table) ? table.length : 0), 0);
            
        return {
          valid: true,
          metadata: {
            timestamp: new Date().toISOString(),
            tablesCount: tableKeys.length,
            version: "unknown",
            recordsCount: totalRecords // Now properly typed as number
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
  
  const restoreBackup = async (file: File): Promise<{
    success: boolean;
    errors: RestoreError[] | null;
  }> => {
    try {
      let fileContent = await file.text();
      
      try {
        const jsonData = JSON.parse(fileContent);
        
        if (jsonData['parties'] && jsonData['party_balances']) {
          const partyIds = new Set(jsonData['parties'].map((p: any) => p.id));
          const balancePartyIds = new Set(jsonData['party_balances'].map((b: any) => b.party_id));
          
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
            
            fileContent = JSON.stringify(jsonData);
            console.log(`تمت إضافة ${partiesWithoutBalances.length} سجل رصيد للأطراف بدون أرصدة`);
          }
        }
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
      
      const { data, error } = await supabase.functions.invoke("restore-backup", {
        body: { backup: fileContent }
      });
      
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
          console.log("Verifying party balances after restoration...");
          const { data: partyBalancesCheck, error: balanceCheckError } = await supabase
            .from('party_balances')
            .select('count(*)')
            .single();
            
          console.log("Party balances check result:", partyBalancesCheck);
            
          if (balanceCheckError) {
            console.error("Error checking party balances:", balanceCheckError);
          }
          
          const { data: financialBalance, error: financialError } = await supabase
            .from('financial_balance')
            .select('*')
            .single();
            
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
  };
  
  return {
    validateFile,
    restoreBackup,
    isValidating
  };
};
