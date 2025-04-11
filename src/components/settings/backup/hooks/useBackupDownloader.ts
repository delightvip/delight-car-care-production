
import { useState } from "react";
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useBackupDownloader = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const downloadBackup = async (backupData: any) => {
    setIsDownloading(true);
    try {
      // إضافة البيانات الوصفية للنسخة الاحتياطية
      const currentDate = new Date();
      const formattedDate = format(currentDate, 'yyyy-MM-dd_HH-mm-ss');
      
      // التأكد من أن جميع البيانات متاحة
      if (!backupData) {
        throw new Error("لم يتم استلام بيانات النسخة الاحتياطية");
      }
      
      // التحقق من وجود جداول أساسية
      const requiredTables = ['parties', 'party_balances', 'financial_balance'];
      const missingTables = requiredTables.filter(table => !backupData[table] || backupData[table].length === 0);
      
      if (missingTables.length > 0) {
        toast.warning(`تنبيه: بعض الجداول الأساسية غير موجودة في النسخة الاحتياطية: ${missingTables.join(', ')}`);
        
        // إنشاء جدول أرصدة الخزينة إذا كان غير موجوداً
        if (missingTables.includes('financial_balance')) {
          backupData['financial_balance'] = [{
            id: '1',
            cash_balance: 0,
            bank_balance: 0,
            last_updated: new Date().toISOString()
          }];
          console.log('تم إنشاء بيانات افتراضية للأرصدة المالية');
        }
      }
      
      // التحقق من وجود العلاقة بين الأطراف وأرصدتهم
      if (backupData['parties'] && backupData['party_balances']) {
        const partyIds = new Set(backupData['parties'].map((party: any) => party.id));
        const balancePartyIds = new Set(backupData['party_balances'].map((balance: any) => balance.party_id));
        
        // الأطراف التي ليس لها أرصدة
        const partiesWithoutBalances = [...partyIds].filter(id => !balancePartyIds.has(id));
        
        if (partiesWithoutBalances.length > 0) {
          console.log(`هناك ${partiesWithoutBalances.length} من الأطراف بدون أرصدة، سيتم إنشاء أرصدة افتراضية لهم`);
          
          // إنشاء أرصدة افتراضية للأطراف التي ليس لها أرصدة
          for (const partyId of partiesWithoutBalances) {
            const party = backupData['parties'].find((p: any) => p.id === partyId);
            if (party) {
              const initialBalance = party.balance_type === 'credit' 
                ? -parseFloat(party.opening_balance || 0) 
                : parseFloat(party.opening_balance || 0);
                
              backupData['party_balances'].push({
                id: crypto.randomUUID(),
                party_id: partyId,
                balance: initialBalance,
                last_updated: new Date().toISOString()
              });
            }
          }
          
          console.log(`تم إنشاء ${partiesWithoutBalances.length} سجل رصيد جديد للأطراف بدون أرصدة`);
        }
      }
      
      // إضافة بيانات وصفية للنسخة الاحتياطية
      if (!backupData.__metadata) {
        backupData.__metadata = {
          timestamp: currentDate.toISOString(),
          version: "1.0",
          tablesCount: Object.keys(backupData).filter(key => key !== "__metadata").length,
          recordsCount: Object.keys(backupData)
            .filter(key => key !== "__metadata")
            .reduce((total, table) => total + (Array.isArray(backupData[table]) ? backupData[table].length : 0), 0)
        };
      }
      
      // تحويل البيانات إلى نص JSON مع مسافات بادئة للقراءة البشرية
      const jsonString = JSON.stringify(backupData, null, 2);
      
      // معالجة الملفات الكبيرة بتقنية Blob
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // إنشاء عنصر رابط وتنزيل الملف
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${formattedDate}.json`;
      document.body.appendChild(link);
      link.click();
      
      // تنظيف
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error("Error downloading backup:", error);
      toast.error("حدث خطأ أثناء تنزيل النسخة الاحتياطية");
      return false;
    } finally {
      setIsDownloading(false);
    }
  };
  
  return {
    downloadBackup,
    isDownloading
  };
};
