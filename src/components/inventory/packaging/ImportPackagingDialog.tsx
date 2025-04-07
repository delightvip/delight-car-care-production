
import React from 'react';
import ImportInventoryDialog from '../common/ImportInventoryDialog';

interface ImportPackagingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ImportPackagingDialog: React.FC<ImportPackagingDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  return (
    <ImportInventoryDialog
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      itemType="packaging"
      title="استيراد مستلزمات التعبئة"
      description="قم بتحميل ملف Excel أو CSV يحتوي على بيانات مستلزمات التعبئة. يمكنك تحميل القالب أدناه كمرجع."
    />
  );
};

export default ImportPackagingDialog;
