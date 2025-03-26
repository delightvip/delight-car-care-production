
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface InvoiceStatusBadgeProps {
  status: 'draft' | 'confirmed' | 'cancelled' | string;
  className?: string;
}

const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({ status, className }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'draft':
        return 'bg-warning/20 text-warning border-warning hover:bg-warning/30';
      case 'confirmed':
        return 'bg-success/20 text-success border-success hover:bg-success/30';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive border-destructive hover:bg-destructive/30';
      default:
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'draft':
        return 'مسودة';
      case 'confirmed':
        return 'مؤكدة';
      case 'cancelled':
        return 'ملغاة';
      default:
        return status;
    }
  };

  return (
    <Badge className={cn(getStatusStyles(), className)} variant="outline">
      {getStatusText()}
    </Badge>
  );
};

export default InvoiceStatusBadge;
