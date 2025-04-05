
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
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  const handleFactoryReset = async () => {
    if (confirmText !== "إعادة ضبط") {
      toast.error("الرجاء كتابة 'إعادة ضبط' للتأكيد");
      return;
    }

    setIsResetting(true);
    try {
      // Call the factory reset function
      const { error } = await supabase.functions.invoke("factory-reset");
      
      if (error) {
        console.error("Factory reset error:", error);
        toast.error("حدث خطأ أثناء إعادة ضبط النظام");
        return;
      }
      
      // Clear local storage
      localStorage.clear();
      
      toast.success("تمت إعادة ضبط النظام بنجاح");
      
      // Reload the application after a brief delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Factory reset error:", error);
      toast.error("حدث خطأ أثناء إعادة ضبط النظام");
    } finally {
      setIsResetting(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleFactoryReset}
            disabled={isResetting || confirmText !== "إعادة ضبط"}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isResetting ? "جاري إعادة الضبط..." : "إعادة ضبط النظام"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default FactoryResetDialog;
