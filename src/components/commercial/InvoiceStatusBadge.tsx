
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlarmClock, Ban } from 'lucide-react';

interface InvoiceStatusBadgeProps {
  status: 'draft' | 'confirmed' | 'cancelled';
  className?: string;
}

const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({ status, className }) => {
  switch (status) {
    case 'confirmed':
      return (
        <Badge className="bg-green-500 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          مؤكدة
        </Badge>
      );
    case 'draft':
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <AlarmClock className="h-3 w-3" />
          مسودة
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <Ban className="h-3 w-3" />
          ملغاة
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
};

export default InvoiceStatusBadge;
