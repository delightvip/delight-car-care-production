
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: {
    value: number;
    label: string;
  };
  link?: string;
  className?: string;
  onClick?: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  icon,
  color = 'primary',
  trend,
  link,
  className,
  onClick
}) => {
  const colorClasses = {
    primary: 'bg-blue-50 text-blue-600 border-blue-100',
    secondary: 'bg-purple-50 text-purple-600 border-purple-100',
    success: 'bg-green-50 text-green-600 border-green-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    danger: 'bg-red-50 text-red-600 border-red-100',
    info: 'bg-sky-50 text-sky-600 border-sky-100',
  };
  
  const iconColorClasses = {
    primary: 'bg-blue-100 text-blue-600',
    secondary: 'bg-purple-100 text-purple-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-sky-100 text-sky-600',
  };
  
  const trendColorClasses = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  };
  
  const cardContent = (
    <div 
      className={cn(
        'glass-panel p-6 flex flex-col card-hover cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <div className="text-3xl font-bold mt-2">{value}</div>
          
          {trend && (
            <div className="flex items-center mt-2">
              <span 
                className={
                  trend.value > 0 
                    ? trendColorClasses.positive
                    : trend.value < 0 
                    ? trendColorClasses.negative
                    : trendColorClasses.neutral
                }
              >
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="ml-1 text-sm text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>
        
        <div className={cn('p-3 rounded-lg', iconColorClasses[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
  
  return link ? (
    <Link to={link}>
      {cardContent}
    </Link>
  ) : (
    cardContent
  );
};

export default DashboardCard;
