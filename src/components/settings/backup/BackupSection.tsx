
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBackupDownloader } from "./hooks/useBackupDownloader";
import { Progress } from "@/components/ui/progress";

const BackupSection = () => {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [progress, setProgress] = useState(0);
  const { downloadBackup, isDownloading } = useBackupDownloader();

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setProgress(10); // بدء العملية
    try {
      toast.info("جاري إنشاء النسخة الاحتياطية، قد يستغرق هذا بعض الوقت...");
      
      setProgress(20); // جاري الاستعلام
      
      // Call the create backup function
      const { data, error } = await supabase.functions.invoke("create-backup");
      
      if (error) {
        console.error("Backup creation error:", error);
        toast.error("حدث خطأ أثناء إنشاء النسخة الاحتياطية");
        return;
      }
      
      setProgress(50); // تم استلام البيانات
      console.log("Backup creation response: data received");
      
      // If no data or URL is returned, show an error
      if (!data) {
        toast.error("حدث خطأ أثناء إنشاء النسخة الاحتياطية: لم يتم استلام بيانات");
        return;
      }
      
      setProgress(70); // تحضير للتنزيل
      
      // التحقق من وجود جميع الجداول الأساسية
      const essentialTables = ['parties', 'party_balances', 'financial_balance', 'financial_transactions', 'cash_operations'];
      const missingTables = essentialTables.filter(table => !data[table]);
      
      if (missingTables.length > 0) {
        toast.warning(`تنبيه: بعض الجداول الأساسية غير موجودة في النسخة الاحتياطية: ${missingTables.join(', ')}`);
      }
      
      setProgress(80); // جاري التنزيل
      
      // التحقق من وجود العلاقة بين الأطراف والأرصدة
      if (data['parties'] && data['party_balances']) {
        const partyCount = data['parties'].length;
        const balanceCount = data['party_balances'].length;
        
        // التحقق من أن عدد الأطراف مساوٍ لعدد سجلات الأرصدة
        if (partyCount !== balanceCount) {
          console.log(`تنبيه: عدد الأطراف (${partyCount}) لا يتطابق مع عدد سجلات الأرصدة (${balanceCount}) في النسخة الاحتياطية`);
          
          // تحقق إضافي من أي أطراف بدون أرصدة
          const partyIds = new Set(data['parties'].map((party: any) => party.id));
          const balancePartyIds = new Set(data['party_balances'].map((balance: any) => balance.party_id));
          
          const partiesWithoutBalances = [...partyIds].filter(id => !balancePartyIds.has(id));
          if (partiesWithoutBalances.length > 0) {
            console.log(`هناك ${partiesWithoutBalances.length} من الأطراف بدون أرصدة في النسخة الاحتياطية`);
          }
        } else {
          console.log(`تحقق ناجح: عدد الأطراف (${partyCount}) يتطابق مع عدد سجلات الأرصدة`);
        }
      }
      
      // Process and download the backup data
      const downloadSuccess = await downloadBackup(data);
      
      setProgress(100);
      
      if (downloadSuccess) {
        // Get metadata for the toast
        const recordCount = data.__metadata?.recordsCount || 'غير معروف';
        const tableCount = data.__metadata?.tablesCount || 'غير معروف';
        
        toast.success(`تم إنشاء وتنزيل النسخة الاحتياطية بنجاح (${tableCount} جداول، ${recordCount} سجل)`);
      } else {
        toast.error("حدث خطأ أثناء تنزيل النسخة الاحتياطية");
      }
    } catch (error) {
      console.error("Backup creation error:", error);
      toast.error("حدث خطأ أثناء إنشاء النسخة الاحتياطية");
    } finally {
      setIsCreatingBackup(false);
      setTimeout(() => setProgress(0), 1000); // إعادة تعيين شريط التقدم بعد ثانية
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">إنشاء نسخة احتياطية</h3>
      <p className="text-muted-foreground">
        قم بإنشاء نسخة احتياطية كاملة لبيانات النظام. يمكنك استخدام هذه النسخة لاستعادة البيانات لاحقاً.
      </p>
      
      {(isCreatingBackup || isDownloading) && progress > 0 && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            {progress < 50 ? 'جاري إنشاء النسخة الاحتياطية...' : 
             progress < 80 ? 'جاري تحضير البيانات للتنزيل...' : 
             'جاري تنزيل النسخة الاحتياطية...'}
          </p>
        </div>
      )}
      
      <div className="flex justify-end">
        <Button 
          onClick={handleCreateBackup} 
          disabled={isCreatingBackup || isDownloading}
          className="gap-2"
        >
          {(isCreatingBackup || isDownloading) ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              جاري إنشاء النسخة الاحتياطية...
            </>
          ) : (
            <>
              <Download size={16} />
              إنشاء وتنزيل نسخة احتياطية
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default BackupSection;
