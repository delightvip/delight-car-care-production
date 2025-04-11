
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
import { Progress } from "@/components/ui/progress";

const RestoreSection = () => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupMetadata, setBackupMetadata] = useState<BackupMetadata | null>(null);
  const [restoreErrors, setRestoreErrors] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [restoreStage, setRestoreStage] = useState<string>('');
  
  const { validateFile, restoreBackup, isValidating } = useBackupRestore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProgress(10);
      setRestoreStage('validating');
      toast.info("جاري التحقق من صحة ملف النسخة الاحتياطية...");
      
      const { valid, metadata, error } = await validateFile(file);
      
      if (!valid) {
        toast.error(error || "ملف النسخة الاحتياطية غير صالح");
        e.target.value = '';
        setProgress(0);
        setRestoreStage('');
        return;
      }
      
      setBackupFile(file);
      setBackupMetadata(metadata);
      setRestoreErrors([]);
      setProgress(0);
      setRestoreStage('');
      
      // عرض معلومات إضافية عن الملف
      toast.success("تم التحقق من صحة النسخة الاحتياطية بنجاح");
      console.log("Backup file information:", {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        lastModified: new Date(file.lastModified).toLocaleString()
      });
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
    setProgress(10);
    setRestoreStage('preparing');
    
    try {
      toast.info("جاري استعادة النسخة الاحتياطية، قد يستغرق هذا بعض الوقت...");
      
      setProgress(20);
      setRestoreStage('processing');
      
      // إظهار حجم الملف المراد استعادته
      const fileSizeInMB = (backupFile.size / (1024 * 1024)).toFixed(2);
      console.log(`بدء استعادة النسخة الاحتياطية. حجم الملف: ${fileSizeInMB} MB`);
      
      setProgress(30);
      
      // تحسين: تقسيم الملفات الكبيرة واستخدام محاولات إعادة الاتصال المضمنة
      const { success, errors } = await restoreBackup(backupFile);
      
      setProgress(65);
      
      if (success) {
        setRestoreStage('balances');
        setProgress(75);
        toast.info("جاري إعادة حساب أرصدة الأطراف التجارية...");
        
        // نضيف تأخير قصير لتعكس واجهة المستخدم مرحلة إعادة حساب الأرصدة
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setProgress(85);
        setRestoreStage('verifying');
        
        if (errors && errors.length > 0) {
          setProgress(95);
          toast.warning(`تمت استعادة النسخة الاحتياطية مع وجود بعض الأخطاء (${errors.length})`);
          setRestoreErrors(errors);
          
          console.warn("Restoration completed with errors:", errors);
        } else {
          setProgress(100);
          setRestoreStage('completed');
          toast.success("تمت استعادة النسخة الاحتياطية وإعادة حساب الأرصدة بنجاح");
          
          // بيانات إضافية عن الاستعادة
          const metadata = backupMetadata || {};
          console.log("Restoration completed successfully. Metadata:", metadata);
          
          // Reload the application after a brief delay
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        setProgress(0);
        setRestoreStage('');
        toast.error("حدث خطأ أثناء استعادة النسخة الاحتياطية");
        if (errors) {
          setRestoreErrors(errors);
          console.error("Restoration failed with errors:", errors);
        }
      }
    } catch (error) {
      console.error("Backup restoration error:", error);
      toast.error("حدث خطأ أثناء استعادة النسخة الاحتياطية");
      setProgress(0);
      setRestoreStage('');
    } finally {
      setIsRestoring(false);
    }
  };

  const resetFileInput = () => {
    setBackupFile(null);
    setBackupMetadata(null);
    setRestoreErrors([]);
    setProgress(0);
    setRestoreStage('');
    // Reset the file input
    const fileInput = document.getElementById('backupFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const getProgressMessage = () => {
    switch (restoreStage) {
      case 'validating':
        return 'جاري تحليل النسخة الاحتياطية...';
      case 'preparing':
        return 'جاري الإعداد لاستعادة البيانات...';
      case 'processing':
        return 'جاري استعادة البيانات...';
      case 'balances':
        return 'جاري إعادة حساب أرصدة الأطراف التجارية...';
      case 'verifying':
        return 'جاري التحقق من اكتمال الاستعادة...';
      case 'completed':
        return 'اكتملت الاستعادة، جاري الإعداد...';
      default:
        return progress < 30 ? 'جاري تحليل النسخة الاحتياطية...' : 
               progress < 70 ? 'جاري استعادة البيانات...' : 
               progress < 90 ? 'جاري التحقق من اكتمال الاستعادة...' :
               'اكتملت الاستعادة، جاري الإعداد...';
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
            disabled={isRestoring || isValidating}
          />
          {isValidating && (
            <p className="text-sm text-muted-foreground">
              جاري التحقق من صحة النسخة الاحتياطية...
            </p>
          )}
        </div>
        
        {(isRestoring || isValidating) && progress > 0 && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {getProgressMessage()}
            </p>
          </div>
        )}
        
        {backupFile && !isRestoring && (
          <div className="bg-secondary/50 p-3 rounded-md text-sm">
            <p><strong>اسم الملف:</strong> {backupFile.name}</p>
            <p><strong>حجم الملف:</strong> {(backupFile.size / (1024 * 1024)).toFixed(2)} ميجابايت</p>
            <p><strong>تاريخ التعديل:</strong> {new Date(backupFile.lastModified).toLocaleString()}</p>
          </div>
        )}
        
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
              disabled={isRestoring || isValidating}
              variant="outline"
            >
              إلغاء
            </Button>
          )}
          <Button 
            onClick={handleRestoreBackup} 
            disabled={!backupFile || isRestoring || isValidating}
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
