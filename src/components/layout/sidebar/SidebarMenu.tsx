
import React from 'react';
import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  BoxesIcon, 
  PackageSearch,
  Warehouse, 
  ShoppingCart, 
  Users, 
  BarChart,
  Settings, 
  ChartBar
} from 'lucide-react';
import SidebarMenuGroup, { SidebarMenuItem } from './SidebarMenuGroup';

const SidebarMenu: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    return currentPath.startsWith(path);
  };

  // Define menu groups
  const dashboardItems: SidebarMenuItem[] = [
    {
      title: 'لوحة التحكم',
      icon: LayoutDashboard,
      path: '/',
      active: currentPath === '/'
    },
  ];

  const inventoryItems: SidebarMenuItem[] = [
    {
      title: 'المواد الخام',
      icon: Package,
      path: '/inventory/raw-materials',
      active: isActive('/inventory/raw-materials')
    },
    {
      title: 'المنتجات النصف مصنعة',
      icon: PackageSearch,
      path: '/inventory/semi-finished',
      active: isActive('/inventory/semi-finished')
    },
    {
      title: 'مواد التعبئة',
      icon: BoxesIcon,
      path: '/inventory/packaging',
      active: isActive('/inventory/packaging')
    },
    {
      title: 'المنتجات النهائية',
      icon: Warehouse,
      path: '/inventory/finished',
      active: isActive('/inventory/finished')
    },
    {
      title: 'الأصناف منخفضة المخزون',
      icon: ChartBar,
      path: '/inventory/low-stock',
      active: isActive('/inventory/low-stock')
    },
    {
      title: 'تقارير المخزون',
      icon: BarChart,
      path: '/inventory/reports',
      active: isActive('/inventory/reports')
    },
  ];

  const commercialItems: SidebarMenuItem[] = [
    {
      title: 'فواتير المشتريات',
      icon: ShoppingCart,
      path: '/commercial/invoices',
      active: isActive('/commercial/invoices')
    },
    {
      title: 'الموردين والعملاء',
      icon: Users,
      path: '/commercial/parties',
      active: isActive('/commercial/parties')
    },
  ];

  const configItems: SidebarMenuItem[] = [
    {
      title: 'الإعدادات',
      icon: Settings,
      path: '/settings',
      active: isActive('/settings')
    },
  ];

  return (
    <div className="pb-12">
      <SidebarMenuGroup title="عام" items={dashboardItems} />
      <SidebarMenuGroup title="المخزون" items={inventoryItems} />
      <SidebarMenuGroup title="المشتريات" items={commercialItems} />
      <SidebarMenuGroup title="الإعدادات" items={configItems} />
    </div>
  );
};

export default SidebarMenu;
