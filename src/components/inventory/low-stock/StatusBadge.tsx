
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface StatusBadgeProps {
  quantity: number;
  minStock: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ quantity, minStock }) => {
  const percentage = (quantity / minStock) * 100;
  
  const getColor = () => {
    if (percentage <= 30) return "text-red-600";
    if (percentage <= 60) return "text-amber-600";
    return "text-green-600";
  };
  
  const getProgressClasses = () => {
    if (percentage <= 30) return {
      bg: "bg-red-100",
      indicator: "bg-red-600"
    };
    if (percentage <= 60) return {
      bg: "bg-amber-100",
      indicator: "bg-amber-600"
    };
    return {
      bg: "bg-green-100",
      indicator: "bg-green-600"
    };
  };
  
  const progressClasses = getProgressClasses();
  
  return (
    <div className="w-full max-w-[180px]">
      <div className="flex justify-between items-center mb-1.5">
        <span className={`text-xs font-medium ${getColor()}`}>
          {percentage.toFixed(1)}%
        </span>
        <Badge variant="outline" className="text-xs">
          {percentage <= 30 ? 'حرج' : percentage <= 60 ? 'منخفض' : 'مقبول'}
        </Badge>
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 ${progressClasses.bg}`}
        style={{
          backgroundColor: progressClasses.bg.includes('red') ? 'rgba(254, 226, 226, 1)' : 
                          progressClasses.bg.includes('amber') ? 'rgba(254, 243, 199, 1)' : 
                          'rgba(220, 252, 231, 1)'
        }}
      />
    </div>
  );
};
