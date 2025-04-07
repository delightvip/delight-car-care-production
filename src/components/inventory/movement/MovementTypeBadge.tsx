
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle, ArrowUpCircle, RefreshCcw } from 'lucide-react';

interface MovementTypeBadgeProps {
  type: 'in' | 'out' | 'adjustment';
  size?: 'sm' | 'md' | 'lg';
}

export const MovementTypeBadge: React.FC<MovementTypeBadgeProps> = ({ 
  type, 
  size = 'md' 
}) => {
  const iconSize = size === 'sm' ? 14 : size === 'md' ? 16 : 18;
  
  switch (type) {
    case 'in':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
          <ArrowDownCircle size={iconSize} className="text-green-600" />
          <span>وارد</span>
        </Badge>
      );
    case 'out':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
          <ArrowUpCircle size={iconSize} className="text-red-600" />
          <span>صادر</span>
        </Badge>
      );
    case 'adjustment':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
          <RefreshCcw size={iconSize} className="text-amber-600" />
          <span>تعديل</span>
        </Badge>
      );
    default:
      return null;
  }
};
