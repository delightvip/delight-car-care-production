import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  AlertTriangle,
  CreditCard,
  DollarSign,
  PieChart,
  Tags,
  Search,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from './SidebarContext';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarItemProps {
  to: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  className?: string;
  exact?: boolean;
  badge?: string | number;
  badgeColor?: 'default' | 'red' | 'green' | 'blue' | 'yellow';
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  to,
  icon: Icon,
  title,
  className,
  exact = false,
  badge,
  badgeColor = 'default',
  onClick
}) => {
  const { isExpanded, isMobile, toggleSidebar } = useSidebar();
  const location = useLocation();
  const isActive = exact 
    ? location.pathname === to 
    : location.pathname.startsWith(to);

  const badgeColorClasses = {
    default: 'bg-muted text-muted-foreground',
    red: 'bg-destructive text-destructive-foreground',
    green: 'bg-success text-success-foreground',
    blue: 'bg-primary text-primary-foreground',
    yellow: 'bg-warning text-warning-foreground',
  };

  const handleClick = () => {
    if (isMobile) {
      setTimeout(() => toggleSidebar(), 150);
    }
    if (onClick) onClick();
  };

  return (
    <NavLink
      to={to}
      end={exact}
      onClick={handleClick}
      className={({ isActive }) =>
        cn(
          'flex items-center py-2 px-3 my-1 rounded-md text-sm font-medium transition-all duration-200 relative group',
          isActive
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          className
        )
      }
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center"
      >
        <Icon className={`h-5 w-5 ${isExpanded ? 'mr-3' : 'mx-auto'} flex-shrink-0`} />
      </motion.div>
      
      {isExpanded && <span className="truncate">{title}</span>}
      
      {!isExpanded && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="sr-only">{title}</span>
            </TooltipTrigger>
            <TooltipContent side="right" className="z-50">
              {title}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {badge && isExpanded && (
        <motion.span
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className={cn(
            'ml-auto text-xs font-medium rounded-full px-2 py-0.5 min-w-[1.25rem] text-center',
            badgeColorClasses[badgeColor]
          )}
        >
          {badge}
        </motion.span>
      )}
      
      {badge && !isExpanded && (
        <motion.span
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className={cn(
            'absolute -top-1 -right-1 text-xs font-medium rounded-full px-1.5 py-0.5 min-w-[1rem] text-center',
            badgeColorClasses[badgeColor]
          )}
        >
          {badge}
        </motion.span>
      )}
    </NavLink>
  );
};

interface SidebarGroupProps {
  title: string;
  children: React.ReactNode;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  defaultOpen?: boolean;
  id: string;
  color?: 'default' | 'primary' | 'success' | 'destructive' | 'warning';
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({ 
  title, 
  children, 
  icon: Icon, 
  defaultOpen = false,
  id,
  color = 'default' 
}) => {
  const { isExpanded } = useSidebar();
  const storageKey = `sidebar-group-${id}`;
  const [isOpen, setIsOpen] = useLocalStorage(storageKey, defaultOpen);
  const location = useLocation();
  const groupRef = useRef<HTMLDivElement>(null);
  
  const sidebarGroupsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [lastOpenedGroup, setLastOpenedGroup] = useState<string | null>(null);
  
  useEffect(() => {
    if (lastOpenedGroup && sidebarGroupsRef.current.has(lastOpenedGroup)) {
      const groupElement = sidebarGroupsRef.current.get(lastOpenedGroup);
      const sidebarContent = document.querySelector('.sidebar-content');
      
      if (groupElement && sidebarContent) {
        const sidebarRect = sidebarContent.getBoundingClientRect();
        const groupRect = groupElement.getBoundingClientRect();
        
        const targetScroll = 
          groupElement.offsetTop - (sidebarRect.height / 2) + (groupRect.height / 2);
        
        sidebarContent.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }
    }
  }, [lastOpenedGroup]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .group-module + .group-module {
        margin-top: 0.75rem;
      }
      
      .group-module[data-open="true"] + .group-module {
        margin-top: 1.5rem;
      }
      
      .group-module[data-open="true"] {
        margin-bottom: 0.75rem;
      }
      
      @keyframes expandSpace {
        from { margin-top: 0.75rem; }
        to { margin-top: 1.5rem; }
      }
      
      @keyframes collapseSpace {
        from { margin-top: 1.5rem; }
        to { margin-top: 0.75rem; }
      }
      
      .sidebar-content {
        scroll-behavior: smooth;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const hasActiveChild = React.Children.toArray(children).some((child) => {
    if (React.isValidElement(child) && child.props.to) {
      return location.pathname.startsWith(child.props.to);
    }
    return false;
  });

  const colorClasses = {
    default: 'text-muted-foreground hover:text-foreground',
    primary: 'text-primary-muted hover:text-primary',
    success: 'text-success-muted hover:text-success',
    destructive: 'text-destructive-muted hover:text-destructive',
    warning: 'text-warning-muted hover:text-warning'
  };

  useEffect(() => {
    if (isOpen && groupRef.current && isExpanded) {
      const sidebarContainer = groupRef.current.closest('.sidebar-content');
      if (sidebarContainer) {
        const containerHeight = sidebarContainer.clientHeight;
        const groupPosition = groupRef.current.getBoundingClientRect();
        const scrollPosition = groupPosition.top + sidebarContainer.scrollTop - (containerHeight / 2) + (groupPosition.height / 2);
        
        sidebarContainer.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [isOpen, isExpanded]);

  useEffect(() => {
    if (hasActiveChild && !isOpen) {
      setIsOpen(true);
    }
  }, [hasActiveChild, isOpen, setIsOpen]);

  const childCount = React.Children.count(children);

  return (
    <div 
      className={cn(
        "relative",
        !isExpanded && "group-module"
      )}
      ref={(el) => {
        groupRef.current = el;
        if (el) sidebarGroupsRef.current.set(id, el);
      }}
      data-expanded={isExpanded}
      data-open={isOpen}
    >
      {isExpanded ? (
        <Collapsible 
          open={isOpen} 
          onOpenChange={(open) => {
            setIsOpen(open);
            if (open) setLastOpenedGroup(id);
          }} 
          className="space-y-1"
        >
          <CollapsibleTrigger 
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-all",
              "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20",
              hasActiveChild ? "bg-muted/50" : "",
              colorClasses[color]
            )}
          >
            <div className="flex items-center">
              {Icon && (
                <motion.div
                  whileHover={{ rotate: hasActiveChild ? 0 : 5 }}
                  className={cn(
                    "flex items-center justify-center h-6 w-6 mr-2",
                    hasActiveChild && "text-primary"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
              )}
              <span>{title}</span>
            </div>
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          </CollapsibleTrigger>
          <CollapsibleContent 
            className="pr-2 pl-9 space-y-1"
            forceMount
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : -10 }}
              transition={{ duration: 0.2, staggerChildren: 0.05 }}
            >
              {children}
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <>
          <motion.div
            className={cn(
              "relative",
              isOpen ? "mb-[10px]" : "mb-[2px]"
            )}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={cn(
                      "px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md cursor-pointer",
                      "flex items-center justify-center",
                      hasActiveChild ? "bg-muted/50 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      colorClasses[color]
                    )}
                    onClick={() => {
                      setIsOpen(!isOpen);
                      if (!isOpen) setLastOpenedGroup(id);
                    }}
                  >
                    {Icon && <Icon className="h-5 w-5 mx-auto" />}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {title}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
          
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ 
                  opacity: 1, 
                  height: "auto",
                  marginTop: "6px",
                  marginBottom: "6px"
                }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="pr-1 pl-1"
              >
                <div className="relative pl-2 border-r-2 border-gray-200 dark:border-gray-700">
                  {React.Children.map(children, (child, index) => (
                    <motion.div
                      initial={{ x: -5, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="mb-1 last:mb-0"
                    >
                      {child}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

const ModernSidebar: React.FC = () => {
  const { isExpanded, toggleSidebar, isMobile } = useSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{to: string, title: string}[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const location = useLocation();

  const allNavigationItems = [
    { to: '/', title: 'لوحة التحكم' },
    { to: '/inventory/raw-materials', title: 'المواد الخام' },
    { to: '/inventory/packaging', title: 'مواد التغليف' },
    { to: '/inventory/semi-finished', title: 'نصف مصنعة' },
    { to: '/inventory/finished-products', title: 'منتجات نهائية' },
    { to: '/inventory/low-stock', title: 'مخزون منخفض' },
    { to: '/inventory/tracking', title: 'حركة المخزون' },
    { to: '/inventory/reports', title: 'تقارير المخزون' },
    { to: '/production/orders', title: 'أوامر الإنتاج' },
    { to: '/production/packaging-orders', title: 'التعبئة والتغليف' },
    { to: '/production/planning', title: 'تخطيط الإنتاج' },
    { to: '/commercial', title: 'لوحة التحكم التجارية' },
    { to: '/commercial/parties', title: 'العملاء والموردين' },
    { to: '/commercial/invoices', title: 'الفواتير' },
    { to: '/commercial/payments', title: 'المدفوعات' },
    { to: '/commercial/returns', title: 'المرتجعات' },
    { to: '/commercial/statements', title: 'كشوف الحسابات' },
    { to: '/commercial/purchase-orders', title: 'أوامر الشراء' },
    { to: '/financial', title: 'لوحة التحكم المالية' },
    { to: '/financial/transactions/new', title: 'معاملة جديدة' },
    { to: '/financial/categories', title: 'فئات المعاملات' },
    { to: '/analytics', title: 'التقارير والإحصائيات' },
    { to: '/settings', title: 'الإعدادات' },
  ];

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = allNavigationItems.filter(item => 
      item.title.toLowerCase().includes(query)
    );
    
    setSearchResults(results);
    setShowSearchResults(true);
  }, [searchQuery]);

  useEffect(() => {
    setSearchQuery('');
    setShowSearchResults(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isExpanded) {
          const searchInput = document.getElementById('sidebar-search');
          if (searchInput) searchInput.focus();
        }
      }
      
      if (e.key === 'Escape' && showSearchResults) {
        setSearchQuery('');
        setShowSearchResults(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, showSearchResults]);

  return (
    <>
      <AnimatePresence>
        {isMobile && isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: isExpanded ? '16rem' : '4rem',
          x: isMobile && !isExpanded ? '100%' : 0,
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          duration: 0.3
        }}
        className={cn(
          'bg-background border-l border-border h-screen flex flex-col fixed top-0 right-0 z-30',
          'will-change-transform',
          'shadow-sm',
          'overflow-hidden'
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
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="hover:bg-muted flex-shrink-0"
            title={isExpanded ? "طي القائمة" : "توسيع القائمة"}
          >
            {isExpanded ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        {isExpanded && (
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="sidebar-search"
                type="search"
                placeholder="بحث..."
                className="pl-2 pr-8 h-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {showSearchResults && searchResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md overflow-hidden"
                >
                  <div className="max-h-60 overflow-y-auto py-1">
                    {searchResults.map((result, index) => (
                      <NavLink 
                        key={index} 
                        to={result.to}
                        className={({ isActive }) => cn(
                          "flex items-center px-3 py-1.5 text-sm hover:bg-muted",
                          isActive ? "bg-primary/10 text-primary" : "text-foreground"
                        )}
                        onClick={() => {
                          setSearchQuery('');
                          setShowSearchResults(false);
                        }}
                      >
                        <span>{result.title}</span>
                      </NavLink>
                    ))}
                  </div>
                </motion.div>
              )}
              {showSearchResults && searchResults.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md p-2 text-center text-sm text-muted-foreground"
                >
                  لا توجد نتائج
                </motion.div>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground text-center">
              اضغط <kbd className="bg-muted px-1 rounded">Ctrl + K</kbd> للبحث
            </div>
          </div>
        )}

        <div className="overflow-y-auto overflow-x-hidden flex-grow py-2 px-3 sidebar-content">
          <SidebarItem to="/" icon={LayoutDashboard} title="لوحة التحكم" exact />

          <SidebarGroup title="المخزون" icon={Package} defaultOpen={false} id="inventory" color="primary">
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
            <SidebarItem to="/inventory/reports" icon={BarChart3} title="تقارير المخزون" />
          </SidebarGroup>

          <SidebarGroup title="الإنتاج" icon={Factory} defaultOpen={false} id="production" color="success">
            <SidebarItem to="/production/orders" icon={ClipboardList} title="أوامر الإنتاج" badge={5} badgeColor="blue" />
            <SidebarItem to="/production/packaging-orders" icon={BoxIcon} title="التعبئة والتغليف" />
            <SidebarItem to="/production/planning" icon={BarChart3} title="تخطيط الإنتاج" />
          </SidebarGroup>

          <SidebarGroup title="المعاملات التجارية" icon={ShoppingCart} defaultOpen={false} id="commercial" color="warning">
            <SidebarItem to="/commercial" icon={LayoutDashboard} title="لوحة التحكم التجارية" />
            <SidebarItem to="/commercial/parties" icon={Users} title="العملاء والموردين" />
            <SidebarItem to="/commercial/invoices" icon={Receipt} title="الفواتير" />
            <SidebarItem to="/commercial/payments" icon={Wallet} title="المدفوعات" />
            <SidebarItem to="/commercial/profits" icon={TrendingUp} title="الأرباح" />
            <SidebarItem to="/commercial/returns" icon={ArrowUpDown} title="المرتجعات" />
            <SidebarItem to="/commercial/statements" icon={ClipboardList} title="كشوف الحسابات" />
            <SidebarItem to="/commercial/purchase-orders" icon={Truck} title="أوامر الشراء" />
          </SidebarGroup>

          <SidebarGroup title="الإدارة المالية" icon={DollarSign} defaultOpen={false} id="financial" color="destructive">
            <SidebarItem to="/financial" icon={LayoutDashboard} title="لوحة التحكم المالية" />
            <SidebarItem to="/financial/transactions/new" icon={CreditCard} title="معاملة جديدة" />
            <SidebarItem to="/financial/categories" icon={Tags} title="فئات المعاملات" />
          </SidebarGroup>

          <SidebarGroup title="التحليلات" icon={BarChart3} defaultOpen={false} id="analytics">
            <SidebarItem to="/analytics" icon={PieChart} title="التقارير والإحصائيات" />
          </SidebarGroup>

          <div className="pt-4 mt-4 border-t border-border">
            <SidebarItem to="/settings" icon={Settings} title="الإعدادات" />
          </div>
        </div>
        
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full h-8 w-8 shadow-md"
                    onClick={toggleSidebar}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  توسيع القائمة
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        )}
      </motion.aside>
    </>
  );
};

export default ModernSidebar;
