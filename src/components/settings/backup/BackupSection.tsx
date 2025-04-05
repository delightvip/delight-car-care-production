
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BackupSection = () => {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      toast.info("جاري إنشاء النسخة الاحتياطية، قد يستغرق هذا بعض الوقت...");
      
      // Call the create backup function
      const { data, error } = await supabase.functions.invoke("create-backup");
      
      if (error) {
        console.error("Backup creation error:", error);
        toast.error("حدث خطأ أثناء إنشاء النسخة الاحتياطية");
        return;
      }
      
      if (!data?.url) {
        toast.error("حدث خطأ أثناء إنشاء النسخة الاحتياطية");
        return;
      }
      
      console.log("Backup creation response:", data);
      
      // Create a temporary link to download the backup
      const timestamp = new Date().toISOString().split("T")[0];
      const link = document.createElement("a");
      link.href = data.url;
      link.download = `backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("تم إنشاء وتنزيل النسخة الاحتياطية بنجاح");
    } catch (error) {
      console.error("Backup creation error:", error);
      toast.error("حدث خطأ أثناء إنشاء النسخة الاحتياطية");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">إنشاء نسخة احتياطية</h3>
      <p className="text-muted-foreground">
        قم بإنشاء نسخة احتياطية كاملة لبيانات النظام. يمكنك استخدام هذه النسخة لاستعادة البيانات لاحقاً.
      </p>
      <div className="flex justify-end">
        <Button 
          onClick={handleCreateBackup} 
          disabled={isCreatingBackup}
          className="gap-2"
        >
          {isCreatingBackup ? (
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
