
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Package,
  Factory,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  Receipt,
  Wallet,
  ArrowUpDown,
  ClipboardList,
  Box,
  FileBox,
  BoxIcon,
  ArrowLeftRight,
  Truck,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from './SidebarContext';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarItemProps {
  to: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  className?: string;
  exact?: boolean;
  badge?: string | number;
  badgeColor?: 'default' | 'red' | 'green' | 'blue' | 'yellow';
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  to,
  icon: Icon,
  title,
  className,
  exact = false,
  badge,
  badgeColor = 'default',
}) => {
  const { isExpanded } = useSidebar();

  const badgeColorClasses = {
    default: 'bg-gray-500 text-white',
    red: 'bg-red-500 text-white',
    green: 'bg-green-500 text-white',
    blue: 'bg-blue-500 text-white',
    yellow: 'bg-yellow-500 text-white',
  };

  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        cn(
          'flex items-center py-2 px-3 my-1 rounded-md text-sm font-medium transition-colors relative group',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          className
        )
      }
    >
      <Icon className={`h-5 w-5 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
      {isExpanded && <span>{title}</span>}
      {!isExpanded && (
        <div className="absolute left-full transform translate-x-2 z-50 ml-6 px-2 py-1 rounded bg-popover text-popover-foreground text-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-md">
          {title}
        </div>
      )}
      {badge && isExpanded && (
        <span
          className={cn(
            'ml-auto text-xs font-medium rounded-full px-2 py-0.5 min-w-[1.25rem] text-center',
            badgeColorClasses[badgeColor]
          )}
        >
          {badge}
        </span>
      )}
      {badge && !isExpanded && (
        <span
          className={cn(
            'absolute -top-1 -right-1 text-xs font-medium rounded-full px-1.5 py-0.5 min-w-[1rem] text-center',
            badgeColorClasses[badgeColor]
          )}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
};

interface SidebarGroupProps {
  title: string;
  children: React.ReactNode;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  defaultOpen?: boolean;
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({ title, children, icon: Icon, defaultOpen = false }) => {
  const { isExpanded } = useSidebar();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="py-1">
      {isExpanded ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-1">
          <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <div className="flex items-center">
              {Icon && <Icon className="h-5 w-5 mr-3" />}
              <span>{title}</span>
            </div>
            <ChevronRight
              className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'transform rotate-90')}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pr-2 pl-9 space-y-1">{children}</CollapsibleContent>
        </Collapsible>
      ) : (
        <>
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {Icon && <Icon className="h-5 w-5 mx-auto" />}
          </div>
          {children}
        </>
      )}
    </div>
  );
};

const ModernSidebar: React.FC = () => {
  const { isExpanded, toggleSidebar } = useSidebar();

  return (
    <aside
      className={cn(
        'bg-background border-l border-border h-screen flex flex-col transform transition-all duration-300 ease-in-out z-10',
        isExpanded ? 'w-60' : 'w-16'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <AnimatePresence initial={false} mode="wait">
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="font-bold text-lg"
            >
              نظام المصنع
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="font-bold text-lg mx-auto"
            >
              ن
            </motion.div>
          )}
        </AnimatePresence>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hover:bg-muted">
          {isExpanded ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="overflow-y-auto overflow-x-hidden flex-grow py-2 px-3">
        <SidebarItem to="/" icon={LayoutDashboard} title="لوحة التحكم" exact />

        <SidebarGroup title="المخزون" icon={Package} defaultOpen={true}>
          <SidebarItem to="/inventory/raw-materials" icon={Box} title="المواد الخام" />
          <SidebarItem to="/inventory/packaging" icon={BoxIcon} title="مواد التغليف" />
          <SidebarItem to="/inventory/semi-finished" icon={FileBox} title="نصف مصنعة" />
          <SidebarItem to="/inventory/finished-products" icon={Package} title="منتجات نهائية" />
          <SidebarItem 
            to="/inventory/low-stock" 
            icon={AlertTriangle} 
            title="مخزون منخفض" 
            badge={3} 
            badgeColor="red" 
          />
          <SidebarItem to="/inventory/tracking" icon={ArrowLeftRight} title="حركة المخزون" />
        </SidebarGroup>

        <SidebarGroup title="الإنتاج" icon={Factory} defaultOpen={false}>
          <SidebarItem to="/production/orders" icon={ClipboardList} title="أوامر الإنتاج" badge={5} badgeColor="blue" />
          <SidebarItem to="/production/packaging" icon={BoxIcon} title="التعبئة والتغليف" />
          <SidebarItem to="/production/planning" icon={BarChart3} title="تخطيط الإنتاج" />
        </SidebarGroup>

        <SidebarGroup title="المعاملات التجارية" icon={ShoppingCart} defaultOpen={false}>
          <SidebarItem to="/commercial/parties" icon={Users} title="العملاء والموردين" />
          <SidebarItem to="/commercial/invoices" icon={Receipt} title="الفواتير" />
          <SidebarItem to="/commercial/payments" icon={Wallet} title="المدفوعات" />
          <SidebarItem to="/commercial/returns" icon={ArrowUpDown} title="المرتجعات" />
          <SidebarItem to="/commercial/statements" icon={ClipboardList} title="كشوف الحسابات" />
          <SidebarItem to="/commercial/purchase-orders" icon={Truck} title="أوامر الشراء" />
        </SidebarGroup>

        <SidebarGroup title="التحليلات" icon={BarChart3} defaultOpen={false}>
          <SidebarItem to="/analytics" icon={BarChart3} title="التقارير والإحصائيات" />
        </SidebarGroup>

        <div className="pt-4 mt-4 border-t border-border">
          <SidebarItem to="/settings" icon={Settings} title="الإعدادات" />
        </div>
      </div>
    </aside>
  );
};

export default ModernSidebar;
