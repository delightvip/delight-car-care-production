
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

const RestoreSection = () => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupMetadata, setBackupMetadata] = useState<any>(null);
  const [restoreErrors, setRestoreErrors] = useState<any[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        toast.error("حجم الملف كبير جداً. الحد الأقصى هو 20 ميجابايت");
        e.target.value = '';
        return;
      }
      
      setBackupFile(file);
      setRestoreErrors([]);
      
      // Validate backup file format and read metadata
      try {
        const fileContent = await file.text();
        try {
          const jsonData = JSON.parse(fileContent);
          if (jsonData['__metadata']) {
            setBackupMetadata(jsonData['__metadata']);
          } else {
            // If no metadata, check if it at least has some tables
            const tableKeys = Object.keys(jsonData).filter(key => !key.startsWith('__'));
            if (tableKeys.length === 0) {
              toast.warning("الملف لا يحتوي على بيانات صالحة للاستعادة");
              setBackupFile(null);
              e.target.value = '';
              return;
            }
          }
        } catch (e) {
          toast.error("ملف النسخة الاحتياطية غير صالح");
          setBackupFile(null);
          e.target.value = '';
        }
      } catch (e) {
        console.error("Error reading backup file:", e);
      }
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
      
      // Read the file
      const fileContent = await backupFile.text();
      
      try {
        // Validate JSON
        JSON.parse(fileContent);
      } catch (e) {
        toast.error("ملف النسخة الاحتياطية غير صالح");
        return;
      }
      
      // Call the restore backup function
      const { data, error } = await supabase.functions.invoke("restore-backup", {
        body: { backup: fileContent }
      });
      
      if (error) {
        console.error("Backup restoration error:", error);
        toast.error("حدث خطأ أثناء استعادة النسخة الاحتياطية");
        return;
      }
      
      console.log("Backup restoration response:", data);
      
      if (data.success) {
        if (data.errors && data.errors.length > 0) {
          toast.warning(`تمت استعادة النسخة الاحتياطية مع وجود بعض الأخطاء (${data.errors.length})`);
          setRestoreErrors(data.errors);
        } else {
          toast.success("تمت استعادة النسخة الاحتياطية بنجاح");
          
          // Reload the application after a brief delay
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        toast.error("حدث خطأ أثناء استعادة النسخة الاحتياطية");
        if (data.errors) {
          setRestoreErrors(data.errors);
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
          <div className="bg-muted p-4 rounded-md text-sm">
            <p><strong>معلومات النسخة الاحتياطية:</strong></p>
            <p>تاريخ الإنشاء: {new Date(backupMetadata.timestamp).toLocaleString('ar-SA')}</p>
            <p>عدد الجداول: {backupMetadata.tablesCount}</p>
            <p>الإصدار: {backupMetadata.version}</p>
          </div>
        )}
        
        {restoreErrors.length > 0 && (
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>تم العثور على أخطاء أثناء الاستعادة ({restoreErrors.length})</AlertTitle>
            <AlertDescription>
              <ScrollArea className="h-40 w-full rounded border p-2 mt-2">
                <ul className="list-disc list-inside space-y-1">
                  {restoreErrors.map((error, index) => (
                    <li key={index}>
                      <strong>الجدول:</strong> {error.table}, <strong>العملية:</strong> {error.operation}{' '}
                      {error.batch && <span><strong>الدفعة:</strong> {error.batch}</span>}{' '}
                      <strong>الخطأ:</strong> {error.error}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              <div className="mt-2">
                <p>قد تمت استعادة بعض البيانات بنجاح. يمكنك إعادة تحميل الصفحة للمتابعة.</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  إعادة تحميل الصفحة
                </Button>
              </div>
            </AlertDescription>
          </Alert>
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
