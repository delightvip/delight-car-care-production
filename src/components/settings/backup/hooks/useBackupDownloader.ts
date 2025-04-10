
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
      
      // التأكد من أن جميع البيانات متاحة ولا يوجد قيود على حجم البيانات
      if (!backupData) {
        throw new Error("لم يتم استلام بيانات النسخة الاحتياطية");
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
      
      // إنشاء كائن Blob للتنزيل
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
