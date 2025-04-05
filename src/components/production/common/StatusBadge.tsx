
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { statusColors, statusTranslations } from '@/services/production/ProductionTypes';

type StatusBadgeProps = {
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const icons = {
    pending: <Clock className="h-4 w-4 mr-1" />,
    inProgress: <AlertTriangle className="h-4 w-4 mr-1" />,
    completed: <CheckCircle2 className="h-4 w-4 mr-1" />,
    cancelled: <X className="h-4 w-4 mr-1" />
  };

  return (
    <Badge className={statusColors[status]}>
      {icons[status]}
      {statusTranslations[status]}
    </Badge>
  );
};

export default StatusBadge;
