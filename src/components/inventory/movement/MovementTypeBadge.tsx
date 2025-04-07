
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

interface MovementTypeBadgeProps {
  type: 'in' | 'out' | 'adjustment' | string;
}

export const MovementTypeBadge: React.FC<MovementTypeBadgeProps> = ({ type }) => {
  let content;
  let className;
  
  switch (type) {
    case 'in':
      content = (
        <>
          <ArrowUp className="h-3.5 w-3.5 mr-1" />
          <span>وارد</span>
        </>
      );
      className = "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800";
      break;
    case 'out':
      content = (
        <>
          <ArrowDown className="h-3.5 w-3.5 mr-1" />
          <span>صادر</span>
        </>
      );
      className = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800";
      break;
    case 'adjustment':
      content = (
        <>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          <span>تعديل</span>
        </>
      );
      className = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800";
      break;
    default:
      content = (
        <>
          <span>{type}</span>
        </>
      );
      className = "bg-gray-100 text-gray-700 border-gray-300";
  }
  
  return (
    <Badge variant="outline" className={`flex items-center px-2 py-0.5 text-xs font-medium ${className}`}>
      {content}
    </Badge>
  );
};
