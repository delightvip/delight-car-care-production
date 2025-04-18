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
  LucideIcon,
  CalendarRange,
  ActivitySquare,
  Database
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import SidebarMenuGroup from './SidebarMenuGroup';

interface SidebarMenuItem {
  icon: LucideIcon;
  title: string;
  path: string;
  badge?: string;
  submenu?: {
    title: string;
    path: string;
    badge?: string;
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
      { icon: Receipt, title: 'الفواتير', path: '/commercial/invoices', badge: '3' },
      { icon: Users, title: 'العملاء والموردين', path: '/commercial/parties' },
      { icon: Wallet, title: 'المدفوعات', path: '/commercial/payments' },
      { icon: TrendingUp, title: 'الأرباح', path: '/commercial/profits' },
      { icon: RotateCw, title: 'المرتجعات', path: '/commercial/returns' },
    ],
    inventory: [
      { icon: Archive, title: 'المخزون', path: '/inventory' },
      { icon: Package, title: 'المواد الخام', path: '/inventory/raw-materials', submenu: [
        { title: 'الموردون', path: '/inventory/raw-materials/suppliers', badge: '2' },
        { title: 'المشتريات', path: '/inventory/raw-materials/purchases' },
      ] },
      { icon: Package, title: 'مواد التعبئة', path: '/inventory/packaging' },
      { icon: Package, title: 'منتجات نصف مصنعة', path: '/inventory/semi-finished' },
      { icon: Package, title: 'المنتجات النهائية', path: '/inventory/finished-products' },
      { icon: Truck, title: 'حركة المخزون', path: '/inventory/tracking' },
    ],
    production: [
      { icon: Factory, title: 'الإنتاج', path: '/production' },
      { icon: Factory, title: 'أوامر الإنتاج', path: '/production/orders' },
      { icon: Package, title: 'أوامر التعبئة', path: '/production/packaging-orders' },
      { icon: CalendarRange, title: 'تخطيط الإنتاج', path: '/production/planning' },
    ],
    financial: [
      { icon: DollarSign, title: 'المالية', path: '/financial' },
      { icon: DollarSign, title: 'المعاملات', path: '/financial/transactions' },
      { icon: DollarSign, title: 'الفئات', path: '/financial/categories' },
    ],
    analytics: [
      { icon: BarChart3, title: 'التقارير والتحليل', path: '/analytics' },
      { icon: Database, title: 'تحليلات المخزون المتقدمة', path: '/analytics/inventory-analytics' },
      { icon: ActivitySquare, title: 'توزيع المخزون', path: '/analytics/inventory-distribution' },
    ],
    settings: [
      { icon: Settings, title: 'الإعدادات', path: '/settings' },
    ],
  };
  
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    
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
      
      <SidebarMenuGroup title="إدارة المبيعات" items={menuItems.commercial} isActive={isActive} />
      
      <SidebarMenuGroup title="إدارة المخزون" items={menuItems.inventory} isActive={isActive} />
      
      <SidebarMenuGroup title="إدارة الإنتاج" items={menuItems.production} isActive={isActive} />
      
      <SidebarMenuGroup title="الإدارة المالية" items={menuItems.financial} isActive={isActive} />
      
      <SidebarMenuGroup title="التحليلات" items={menuItems.analytics} isActive={isActive} />
      
      {menuItems.commercial.map((item) => (
        <Button
          key={item.path}
          variant={isActive(item.path) ? "secondary" : "ghost"}
          className="w-full justify-start text-base font-normal"
          asChild
        >
          <Link to={item.path} className="gap-3">
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-xs font-bold py-1 px-2 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        </Button>
      ))}
      
      <div className="mt-auto">
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
