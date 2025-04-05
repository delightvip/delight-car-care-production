
import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Download, Upload, RefreshCw, Save, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BackupRestoreCard = () => {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
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
      
      // Create a temporary link to download the backup
      const link = document.createElement("a");
      link.href = data.url;
      link.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBackupFile(e.target.files[0]);
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupFile) {
      toast.error("الرجاء اختيار ملف النسخة الاحتياطية أولاً");
      return;
    }

    // Check file size
    if (backupFile.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت");
      return;
    }

    setIsRestoring(true);
    try {
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
      const { error } = await supabase.functions.invoke("restore-backup", {
        body: { backup: fileContent }
      });
      
      if (error) {
        console.error("Backup restoration error:", error);
        toast.error("حدث خطأ أثناء استعادة النسخة الاحتياطية");
        return;
      }
      
      toast.success("تمت استعادة النسخة الاحتياطية بنجاح");
      
      // Reload the application after a brief delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Backup restoration error:", error);
      toast.error("حدث خطأ أثناء استعادة النسخة الاحتياطية");
    } finally {
      setIsRestoring(false);
      setBackupFile(null);
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
