
import React from 'react';
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
import { ReturnDetailsDialog } from './ReturnDetailsDialog';
import { Return } from '@/types/returns';

interface ReturnActionDialogsProps {
  viewingReturn: Return | null;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  isProcessing: boolean;
  isConfirmDialogOpen: boolean;
  setIsConfirmDialogOpen: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isCancelDialogOpen: boolean;
  setIsCancelDialogOpen: (open: boolean) => void;
  onCancel: () => Promise<void>;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  onDelete: () => Promise<void>;
  selectedReturnId: string | null;
}

export const ReturnActionDialogs: React.FC<ReturnActionDialogsProps> = ({
  viewingReturn,
  isDetailsOpen,
  setIsDetailsOpen,
  isProcessing,
  isConfirmDialogOpen,
  setIsConfirmDialogOpen,
  onConfirm,
  isCancelDialogOpen,
  setIsCancelDialogOpen,
  onCancel,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  onDelete,
  selectedReturnId
}) => {
  return (
    <>
      {viewingReturn && (
        <ReturnDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          returnData={viewingReturn}
          isProcessing={isProcessing}
          onConfirm={
            viewingReturn.payment_status === 'draft' 
              ? async () => {
                  setIsDetailsOpen(false);
                  setIsConfirmDialogOpen(true);
                }
              : undefined
          }
          onCancel={
            viewingReturn.payment_status === 'confirmed'
              ? async () => {
                  setIsDetailsOpen(false);
                  setIsCancelDialogOpen(true);
                }
              : undefined
          }
          onDelete={
            viewingReturn.payment_status === 'draft'
              ? async () => {
                  setIsDetailsOpen(false);
                  setIsDeleteDialogOpen(true);
                }
              : undefined
          }
        />
      )}

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={(open) => !isProcessing && setIsConfirmDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في تأكيد هذا المرتجع؟ سيتم تحديث المخزون والحسابات وفقًا لذلك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={(open) => !isProcessing && setIsCancelDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في إلغاء هذا المرتجع؟ سيتم عكس تأثيره على المخزون والحسابات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>تراجع</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
              إلغاء المرتجع
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => !isProcessing && setIsDeleteDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في حذف هذا المرتجع؟ لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>تراجع</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
              حذف المرتجع
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
