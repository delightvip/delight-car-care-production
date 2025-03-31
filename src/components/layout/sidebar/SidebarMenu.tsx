
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  ShoppingCart,
  Package,
  Factory,
  BarChart3,
  Settings,
  DollarSign,
  Archive,
  Receipt,
  Wallet,
  Truck,
  Users,
  RotateCw,
  TrendingUp,
  LucideIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import SidebarMenuGroup from './SidebarMenuGroup';

interface SidebarMenuItem {
  icon: LucideIcon;
  title: string;
  path: string;
  badge?: number;
  submenu?: {
    title: string;
    path: string;
    badge?: number;
  }[];
}

const SidebarMenu = () => {
  const location = useLocation();
  
  const menuItems: Record<string, SidebarMenuItem[]> = {
    main: [
      { icon: Home, title: 'الرئيسية', path: '/' },
    ],
    commercial: [
      { icon: ShoppingCart, title: 'لوحة المبيعات', path: '/commercial' },
      { icon: Receipt, title: 'الفواتير', path: '/commercial/invoices' },
      { icon: Users, title: 'العملاء والموردين', path: '/commercial/parties' },
      { icon: Wallet, title: 'المدفوعات', path: '/commercial/payments' },
      { icon: TrendingUp, title: 'الأرباح', path: '/commercial/profits' },
      { icon: RotateCw, title: 'المرتجعات', path: '/commercial/returns' },
    ],
    inventory: [
      { icon: Archive, title: 'المخزون', path: '/inventory' },
      { icon: Package, title: 'المواد الخام', path: '/inventory/raw-materials' },
      { icon: Package, title: 'مواد التعبئة', path: '/inventory/packaging' },
      { icon: Package, title: 'منتجات نصف مصنعة', path: '/inventory/semi-finished' },
      { icon: Archive, title: 'المنتجات النهائية', path: '/inventory/finished' },
      { icon: Truck, title: 'حركة المخزون', path: '/inventory/tracking' },
    ],
    production: [
      { icon: Factory, title: 'الإنتاج', path: '/production' },
      { icon: Factory, title: 'أوامر الإنتاج', path: '/production/orders' },
      { icon: Factory, title: 'أوامر التعبئة', path: '/production/packaging-orders' },
    ],
    financial: [
      { icon: DollarSign, title: 'المالية', path: '/financial' },
      { icon: DollarSign, title: 'المعاملات', path: '/financial/transactions' },
    ],
    analytics: [
      { icon: BarChart3, title: 'التقارير والتحليل', path: '/analytics' },
    ],
    settings: [
      { icon: Settings, title: 'الإعدادات', path: '/settings' },
    ],
  };
  
  // Check if a path is active or not
  const isActive = (path: string) => {
    // Exact match for home
    if (path === '/' && location.pathname === '/') return true;
    
    // For other paths, check if the current path starts with the given path
    // but avoid matching parent paths with child paths
    if (path !== '/') {
      const endWithSlashPath = path.endsWith('/') ? path : `${path}/`;
      const currentPath = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
      
      return (
        currentPath.startsWith(endWithSlashPath) ||
        location.pathname === path
      );
    }
    
    return false;
  };
  
  return (
    <nav className="px-2 py-3 flex flex-col gap-1">
      {/* Main Links */}
      {menuItems.main.map((item) => (
        <Button
          key={item.path}
          variant={isActive(item.path) ? "secondary" : "ghost"}
          className="w-full justify-start text-base font-normal"
          asChild
        >
          <Link to={item.path} className="gap-3">
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        </Button>
      ))}
      
      {/* Commercial Group */}
      <SidebarMenuGroup title="إدارة المبيعات" items={menuItems.commercial} isActive={isActive} />
      
      {/* Inventory Group */}
      <SidebarMenuGroup title="إدارة المخزون" items={menuItems.inventory} isActive={isActive} />
      
      {/* Production Group */}
      <SidebarMenuGroup title="إدارة الإنتاج" items={menuItems.production} isActive={isActive} />
      
      {/* Financial Group */}
      <SidebarMenuGroup title="الإدارة المالية" items={menuItems.financial} isActive={isActive} />
      
      {/* Analytics Group */}
      <SidebarMenuGroup title="التحليلات" items={menuItems.analytics} isActive={isActive} />
      
      <div className="mt-auto">
        {/* Settings */}
        {menuItems.settings.map((item) => (
          <Button
            key={item.path}
            variant={isActive(item.path) ? "secondary" : "ghost"}
            className="w-full justify-start text-base font-normal mt-2"
            asChild
          >
            <Link to={item.path} className="gap-3">
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  );
};

export default SidebarMenu;
