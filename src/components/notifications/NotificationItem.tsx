
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  X, 
  Bell,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNotifications } from './NotificationProvider';

interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: string;
    date: Date;
    read: boolean;
  };
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const navigate = useNavigate();
  
  try {
    const { markAsRead, clearNotification } = useNotifications();
    
    const handleClick = () => {
      markAsRead(notification.id);
      
      if (notification.link) {
        navigate(notification.link);
      }
    };
    
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      clearNotification(notification.id);
    };
    
    const getIcon = () => {
      switch (notification.type) {
        case 'info':
          return <Info size={18} className="text-blue-500" />;
        case 'success':
          return <CheckCircle size={18} className="text-green-500" />;
        case 'warning':
          return <AlertTriangle size={18} className="text-amber-500" />;
        case 'error':
          return <AlertTriangle size={18} className="text-red-500" />;
        default:
          return <Bell size={18} className="text-gray-500" />;
      }
    };
    
    const getBgColor = () => {
      if (!notification.read) {
        return 'bg-muted/50';
      }
      return '';
    };
    
    return (
      <div 
        className={cn(
          "relative flex items-start gap-3 p-3 rounded-md cursor-pointer hover:bg-muted transition-all",
          getBgColor()
        )}
        onClick={handleClick}
      >
        <div className="mt-0.5 shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-sm">{notification.title}</h4>
            <div className="flex items-center gap-1 shrink-0">
              {!notification.read && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 -mt-1 -mr-1"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-xs line-clamp-2">{notification.message}</p>
          <div className="flex justify-between items-center mt-1">
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(notification.date), { 
                addSuffix: true,
                locale: ar
              })}
            </span>
            {notification.link && (
              <ExternalLink size={12} className="text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("NotificationItem: Error using notifications context", error);
    // Return a simplified version that doesn't use the context
    return (
      <div className="relative flex items-start gap-3 p-3 rounded-md">
        <div className="mt-0.5 shrink-0">
          <Bell size={18} className="text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{notification.title}</h4>
          <p className="text-muted-foreground text-xs line-clamp-2">{notification.message}</p>
        </div>
      </div>
    );
  }
};

export default NotificationItem;
