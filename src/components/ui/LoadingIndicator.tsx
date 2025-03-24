
import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoadingIndicatorProps {
  size?: number;
  className?: string;
  text?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  size = 24, 
  className = '', 
  text = 'جاري التحميل...', 
  variant = 'primary'
}) => {
  const getLoaderColor = () => {
    switch (variant) {
      case 'primary': return 'text-blue-600';
      case 'secondary': return 'text-violet-600';
      case 'success': return 'text-emerald-600';
      case 'warning': return 'text-amber-600';
      case 'danger': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };
  
  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <motion.div
        animate={{
          rotate: 360
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <Loader2 size={size} className={getLoaderColor()} />
      </motion.div>
      {text && (
        <motion.p 
          className="text-sm text-muted-foreground mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default LoadingIndicator;
