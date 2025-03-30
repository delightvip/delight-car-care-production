import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  LayoutDashboard, 
  Package,
  Beaker,
  Box,
  ShoppingBag,
  AlertTriangle,
  Factory,
  Layers,
  ChevronDown,
  ChevronRight,
  BarChart4,
  ListChecks,
  Settings,
  Users,
  TrendingUp,
  Wallet,
  DollarSign,
  PieChart,
  Tags,
  LineChart
} from 'lucide-react';
import { useSidebar } from './SidebarContext';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, active }) => {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-200 
                ${active 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {active && (
        <div className="w-1 h-6 bg-primary rounded-full ml-auto"></div>
      )}
    </Link>
  );
};

interface NavGroupProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const NavGroup: React.FC<NavGroupProps> = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="py-2">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 cursor-pointer transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <span className="uppercase tracking-wider">{title}</span>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const { isOpen } = useSidebar();
  
  return (
    <aside className={`w-64 h-screen border-r border-gray-200 bg-white fixed top-0 pt-16 z-10 transition-all duration-300 ${
      isOpen ? 'md:block' : 'hidden'
    }`}>
      <ScrollArea className="h-full py-4 px-3">
        <div className="space-y-4">
          <NavGroup title="الرئيسية" icon={<LayoutDashboard size={16} />}>
            <NavItem 
              to="/" 
              icon={<LayoutDashboard size={20} />} 
              label="لوحة التحكم" 
              active={pathname === '/'}
            />
            <NavItem 
              to="/analytics" 
              icon={<BarChart4 size={20} />} 
              label="التحليلات والإحصائيات" 
              active={pathname === '/analytics'}
            />
          </NavGroup>
          
          <NavGroup title="المخزون" icon={<Package size={16} />}>
            <NavItem 
              to="/inventory/raw-materials" 
              icon={<Package size={20} />} 
              label="المواد الأولية" 
              active={pathname === '/inventory/raw-materials'}
            />
            <NavItem 
              to="/inventory/semi-finished" 
              icon={<Beaker size={20} />} 
              label="المنتجات النصف مصنعة" 
              active={pathname === '/inventory/semi-finished'}
            />
            <NavItem 
              to="/inventory/packaging" 
              icon={<Box size={20} />} 
              label="مستلزمات التعبئة" 
              active={pathname === '/inventory/packaging'}
            />
            <NavItem 
              to="/inventory/finished-products" 
              icon={<ShoppingBag size={20} />} 
              label="المنتجات النهائية" 
              active={pathname === '/inventory/finished-products'}
            />
            <NavItem 
              to="/inventory/low-stock" 
              icon={<AlertTriangle size={20} />} 
              label="المخزون المنخفض" 
              active={pathname === '/inventory/low-stock'}
            />
            <NavItem 
              to="/inventory/tracking" 
              icon={<ListChecks size={20} />} 
              label="تتبع المخزون" 
              active={pathname === '/inventory/tracking'}
            />
            <NavItem 
              to="/inventory/reports" 
              icon={<LineChart size={20} />} 
              label="تقارير المخزون" 
              active={pathname === '/inventory/reports' || pathname.includes('/inventory/reports')}
            />
          </NavGroup>
          
          <NavGroup title="الإنتاج" icon={<Factory size={16} />}>
            <NavItem 
              to="/production/orders" 
              icon={<Factory size={20} />} 
              label="أوامر الإنتاج" 
              active={pathname === '/production/orders'}
            />
            <NavItem 
              to="/production/packaging" 
              icon={<Layers size={20} />} 
              label="أوامر التعبئة" 
              active={pathname === '/production/packaging'}
            />
            <NavItem 
              to="/production/planning" 
              icon={<TrendingUp size={20} />} 
              label="تخطيط الإنتاج" 
              active={pathname === '/production/planning'}
            />
          </NavGroup>
          
          <NavGroup title="المالية" icon={<Wallet size={16} />} defaultOpen={pathname.startsWith('/financial')}>
            <NavItem 
              to="/financial" 
              icon={<DollarSign size={20} />} 
              label="لوحة التحكم المالية" 
              active={pathname === '/financial'}
            />
            <NavItem 
              to="/financial/transactions/new" 
              icon={<Wallet size={20} />} 
              label="معاملة جديدة" 
              active={pathname === '/financial/transactions/new'}
            />
            <NavItem 
              to="/financial/categories" 
              icon={<Tags size={20} />} 
              label="فئات المعاملات" 
              active={pathname === '/financial/categories'}
            />
          </NavGroup>
          
          <NavGroup title="الإدارة" icon={<Settings size={16} />} defaultOpen={false}>
            <NavItem 
              to="/settings/users" 
              icon={<Users size={20} />} 
              label="إدارة المستخدمين" 
              active={pathname === '/settings/users'}
            />
            <NavItem 
              to="/settings/system" 
              icon={<Settings size={20} />} 
              label="إعدادات النظام" 
              active={pathname === '/settings/system'}
            />
          </NavGroup>
        </div>
      </ScrollArea>
    </aside>
  );
};

export default Sidebar;
