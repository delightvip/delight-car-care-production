
import React from 'react';
import ImportDialog from '../common/ImportDialog';

interface ImportPackagingMaterialsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportPackagingMaterialsDialog: React.FC<ImportPackagingMaterialsDialogProps> = ({
  isOpen,
  onClose
}) => {
  return (
    <ImportDialog
      isOpen={isOpen}
      onClose={onClose}
      title="استيراد مواد التعبئة والتغليف"
      description="قم بتحميل ملف Excel أو CSV يحتوي على بيانات مواد التعبئة والتغليف"
      itemType="packaging-materials"
    />
  );
};

export default ImportPackagingMaterialsDialog;
