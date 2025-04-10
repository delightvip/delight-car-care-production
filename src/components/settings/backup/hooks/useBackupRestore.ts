
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
      // Check file size - زيادة الحد الأقصى إلى 50 ميجابايت
      if (file.size > 50 * 1024 * 1024) {
        return {
          valid: false,
          metadata: null,
          error: "حجم الملف كبير جداً. الحد الأقصى هو 50 ميجابايت"
        };
      }
      
      // Read file content
      const fileContent = await file.text();
      
      try {
        const jsonData = JSON.parse(fileContent);
        
        // التحقق من وجود البيانات الأساسية
        const requiredTables = ['parties', 'party_balances'];
        const missingTables = requiredTables.filter(table => !jsonData[table] || jsonData[table].length === 0);
        
        if (missingTables.length > 0) {
          return {
            valid: false,
            metadata: null,
            error: `النسخة الاحتياطية غير مكتملة. الجداول التالية غير موجودة أو فارغة: ${missingTables.join(', ')}`
          };
        }
        
        // Check for metadata
        if (jsonData['__metadata']) {
          return {
            valid: true,
            metadata: jsonData['__metadata'] as BackupMetadata,
            error: null
          };
        } 
        
        // If no metadata, check if it at least has some tables
        const tableKeys = Object.keys(jsonData).filter(key => !key.startsWith('__'));
        if (tableKeys.length === 0) {
          return {
            valid: false,
            metadata: null,
            error: "الملف لا يحتوي على بيانات صالحة للاستعادة"
          };
        }
        
        // Create generic metadata for files without it
        return {
          valid: true,
          metadata: {
            timestamp: new Date().toISOString(),
            tablesCount: tableKeys.length,
            version: "unknown"
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
      // Read the file
      const fileContent = await file.text();
      
      try {
        // Validate JSON first
        JSON.parse(fileContent);
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
      
      // Call the restore backup function
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
      
      // التحقق من استعادة أرصدة العملاء
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
