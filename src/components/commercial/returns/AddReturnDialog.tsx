
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReturnForm from './ReturnForm';
import { Return } from '@/types/returns';

interface AddReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Return, 'id' | 'created_at'>) => Promise<void>;
  isSubmitting: boolean;
}

export const AddReturnDialog: React.FC<AddReturnDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting
}) => {
  return (
    <Dialog open={open} onOpenChange={(open) => !isSubmitting && onOpenChange(open)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>إضافة مرتجع جديد</DialogTitle>
        </DialogHeader>
        <ReturnForm
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
