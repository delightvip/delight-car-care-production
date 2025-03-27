
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Party } from '@/services/PartyService';
import { PartyForm } from './PartyForm';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  onConfirm: () => void;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  party,
  onConfirm
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تأكيد الحذف</DialogTitle>
          <DialogDescription>
            هل أنت متأكد من حذف الطرف التجاري "{party?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            حذف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddPartyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Party, 'id' | 'balance' | 'created_at'>) => void;
}

export function AddPartyDialog({
  isOpen,
  onClose,
  onSubmit
}: AddPartyDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>إضافة طرف جديد</DialogTitle>
          <DialogDescription>
            أدخل بيانات الطرف التجاري الجديد.
          </DialogDescription>
        </DialogHeader>
        <PartyForm onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}

interface EditPartyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  onSubmit: (data: Partial<Party>) => void;
}

export function EditPartyDialog({
  isOpen,
  onClose,
  party,
  onSubmit
}: EditPartyDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الطرف</DialogTitle>
          <DialogDescription>
            تعديل بيانات الطرف التجاري.
          </DialogDescription>
        </DialogHeader>
        {party && (
          <PartyForm 
            onSubmit={onSubmit} 
            initialData={party} 
            isEditing={true} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
