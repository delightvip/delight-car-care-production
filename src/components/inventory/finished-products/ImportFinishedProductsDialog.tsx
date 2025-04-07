
import React from 'react';
import ImportInventoryDialog from '../common/ImportInventoryDialog';

interface ImportFinishedProductsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ImportFinishedProductsDialog: React.FC<ImportFinishedProductsDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  return (
    <ImportInventoryDialog
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      itemType="finished_products"
      title="استيراد المنتجات النهائية"
      description="قم بتحميل ملف Excel أو CSV يحتوي على بيانات المنتجات النهائية. يمكنك تحميل القالب أدناه كمرجع."
    />
  );
};

export default ImportFinishedProductsDialog;
