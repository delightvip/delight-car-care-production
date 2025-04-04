
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';

interface FinishedProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  title: string;
  submitText: string;
}

const FinishedProductForm: React.FC<FinishedProductFormProps> = ({
  isOpen,
  onClose,
  initialData,
  title,
  submitText
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-muted-foreground">نموذج إضافة/تعديل المنتج النهائي</p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button>
            {submitText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinishedProductForm;
