
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface MovementTypeBadgeProps {
  type: 'in' | 'out' | 'adjustment' | string;
}

export const MovementTypeBadge: React.FC<MovementTypeBadgeProps> = ({ type }) => {
  switch (type) {
    case 'in':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
          وارد
        </Badge>
      );
    case 'out':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
          صادر
        </Badge>
      );
    case 'adjustment':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
          تعديل
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-700">
          {type}
        </Badge>
      );
  }
};
