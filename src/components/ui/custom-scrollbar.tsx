import React from 'react';
import { cn } from '@/lib/utils';

// مكون لإضافة مؤشرات تمرير مخصصة للعناصر
interface CustomScrollbarProps {
  className?: string;
  children: React.ReactNode;
  dir?: 'rtl' | 'ltr';
  style?: React.CSSProperties;
}

export const CustomScrollbar: React.FC<CustomScrollbarProps> = ({
  className,
  children,
  dir = 'rtl',
  style
}) => {
  return (
    <div
      className={cn(
        'custom-scrollbar',
        dir === 'rtl' ? 'custom-scrollbar-rtl' : '',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
};

export default CustomScrollbar;
