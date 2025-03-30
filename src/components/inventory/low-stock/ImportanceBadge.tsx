
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';

interface ImportanceBadgeProps {
  importance: number;
}

export const ImportanceBadge: React.FC<ImportanceBadgeProps> = ({ importance }) => {
  const getImportanceLevel = () => {
    if (importance >= 8) return { label: 'عالية', color: 'bg-red-100 text-red-800' };
    if (importance >= 4) return { label: 'متوسطة', color: 'bg-amber-100 text-amber-800' };
    return { label: 'منخفضة', color: 'bg-green-100 text-green-800' };
  };
  
  const importanceLevel = getImportanceLevel();
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <BarChart3 className="h-4 w-4 mr-1 text-muted-foreground" />
        <span>{importance}</span>
      </div>
      <Badge variant="outline" className={`${importanceLevel.color}`}>
        {importanceLevel.label}
      </Badge>
    </div>
  );
};
