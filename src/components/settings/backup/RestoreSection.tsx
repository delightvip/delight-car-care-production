
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, RefreshCw, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBackupRestore } from "./hooks/useBackupRestore";
import { BackupMetadata } from "./types";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { BackupMetadataDisplay } from "./components/BackupMetadataDisplay";

const RestoreSection = () => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupMetadata, setBackupMetadata] = useState<BackupMetadata | null>(null);
  const [restoreErrors, setRestoreErrors] = useState<any[]>([]);
  
  const { validateFile, restoreBackup } = useBackupRestore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const { valid, metadata, error } = await validateFile(file);
      
      if (!valid) {
        toast.error(error || "ملف النسخة الاحتياطية غير صالح");
        e.target.value = '';
        return;
      }
      
      setBackupFile(file);
      setBackupMetadata(metadata);
      setRestoreErrors([]);
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupFile) {
      toast.error("الرجاء اختيار ملف النسخة الاحتياطية أولاً");
      return;
    }

    if (!window.confirm("سيؤدي هذا الإجراء إلى استبدال جميع البيانات الحالية. هل أنت متأكد من المتابعة؟")) {
      return;
    }

    setIsRestoring(true);
    setRestoreErrors([]);
    
    try {
      toast.info("جاري استعادة النسخة الاحتياطية، قد يستغرق هذا بعض الوقت...");
      
      // Call the restore function
      const { success, errors } = await restoreBackup(backupFile);
      
      if (success) {
        if (errors && errors.length > 0) {
          toast.warning(`تمت استعادة النسخة الاحتياطية مع وجود بعض الأخطاء (${errors.length})`);
          setRestoreErrors(errors);
        } else {
          toast.success("تمت استعادة النسخة الاحتياطية بنجاح");
          
          // Reload the application after a brief delay
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        toast.error("حدث خطأ أثناء استعادة النسخة الاحتياطية");
        if (errors) {
          setRestoreErrors(errors);
        }
      }
    } catch (error) {
      console.error("Backup restoration error:", error);
      toast.error("حدث خطأ أثناء استعادة النسخة الاحتياطية");
    } finally {
      setIsRestoring(false);
    }
  };

  const resetFileInput = () => {
    setBackupFile(null);
    setBackupMetadata(null);
    setRestoreErrors([]);
    // Reset the file input
    const fileInput = document.getElementById('backupFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">استعادة من نسخة احتياطية</h3>
      <p className="text-muted-foreground">
        قم باستعادة بيانات النظام من نسخة احتياطية سابقة. سيتم استبدال جميع البيانات الحالية.
      </p>
      
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>تحذير</AlertTitle>
        <AlertDescription>
          ستؤدي استعادة النسخة الاحتياطية إلى حذف جميع البيانات الحالية واستبدالها بالبيانات من النسخة الاحتياطية.
          تأكد من إنشاء نسخة احتياطية من البيانات الحالية قبل المتابعة.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="backupFile">اختر ملف النسخة الاحتياطية</Label>
          <Input
            id="backupFile"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            disabled={isRestoring}
          />
        </div>
        
        {backupMetadata && (
          <BackupMetadataDisplay metadata={backupMetadata} />
        )}
        
        {restoreErrors.length > 0 && (
          <ErrorDisplay errors={restoreErrors} />
        )}
        
        <div className="flex justify-end gap-2">
          {backupFile && (
            <Button 
              onClick={resetFileInput} 
              disabled={isRestoring}
              variant="outline"
            >
              إلغاء
            </Button>
          )}
          <Button 
            onClick={handleRestoreBackup} 
            disabled={!backupFile || isRestoring}
            variant="outline"
            className="gap-2"
          >
            {isRestoring ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                جاري استعادة النسخة الاحتياطية...
              </>
            ) : (
              <>
                <Upload size={16} />
                استعادة من نسخة احتياطية
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RestoreSection;
