
import React from 'react';
import { FolderOpen, FileQuestion, FileSearch, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  iconType?: 'empty' | 'error' | 'search' | 'low-stock' | 'product';
  actionLink?: string;
  actionText?: string;
  secondaryActionLink?: string;
  secondaryActionText?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'لا توجد بيانات',
  description = 'لم يتم العثور على بيانات لعرضها.',
  icon,
  iconType = 'empty',
  actionLink,
  actionText,
  secondaryActionLink,
  secondaryActionText
}) => {
  const getIcon = () => {
    if (icon) return icon;
    
    switch (iconType) {
      case 'error':
        return <FileQuestion className="h-10 w-10 text-red-500" />;
      case 'search':
        return <FileSearch className="h-10 w-10 text-blue-500" />;
      case 'low-stock':
        return <AlertTriangle className="h-10 w-10 text-amber-500" />;
      case 'product':
        return <Package className="h-10 w-10 text-indigo-500" />;
      case 'empty':
      default:
        return <FolderOpen className="h-10 w-10 text-muted-foreground" />;
    }
  };
  
  const getIconBgColor = () => {
    switch (iconType) {
      case 'error':
        return 'bg-red-100';
      case 'search':
        return 'bg-blue-100';
      case 'low-stock':
        return 'bg-amber-100';
      case 'product':
        return 'bg-indigo-100';
      case 'empty':
      default:
        return 'bg-muted/50';
    }
  };
  
  return (
    <motion.div 
      className="flex flex-col items-center justify-center p-8 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className={`h-20 w-20 rounded-full ${getIconBgColor()} flex items-center justify-center mb-4`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {getIcon()}
      </motion.div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      
      <div className="flex flex-wrap gap-3 justify-center">
        {actionLink && actionText && (
          <Button asChild variant="default">
            <Link to={actionLink}>{actionText}</Link>
          </Button>
        )}
        
        {secondaryActionLink && secondaryActionText && (
          <Button asChild variant="outline">
            <Link to={secondaryActionLink}>{secondaryActionText}</Link>
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default EmptyState;
