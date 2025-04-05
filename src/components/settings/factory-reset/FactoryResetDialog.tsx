
import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FactoryResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FactoryResetDialog: React.FC<FactoryResetDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetErrors, setResetErrors] = useState<any[]>([]);

  const handleFactoryReset = async () => {
    if (confirmText !== "إعادة ضبط") {
      toast.error("الرجاء كتابة 'إعادة ضبط' للتأكيد");
      return;
    }

    setIsResetting(true);
    setResetErrors([]);
    
    try {
      toast.info("جاري إعادة ضبط النظام، قد يستغرق هذا بعض الوقت...");
      
      // Call the factory reset function
      const { data, error } = await supabase.functions.invoke("factory-reset");
      
      if (error) {
        console.error("Factory reset error:", error);
        toast.error("حدث خطأ أثناء إعادة ضبط النظام");
        setResetErrors([{ table: "general", error: error.message }]);
        return;
      }
      
      console.log("Factory reset response:", data);
      
      if (!data.success) {
        toast.error(`حدث خطأ أثناء إعادة ضبط النظام: ${data.message || 'خطأ غير معروف'}`);
        
        if (data.errors && data.errors.length > 0) {
          setResetErrors(data.errors);
        }
        
        return;
      }
      
      // Clear local storage except for user auth data
      const auth = localStorage.getItem('supabase.auth.token');
      localStorage.clear();
      if (auth) localStorage.setItem('supabase.auth.token', auth);
      
      toast.success("تمت إعادة ضبط النظام بنجاح");
      
      // Reload the application after a brief delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Factory reset error:", error);
      toast.error("حدث خطأ أثناء إعادة ضبط النظام");
      setResetErrors([{ table: "general", error: error.message }]);
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    if (!isResetting) {
      setConfirmText("");
      setResetErrors([]);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            إعادة ضبط المصنع
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-4">
              <p className="font-bold text-destructive">تحذير: هذا الإجراء لا يمكن التراجع عنه!</p>
              <p>
                سيؤدي هذا الإجراء إلى حذف جميع البيانات في النظام وإعادة ضبطه إلى حالته الأولية.
                يرجى التأكد من إنشاء نسخة احتياطية قبل المتابعة.
              </p>
              <div className="space-y-2">
                <p className="font-semibold">
                  لتأكيد إعادة ضبط النظام، اكتب "إعادة ضبط" أدناه:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="اكتب 'إعادة ضبط'"
                  className="mt-2"
                />
              </div>

              {resetErrors.length > 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>تم العثور على أخطاء أثناء إعادة الضبط ({resetErrors.length})</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-40 w-full rounded border p-2 mt-2">
                      <ul className="list-disc list-inside space-y-1">
                        {resetErrors.map((error, index) => (
                          <li key={index}>
                            <strong>الجدول:</strong> {error.table}, <strong>الخطأ:</strong> {error.error}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleFactoryReset}
            disabled={isResetting || confirmText !== "إعادة ضبط"}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {isResetting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                جاري إعادة الضبط...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                إعادة ضبط النظام
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default FactoryResetDialog;
