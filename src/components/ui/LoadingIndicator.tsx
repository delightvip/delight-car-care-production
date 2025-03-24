
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  size?: number;
  className?: string;
  text?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  size = 24, 
  className = '', 
  text = 'جاري التحميل...' 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <Loader2 size={size} className="animate-spin mb-2" />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
};

export default LoadingIndicator;
