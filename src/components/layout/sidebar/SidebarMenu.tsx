
import React from 'react';
import { useLocation } from 'react-router-dom';
import SidebarMenuGroup from './SidebarMenuGroup';
import {
  ShoppingCart,
  Users,
  Package,
  Coins,
  Factory,
  Settings,
  BarChart,
  FileText,
  DollarSign,
  ClipboardList,
  Truck,
  CreditCard
} from 'lucide-react';

const SidebarMenu: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  
  return (
    <div className="py-2 space-y-4">
      <SidebarMenuGroup
        title="نظرة عامة"
        items={[
          {
            title: "لوحة التحكم",
            icon: BarChart,
            path: "/",
            active: isActive('/')
          }
        ]}
      />
      
      <SidebarMenuGroup
        title="المخزون"
        items={[
          {
            title: "المواد الخام",
            icon: Package,
            path: "/inventory/raw-materials",
            active: isActive('/inventory/raw-materials')
          },
          {
            title: "نصف مصنعة",
            icon: Package,
            path: "/inventory/semi-finished",
            active: isActive('/inventory/semi-finished')
          },
          {
            title: "مواد التعبئة",
            icon: Package,
            path: "/inventory/packaging-materials",
            active: isActive('/inventory/packaging-materials')
          },
          {
            title: "المنتجات النهائية",
            icon: Package,
            path: "/inventory/finished-products",
            active: isActive('/inventory/finished-products')
          },
          {
            title: "تقارير المخزون",
            icon: FileText,
            path: "/inventory/reports",
            active: isActive('/inventory/reports')
          }
        ]}
      />
      
      <SidebarMenuGroup
        title="الإنتاج"
        items={[
          {
            title: "أوامر الإنتاج",
            icon: Factory,
            path: "/production/orders",
            active: isActive('/production/orders')
          },
          {
            title: "أوامر التعبئة",
            icon: ClipboardList,
            path: "/production/packaging",
            active: isActive('/production/packaging')
          }
        ]}
      />
      
      <SidebarMenuGroup
        title="العملاء و الموردين"
        items={[
          {
            title: "العملاء",
            icon: Users,
            path: "/commercial/parties/customers",
            active: isActive('/commercial/parties/customers')
          },
          {
            title: "الموردين",
            icon: Truck,
            path: "/commercial/parties/suppliers",
            active: isActive('/commercial/parties/suppliers')
          },
          {
            title: "المعاملات المالية",
            icon: DollarSign,
            path: "/commercial/payments",
            active: isActive('/commercial/payments')
          },
          {
            title: "دفتر الحسابات",
            icon: FileText,
            path: "/commercial/ledger",
            active: isActive('/commercial/ledger')
          }
        ]}
      />
      
      <SidebarMenuGroup
        title="الإدارة المالية"
        items={[
          {
            title: "المعاملات المالية",
            icon: Coins,
            path: "/financial",
            active: isActive('/financial')
          },
          {
            title: "التحصيلات والمدفوعات",
            icon: CreditCard,
            path: "/financial/payments",
            active: isActive('/financial/payments')
          },
          {
            title: "التقارير المالية",
            icon: FileText,
            path: "/financial/reports",
            active: isActive('/financial/reports')
          }
        ]}
      />
      
      <SidebarMenuGroup
        title="الإعدادات"
        items={[
          {
            title: "إعدادات النظام",
            icon: Settings,
            path: "/settings",
            active: isActive('/settings')
          }
        ]}
      />
    </div>
  );
};

export default SidebarMenu;
