
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';

interface MovementTypeBadgeProps {
  type: string;
}

export const MovementTypeBadge: React.FC<MovementTypeBadgeProps> = ({ type }) => {
  switch (type) {
    case 'in':
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
          <ArrowDown className="h-3 w-3" />
          <span>وارد</span>
        </Badge>
      );
    case 'out':
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
          <ArrowUp className="h-3 w-3" />
          <span>صادر</span>
        </Badge>
      );
    case 'adjustment':
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          <span>تسوية</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {type}
        </Badge>
      );
  }
};
