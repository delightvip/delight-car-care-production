
import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Download, Upload, RefreshCw, Save, Database, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const BackupRestoreCard = () => {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupMetadata, setBackupMetadata] = useState<any>(null);

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
        toast.success("تمت استعادة النسخة الاحتياطية بنجاح");
        
        // Reload the application after a brief delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        if (data.errors && data.errors.length > 0) {
          toast.error(`تمت استعادة النسخة الاحتياطية مع بعض الأخطاء (${data.errors.length})`);
        } else {
          toast.error("حدث خطأ أثناء استعادة النسخة الاحتياطية");
        }
      }
    } catch (error) {
      console.error("Backup restoration error:", error);
      toast.error("حدث خطأ أثناء استعادة النسخة الاحتياطية");
    } finally {
      setIsRestoring(false);
      setBackupFile(null);
      setBackupMetadata(null);
      // Reset the file input
      const fileInput = document.getElementById('backupFile') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database size={20} />
          <span>النسخ الاحتياطي واستعادة البيانات</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">استعادة من نسخة احتياطية</h3>
          <p className="text-muted-foreground">
            قم باستعادة بيانات النظام من نسخة احتياطية سابقة. سيتم استبدال جميع البيانات الحالية.
          </p>
          
          <Alert variant="warning" className="my-4">
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
            
            <div className="flex justify-end">
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
      </CardContent>
    </Card>
  );
};

export default BackupRestoreCard;
