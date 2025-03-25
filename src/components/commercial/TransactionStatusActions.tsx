
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

interface TransactionStatusActionsProps {
  status: 'draft' | 'confirmed' | 'cancelled';
  onConfirm: () => Promise<void>;
  onCancel: () => Promise<void>;
  confirmText?: string;
  cancelText?: string;
}

const TransactionStatusActions: React.FC<TransactionStatusActionsProps> = ({
  status,
  onConfirm,
  onCancel,
  confirmText = 'هل أنت متأكد من تأكيد هذه المعاملة؟ لن يمكن تعديلها بعد التأكيد.',
  cancelText = 'هل أنت متأكد من إلغاء هذه المعاملة؟ سيتم إلغاء تأثيرها على الحسابات والمخزون.',
}) => {
  const [isConfirmLoading, setIsConfirmLoading] = React.useState(false);
  const [isCancelLoading, setIsCancelLoading] = React.useState(false);

  const handleConfirm = async () => {
    setIsConfirmLoading(true);
    await onConfirm();
    setIsConfirmLoading(false);
  };

  const handleCancel = async () => {
    setIsCancelLoading(true);
    await onCancel();
    setIsCancelLoading(false);
  };

  if (status === 'draft') {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button className="bg-green-600 hover:bg-green-700">
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
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-green-600 hover:bg-green-700"
              disabled={isConfirmLoading}
            >
              {isConfirmLoading ? 'جاري التنفيذ...' : 'تأكيد'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (status === 'confirmed') {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
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
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
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
