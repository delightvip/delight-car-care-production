
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { motion } from 'framer-motion';

const NavbarLowStockAlert = () => {
  // استخدام try-catch لمنع انهيار التطبيق إذا لم يكن NotificationProvider متاحاً
  try {
    const { lowStockItems } = useNotifications();
    const totalLowStock = lowStockItems?.totalCount || 0;
    
    if (totalLowStock === 0) {
      return null;
    }
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Button variant="outline" size="sm" className="mr-2 text-destructive hover:bg-destructive/10" asChild>
          <Link to="/inventory/low-stock" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            <span>المخزون المنخفض</span>
            <Badge variant="destructive" className="ml-1">{totalLowStock}</Badge>
          </Link>
        </Button>
      </motion.div>
    );
  } catch (error) {
    console.error("NavbarLowStockAlert: Error using notifications context", error);
    return null; // عرض شاشة فارغة بدلاً من انهيار التطبيق
  }
};

export default NavbarLowStockAlert;
