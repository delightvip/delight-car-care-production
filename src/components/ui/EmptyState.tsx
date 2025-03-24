
import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLink?: string;
  actionText?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'لا توجد بيانات',
  description = 'لم يتم العثور على بيانات لعرضها.',
  icon,
  actionLink,
  actionText
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        {icon || <FolderOpen className="h-10 w-10 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      
      {actionLink && actionText && (
        <Button asChild variant="outline">
          <Link to={actionLink}>{actionText}</Link>
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
