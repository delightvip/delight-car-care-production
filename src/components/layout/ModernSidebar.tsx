
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
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
  Bell
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

// Move sidebar menu item definition to a separate component
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
    <SidebarMenuItem>
      <motion.div 
        animate={animateIcons && active ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <SidebarMenuButton 
          asChild 
          isActive={active}
          tooltip={label}
          className="transition-all duration-200 hover:bg-primary/10"
        >
          <Link to={to}>
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
        </SidebarMenuButton>
      </motion.div>
    </SidebarMenuItem>
  );
};

const ModernSidebar = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const [animateIcons, setAnimateIcons] = useState(false);
  const isMobile = useIsMobile();
  
  // Fetch low stock items count
  const { data: lowStockItems } = useQuery({
    queryKey: ['lowStockCount'],
    queryFn: async () => {
      const rawMaterialsResponse = await supabase
        .from('raw_materials')
        .select('id, quantity, min_stock')
        .lt('quantity', 'min_stock');
      
      const semiFinishedResponse = await supabase
        .from('semi_finished_products')
        .select('id, quantity, min_stock')
        .lt('quantity', 'min_stock');
      
      const packagingResponse = await supabase
        .from('packaging_materials')
        .select('id, quantity, min_stock')
        .lt('quantity', 'min_stock');
      
      const finishedResponse = await supabase
        .from('finished_products')
        .select('id, quantity, min_stock')
        .lt('quantity', 'min_stock');
      
      const totalCount = 
        (rawMaterialsResponse.data?.length || 0) + 
        (semiFinishedResponse.data?.length || 0) + 
        (packagingResponse.data?.length || 0) + 
        (finishedResponse.data?.length || 0);
      
      return totalCount;
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Trigger animation when route changes
  useEffect(() => {
    setAnimateIcons(true);
    const timer = setTimeout(() => setAnimateIcons(false), 500);
    return () => clearTimeout(timer);
  }, [pathname]);
  
  if (isMobile) {
    return (
      <Sidebar className="fixed top-0 pt-16 h-full border-r border-border" side="right">
        <SidebarHeader className="px-3 py-2">
          <div className="relative w-full h-20 overflow-hidden rounded-lg mb-2">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/10 backdrop-blur-sm"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent drop-shadow-sm">
                DELIGHT
              </span>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <ScrollArea className="h-[calc(100vh-240px)]">
            <SidebarMenu>
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
                label="التحليلات" 
                active={pathname === '/analytics'} 
                animateIcons={animateIcons} 
              />
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
                label="النصف مصنعة" 
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
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        
        <SidebarFooter>
          <div className="p-3 border-t">
            <div className="flex items-center justify-between gap-2">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground">أح</AvatarFallback>
              </Avatar>
              
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Bell size={14} />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Settings size={14} />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <LogOut size={14} />
                </Button>
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
    );
  }
  
  return (
    <Sidebar className="fixed top-0 pt-16 h-full border-r border-border" side="right">
      <SidebarHeader className="px-3 py-2">
        <div className="relative w-full h-24 overflow-hidden rounded-lg mb-2">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/10 backdrop-blur-sm"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent drop-shadow-sm">
              DELIGHT
            </span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarRail />
      
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-300px)]">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground tracking-wider">
              الرئيسية
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground tracking-wider">
              المخزون
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground tracking-wider">
              الإنتاج
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
      
      <SidebarFooter>
        <div className="p-3 border-t">
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
      </SidebarFooter>
    </Sidebar>
  );
};

export default ModernSidebar;
