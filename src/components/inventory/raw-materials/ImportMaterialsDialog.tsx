
import React from 'react';
import ImportInventoryDialog from '../common/ImportInventoryDialog';

interface ImportMaterialsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ImportMaterialsDialog: React.FC<ImportMaterialsDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  return (
    <ImportInventoryDialog
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      itemType="raw_materials"
      title="استيراد المواد الخام"
      description="قم بتحميل ملف Excel أو CSV يحتوي على بيانات المواد الخام. يمكنك تحميل القالب أدناه كمرجع."
    />
  );
};

export default ImportMaterialsDialog;
