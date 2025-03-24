
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutDashboard, 
  Package,
  Flask,
  Box,
  ShoppingBag,
  AlertTriangle,
  Factory,
  Layers
} from 'lucide-react';

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
  children: React.ReactNode;
}

const NavGroup: React.FC<NavGroupProps> = ({ title, children }) => {
  return (
    <div className="py-2">
      <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;
  
  return (
    <aside className="w-64 h-screen border-r border-gray-200 bg-white hidden md:block fixed top-0 right-0 pt-16">
      <ScrollArea className="h-full py-4 px-3">
        <div className="space-y-4">
          <NavGroup title="الرئيسية">
            <NavItem 
              to="/" 
              icon={<LayoutDashboard size={20} />} 
              label="لوحة التحكم" 
              active={pathname === '/'}
            />
          </NavGroup>
          
          <NavGroup title="المخزون">
            <NavItem 
              to="/inventory/raw-materials" 
              icon={<Package size={20} />} 
              label="المواد الأولية" 
              active={pathname === '/inventory/raw-materials'}
            />
            <NavItem 
              to="/inventory/semi-finished" 
              icon={<Flask size={20} />} 
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
          </NavGroup>
          
          <NavGroup title="الإنتاج">
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
          </NavGroup>
        </div>
      </ScrollArea>
    </aside>
  );
};

export default Sidebar;
