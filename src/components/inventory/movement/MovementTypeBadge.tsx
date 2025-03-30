
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

interface MovementTypeDetails {
  label: string;
  icon: React.ReactNode;
  variant: 'outline';
  className: string;
}

interface MovementTypeBadgeProps {
  type: string;
}

export const MovementTypeBadge: React.FC<MovementTypeBadgeProps> = ({ type }) => {
  const getMovementTypeDetails = (type: string): MovementTypeDetails => {
    switch (type) {
      case 'in':
        return {
          label: 'وارد',
          icon: <ArrowUp className="h-4 w-4 text-success" />,
          variant: 'outline',
          className: 'border-success text-success'
        };
      case 'out':
        return {
          label: 'صادر',
          icon: <ArrowDown className="h-4 w-4 text-destructive" />,
          variant: 'outline',
          className: 'border-destructive text-destructive'
        };
      case 'adjustment':
        return {
          label: 'تسوية',
          icon: <RefreshCw className="h-4 w-4 text-warning" />,
          variant: 'outline',
          className: 'border-warning text-warning'
        };
      default:
        return {
          label: type,
          icon: null,
          variant: 'outline',
          className: ''
        };
    }
  };
  
  const typeDetails = getMovementTypeDetails(type);
  
  return (
    <Badge variant="outline" className={typeDetails.className}>
      <span className="flex items-center gap-1">
        {typeDetails.icon}
        {typeDetails.label}
      </span>
    </Badge>
  );
};
