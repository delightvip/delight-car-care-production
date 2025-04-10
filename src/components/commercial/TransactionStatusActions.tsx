
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface TransactionStatusActionsProps {
  status: 'draft' | 'confirmed' | 'cancelled';
  onConfirm?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  onDelete?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const TransactionStatusActions: React.FC<TransactionStatusActionsProps> = ({
  status,
  onConfirm,
  onCancel,
  onDelete,
  confirmText = 'هل أنت متأكد من تأكيد هذه المعاملة؟ لن يمكن تعديلها بعد التأكيد.',
  cancelText = 'هل أنت متأكد من إلغاء هذه المعاملة؟ سيتم إلغاء تأثيرها على الحسابات والمخزون.',
}) => {
  const [isConfirmLoading, setIsConfirmLoading] = React.useState(false);
  const [isCancelLoading, setIsCancelLoading] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleConfirm = async () => {
    if (!onConfirm) return;
    try {
      setIsConfirmLoading(true);
      // تحديث حالة الحوار لمنع إعادة النقر
      setIsDialogOpen(false);
      
      // إظهار إشعار بدء العملية
      const toastId = toast.loading("جاري تنفيذ العملية...");
      
      await onConfirm();
      
      // تحديث الإشعار بعد انتهاء العملية
      toast.success("تم تنفيذ العملية بنجاح", { id: toastId });
    } catch (error) {
      console.error("Error in confirm operation:", error);
      toast.error("حدث خطأ أثناء تنفيذ العملية");
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    try {
      setIsCancelLoading(true);
      // تحديث حالة الحوار لمنع إعادة النقر
      setIsDialogOpen(false);
      
      // إظهار إشعار بدء العملية
      const toastId = toast.loading("جاري تنفيذ عملية الإلغاء...");
      
      await onCancel();
      
      // تحديث الإشعار بعد انتهاء العملية
      toast.success("تم إلغاء العملية بنجاح", { id: toastId });
    } catch (error) {
      console.error("Error in cancel operation:", error);
      toast.error("حدث خطأ أثناء تنفيذ عملية الإلغاء");
    } finally {
      setIsCancelLoading(false);
    }
  };

  if (status === 'draft') {
    return (
      <div className="flex flex-wrap gap-2">
        {onConfirm && (
          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                disabled={isConfirmLoading}
              >
                <CheckCircle className="ml-2 h-4 w-4" />
                تأكيد المعاملة
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد المعاملة</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmText}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleConfirm();
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isConfirmLoading}
                >
                  {isConfirmLoading ? 'جاري التنفيذ...' : 'تأكيد'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        {onDelete && (
          <Button 
            variant="outline" 
            onClick={onDelete} 
            className="border-gray-400"
          >
            <XCircle className="ml-2 h-4 w-4" />
            حذف
          </Button>
        )}
      </div>
    );
  }

  if (status === 'confirmed' && onCancel) {
    return (
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button 
            variant="destructive"
            disabled={isCancelLoading}
          >
            <RotateCcw className="ml-2 h-4 w-4" />
            إلغاء المعاملة
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء المعاملة</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelText}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isCancelLoading}
            >
              {isCancelLoading ? 'جاري التنفيذ...' : 'إلغاء المعاملة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
};

export default TransactionStatusActions;
