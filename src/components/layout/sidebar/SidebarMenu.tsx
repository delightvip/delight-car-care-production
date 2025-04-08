import React, { useState } from 'react';
import { LayoutDashboard, Users, ShoppingCart, Package, DollarSign, FileText, Settings, CircleDollarSign } from 'lucide-react';
import { Separator } from "@/components/ui/separator"
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from "@/components/theme-provider"

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path?: string;
  submenu?: MenuItem[];
}

interface SidebarMenuProps {
  isCollapsed: boolean;
}

const iconSize = 16;

const SidebarMenu: React.FC<SidebarMenuProps> = ({ isCollapsed }) => {
  const location = useLocation();
  const { theme } = useTheme()
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);
  
  const toggleSubmenu = (title: string) => {
    setOpenSubmenus(prev => {
      if (prev.includes(title)) {
        return prev.filter(item => item !== title);
      } else {
        return [...prev, title];
      }
    });
  };

  // قائمة العناصر الرئيسية
  const menuItems = [
    {
      title: "لوحة التحكم",
      icon: <LayoutDashboard size={iconSize} />,
      path: "/",
    },
    {
      title: "إدارة العملاء",
      icon: <Users size={iconSize} />,
      submenu: [
        {
          title: "قائمة العملاء",
          path: "/parties",
        },
        {
          title: "إضافة عميل جديد",
          path: "/parties/new",
        },
      ],
    },
    {
      title: "إدارة المبيعات",
      icon: <ShoppingCart size={iconSize} />,
      submenu: [
        {
          title: "قائمة الفواتير",
          path: "/invoices",
        },
        {
          title: "إضافة فاتورة جديدة",
          path: "/invoices/new",
        },
        {
          title: "إدارة المرتجعات",
          path: "/returns",
        },
        {
          title: "إضافة مرتجع",
          path: "/returns/new",
        },
      ],
    },
    {
      title: "إدارة المخزون",
      icon: <Package size={iconSize} />,
      submenu: [
        {
          title: "إدارة المواد الخام",
          path: "/raw-materials",
        },
        {
          title: "إدارة مواد التعبئة",
          path: "/packaging-materials",
        },
        {
          title: "إدارة المنتجات",
          path: "/products",
        },
        {
          title: "إدارة التصنيع",
          path: "/production-orders",
        },
        {
          title: "إدارة وحدات القياس",
          path: "/units",
        },
      ],
    },
    {
      title: "الإدارة المالية",
      icon: <DollarSign size={iconSize} />,
      submenu: [
        {
          title: "لوحة التحكم المالية",
          path: "/financial",
        },
        {
          title: "إضافة معاملة",
          path: "/financial/transactions/new",
        },
        {
          title: "إدارة الخزينة",
          path: "/financial/cash-management",
        },
        {
          title: "فئات المعاملات",
          path: "/financial/categories",
        },
      ],
    },
    {
      title: "سجل الحسابات",
      icon: <FileText size={iconSize} />,
      submenu: [
        {
          title: "كشف حساب",
          path: "/ledger",
        },
      ],
    },
    {
      title: "إعدادات النظام",
      icon: <Settings size={iconSize} />,
      submenu: [
        {
          title: "إعدادات عامة",
          path: "/settings",
        },
        {
          title: "إعدادات المستخدمين",
          path: "/users",
        },
        {
          title: "نسخ احتياطي",
          path: "/backup",
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-center">
        <h1 className="text-lg font-bold">
          {isCollapsed ? 'SM' : 'اسم المؤسسة'}
        </h1>
        <Separator className="my-2" />
      </div>
      <nav className="flex-1">
        {menuItems.map((item, index) => (
          item.submenu ? (
            <div key={index} className="space-y-1">
              <button
                onClick={() => toggleSubmenu(item.title)}
                className={`flex items-center w-full p-2 text-sm font-medium rounded-md transition-colors hover:bg-secondary ${location.pathname.startsWith(item.path || '') ? 'bg-secondary' : ''}`}
              >
                {item.icon}
                {!isCollapsed && <span className="ml-2">{item.title}</span>}
              </button>
              {openSubmenus.includes(item.title) && (
                <div className="pl-4 space-y-1">
                  {item.submenu.map((subItem, subIndex) => (
                    <NavLink
                      key={subIndex}
                      to={subItem.path || ''}
                      className={`flex items-center w-full p-2 text-sm font-medium rounded-md transition-colors hover:bg-secondary ${location.pathname === subItem.path ? 'bg-secondary' : ''}`}
                    >
                      {subItem.title}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={index}
              to={item.path || ''}
              className={`flex items-center w-full p-2 text-sm font-medium rounded-md transition-colors hover:bg-secondary ${location.pathname === item.path ? 'bg-secondary' : ''}`}
            >
              {item.icon}
              {!isCollapsed && <span className="ml-2">{item.title}</span>}
            </NavLink>
          )
        ))}
      </nav>
    </div>
  );
};

export default SidebarMenu;
