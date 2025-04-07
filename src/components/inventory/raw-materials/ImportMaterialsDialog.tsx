
import React from 'react';
import ImportDialog from '../common/ImportDialog';

interface ImportMaterialsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportMaterialsDialog: React.FC<ImportMaterialsDialogProps> = ({
  isOpen,
  onClose
}) => {
  return (
    <ImportDialog
      isOpen={isOpen}
      onClose={onClose}
      title="استيراد المواد الخام"
      description="قم بتحميل ملف Excel أو CSV يحتوي على بيانات المواد الخام"
    />
  );
};

export default ImportMaterialsDialog;
