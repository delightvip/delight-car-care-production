
import React from 'react';
import ImportInventoryDialog from '../common/ImportInventoryDialog';

interface ImportSemiFinishedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ImportSemiFinishedDialog: React.FC<ImportSemiFinishedDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  return (
    <ImportInventoryDialog
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      itemType="semi_finished"
      title="استيراد المنتجات النصف مصنعة"
      description="قم بتحميل ملف Excel أو CSV يحتوي على بيانات المنتجات النصف مصنعة. يمكنك تحميل القالب أدناه كمرجع."
    />
  );
};

export default ImportSemiFinishedDialog;
