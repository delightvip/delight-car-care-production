
import React from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';

interface InventoryAuditButtonProps {
  onClick: () => void;
}

const InventoryAuditButton: React.FC<InventoryAuditButtonProps> = ({ onClick }) => {
  return (
    <Button onClick={onClick} variant="outline" className="gap-2">
      <ClipboardList size={18} />
      جرد المخزون
    </Button>
  );
};

export default InventoryAuditButton;
