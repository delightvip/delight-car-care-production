
import React from 'react';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import NavbarRefreshButton from './navbar/NavbarRefreshButton';
import NavbarLowStockAlert from './navbar/NavbarLowStockAlert';

export function NavbarNotifications() {
  const { unreadCount } = useNotifications();
  
  return (
    <div className="flex items-center gap-3">
      <NavbarLowStockAlert />
      <NavbarRefreshButton />
      <NotificationPanel />
    </div>
  );
}
