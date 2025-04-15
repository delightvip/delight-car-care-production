import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: {
    value: number;
    label: string;
  };
  link?: string;
  className?: string;
  onClick?: () => void;
  alert?: boolean;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  description,
  icon,
  color = 'primary',
  trend,
  link,
  className,
  onClick,
  alert
}) => {
  const colorClasses = {
    primary: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    secondary: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  };
  
  const iconColorClasses = {
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    secondary: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  };
  
  const trendColorClasses = {
    positive: 'text-green-700 dark:text-green-400 flex items-center font-medium',
    negative: 'text-red-700 dark:text-red-400 flex items-center font-medium',
    neutral: 'text-gray-700 dark:text-gray-400 flex items-center font-medium',
  };
    const cardContent = (
    <div 
      className={cn(
        'rounded-lg border p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full',
        alert ? 'border-amber-300' : '', 
        className
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2 md:mb-3">
        <div className={cn('p-2 md:p-3 rounded-lg', iconColorClasses[color])}>
          {React.cloneElement(icon as React.ReactElement, { 
            className: 'h-4 w-4 md:h-5 md:w-5'
          })}
        </div>
        
        {trend && (
          <div 
            className={
              trend.value > 0 
                ? trendColorClasses.positive
                : trend.value < 0 
                ? trendColorClasses.negative
                : trendColorClasses.neutral
            }
          >            {trend.value > 0 ? <ChevronUp className="h-3 w-3 md:h-4 md:w-4 mr-1" /> : <ChevronDown className="h-3 w-3 md:h-4 md:w-4 mr-1" />}
            <span className="text-xs md:text-sm">{Math.abs(trend.value)}% {trend.label}</span>
          </div>
        )}
      </div>
      
      <h3 className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</h3>
      <div className="text-base md:text-xl font-bold">{value}</div>
      
      {description && (
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 md:mt-2">{description}</p>
      )}
    </div>
  );
  
  return link ? (
    <Link to={link} className="block h-full">
      {cardContent}
    </Link>
  ) : (
    cardContent
  );
};

export default DashboardCard;
export type { DashboardCardProps };
