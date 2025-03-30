
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

// Create a fallback safe version that doesn't rely on the context directly
const NavbarLowStockAlert = () => {
  // We'll prevent the direct import of useNotifications at the top level
  // Instead, we'll use a safe approach that won't crash the app
  let totalLowStock = 0;
  let component = null;
  
  try {
    // Only import and use the hook inside the try block
    const { useNotifications } = require('@/components/notifications/NotificationProvider');
    const { lowStockItems } = useNotifications();
    totalLowStock = lowStockItems?.totalCount || 0;
    
    if (totalLowStock > 0) {
      component = (
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
    }
  } catch (error) {
    console.error("NavbarLowStockAlert: Error using notifications context", error);
    // Return null to render nothing if there's any error
    return null;
  }
  
  // Return the component or null if empty
  return component;
};

export default NavbarLowStockAlert;
