
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Package,
  Beaker,
  Box,
  ShoppingBag,
  AlertTriangle,
  Factory,
  Layers,
  BarChart4,
  ListChecks,
  Settings,
  Users,
  TrendingUp,
  LogOut,
  Bell,
  LayoutDashboard
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSidebar } from '@/components/layout/SidebarContext';

// مكون عنصر القائمة الجانبية
const SidebarNavItem = ({ 
  to, 
  icon: Icon, 
  label, 
  active, 
  badge, 
  animateIcons 
}: { 
  to: string; 
  icon: React.ElementType; 
  label: string; 
  active: boolean; 
  badge?: number;
  animateIcons: boolean;
}) => {
  return (
    <li className={`flex mt-0.5 ${active ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'} rounded-lg`}>
      <motion.div 
        animate={animateIcons && active ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Link to={to} className="flex items-center px-4 py-2.5 text-sm gap-3 w-full">
          <div className="relative">
            <Icon size={18} />
            {badge && badge > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {badge}
              </Badge>
            )}
          </div>
          <span>{label}</span>
        </Link>
      </motion.div>
    </li>
  );
};

// مكون المجموعة في القائمة الجانبية
const SidebarGroup = ({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode;
}) => {
  return (
    <div className="mb-6">
      <h3 className="px-4 text-xs font-semibold text-muted-foreground tracking-wider mb-2">
        {title}
      </h3>
      <ul>
        {children}
      </ul>
    </div>
  );
};

const ModernSidebar = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const [animateIcons, setAnimateIcons] = useState(false);
  const isMobile = useIsMobile();
  const { isOpen } = useSidebar();
  
  const { data: lowStockItems } = useQuery({
    queryKey: ['lowStockCount'],
    queryFn: async () => {
      try {
        // جلب البيانات منخفضة المخزون من قاعدة البيانات
        const rawMaterialsResponse = await supabase
          .from('raw_materials')
          .select('id')
          .lt('quantity', 10);
        
        const semiFinishedResponse = await supabase
          .from('semi_finished_products')
          .select('id')
          .lt('quantity', 10);
        
        const packagingResponse = await supabase
          .from('packaging_materials')
          .select('id')
          .lt('quantity', 10);
        
        const finishedResponse = await supabase
          .from('finished_products')
          .select('id')
          .lt('quantity', 10);
        
        const totalCount = 
          (rawMaterialsResponse.data?.length || 0) + 
          (semiFinishedResponse.data?.length || 0) + 
          (packagingResponse.data?.length || 0) + 
          (finishedResponse.data?.length || 0);
        
        return totalCount;
      } catch (error) {
        console.error("Error fetching low stock count:", error);
        return 0;
      }
    },
    refetchInterval: 60000,
  });
  
  useEffect(() => {
    setAnimateIcons(true);
    const timer = setTimeout(() => setAnimateIcons(false), 500);
    return () => clearTimeout(timer);
  }, [pathname]);
  
  if (!isOpen) {
    return null;
  }
  
  const sidebarContent = (
    <>
      <div className="p-4">
        <div className="relative w-full h-16 overflow-hidden rounded-lg mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/10 backdrop-blur-sm"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent drop-shadow-sm">
              DELIGHT
            </span>
          </div>
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="px-3">
          <SidebarGroup title="الرئيسية">
            <SidebarNavItem 
              to="/" 
              icon={LayoutDashboard} 
              label="لوحة التحكم" 
              active={pathname === '/'} 
              animateIcons={animateIcons} 
            />
            <SidebarNavItem 
              to="/analytics" 
              icon={BarChart4} 
              label="التحليلات والإحصائيات" 
              active={pathname === '/analytics'} 
              animateIcons={animateIcons} 
            />
          </SidebarGroup>
          
          <SidebarGroup title="المخزون">
            <SidebarNavItem 
              to="/inventory/raw-materials" 
              icon={Package} 
              label="المواد الأولية" 
              active={pathname === '/inventory/raw-materials'} 
              animateIcons={animateIcons} 
            />
            <SidebarNavItem 
              to="/inventory/semi-finished" 
              icon={Beaker} 
              label="المنتجات النصف مصنعة" 
              active={pathname === '/inventory/semi-finished'} 
              animateIcons={animateIcons} 
            />
            <SidebarNavItem 
              to="/inventory/packaging" 
              icon={Box} 
              label="مستلزمات التعبئة" 
              active={pathname === '/inventory/packaging'} 
              animateIcons={animateIcons} 
            />
            <SidebarNavItem 
              to="/inventory/finished-products" 
              icon={ShoppingBag} 
              label="المنتجات النهائية" 
              active={pathname === '/inventory/finished-products'} 
              animateIcons={animateIcons} 
            />
            <SidebarNavItem 
              to="/inventory/low-stock" 
              icon={AlertTriangle} 
              label="المخزون المنخفض" 
              active={pathname === '/inventory/low-stock'} 
              animateIcons={animateIcons}
              badge={lowStockItems || 0}
            />
            <SidebarNavItem 
              to="/inventory/tracking" 
              icon={ListChecks} 
              label="تتبع المخزون" 
              active={pathname === '/inventory/tracking'} 
              animateIcons={animateIcons} 
            />
          </SidebarGroup>
          
          <SidebarGroup title="الإنتاج">
            <SidebarNavItem 
              to="/production/orders" 
              icon={Factory} 
              label="أوامر الإنتاج" 
              active={pathname === '/production/orders'} 
              animateIcons={animateIcons} 
            />
            <SidebarNavItem 
              to="/production/packaging" 
              icon={Layers} 
              label="أوامر التعبئة" 
              active={pathname === '/production/packaging'} 
              animateIcons={animateIcons} 
            />
            <SidebarNavItem 
              to="/production/planning" 
              icon={TrendingUp} 
              label="تخطيط الإنتاج" 
              active={pathname === '/production/planning'} 
              animateIcons={animateIcons} 
            />
          </SidebarGroup>
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t mt-auto">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-9 w-9 ring-2 ring-primary/30">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground">أح</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">أحمد محمد</span>
            <span className="text-xs text-muted-foreground">مدير النظام</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="w-full">
                <Bell size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>الإشعارات</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="w-full">
                <Settings size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>الإعدادات</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="w-full">
                <LogOut size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>تسجيل الخروج</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  );
  
  if (isMobile) {
    return (
      <div className="fixed top-16 right-0 z-50 w-64 h-[calc(100vh-4rem)] border-l bg-background shadow-lg transform transition-transform duration-300">
        {sidebarContent}
      </div>
    );
  }
  
  return (
    <div className="fixed top-16 right-0 z-40 w-64 h-[calc(100vh-4rem)] border-l bg-background">
      {sidebarContent}
    </div>
  );
};

export default ModernSidebar;
