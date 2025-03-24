
import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface DashboardCardIconProps {
  icon: LucideIcon;
  className?: string;
}

const DashboardCardIcon: React.FC<DashboardCardIconProps> = ({ icon: Icon, className }) => {
  return (
    <div className={cn('rounded-full p-2', className)}>
      <Icon className="h-6 w-6" />
    </div>
  );
};

export default DashboardCardIcon;
