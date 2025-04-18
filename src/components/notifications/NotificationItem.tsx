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
    imageUrl?: string; // دعم صورة مصغرة اختيارية
    actionLabel?: string; // زر إجراء سريع
    onAction?: () => void; // دالة إجراء سريع
  };
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const navigate = useNavigate();
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

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.onAction) notification.onAction();
    markAsRead(notification.id);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'info':
        return <Info size={20} className="text-blue-500" />;
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-amber-500 animate-pulse" />;
      case 'error':
        return <AlertTriangle size={20} className="text-red-500 animate-pulse" />;
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };

  const getBgColor = () => {
    if (!notification.read) {
      return 'bg-gradient-to-l from-blue-50 via-white to-white shadow-md';
    }
    return 'bg-muted/40';
  };

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-100 transition-all border border-muted/60 group",
        getBgColor(),
        "shadow-sm"
      )}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={notification.title}
    >
      {/* صورة مصغرة أو أيقونة */}
      <div className="mt-0.5 shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-muted/30 overflow-hidden">
        {notification.imageUrl ? (
          <img src={notification.imageUrl} alt="صورة الإشعار" className="object-cover w-full h-full" />
        ) : (
          getIcon()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="font-medium text-sm line-clamp-1 text-primary">{notification.title}</h4>
          <div className="flex items-center gap-1 shrink-0">
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 -mt-1 -mr-1 opacity-70 group-hover:opacity-100"
              onClick={handleClear}
              tabIndex={-1}
              aria-label="إزالة الإشعار"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-xs line-clamp-2 mt-0.5">{notification.message}</p>
        <div className="flex justify-between items-center mt-1 gap-2">
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(notification.date), {
              addSuffix: true,
              locale: ar
            })}
          </span>
          <div className="flex gap-1 items-center">
            {notification.link && (
              <ExternalLink size={14} className="text-muted-foreground" />
            )}
            {/* زر إجراء سريع */}
            {notification.actionLabel && notification.onAction && (
              <Button
                variant="outline"
                size="sm"
                className="rounded px-2 py-0.5 text-[11px] border-primary hover:bg-primary/10"
                onClick={handleAction}
                tabIndex={-1}
              >
                {notification.actionLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
