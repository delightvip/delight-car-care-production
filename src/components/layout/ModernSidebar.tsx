
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

const ModernSidebar = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const [notifications, setNotifications] = useState(5);
  const [animateIcons, setAnimateIcons] = useState(false);
  
  // Trigger animation when route changes
  useEffect(() => {
    setAnimateIcons(true);
    const timer = setTimeout(() => setAnimateIcons(false), 500);
    return () => clearTimeout(timer);
  }, [pathname]);
  
  return (
    <Sidebar className="fixed top-0 pt-16 h-full border-r border-border">
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
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground tracking-wider">
            الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <motion.div 
                  animate={animateIcons && pathname === '/' ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/'}
                    tooltip="لوحة التحكم"
                    className="transition-all duration-200 hover:bg-primary/10"
                  >
                    <Link to="/">
                      <LayoutDashboard size={18} />
                      <span>لوحة التحكم</span>
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <motion.div 
                  animate={animateIcons && pathname === '/analytics' ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/analytics'}
                    tooltip="التحليلات والإحصائيات"
                    className="transition-all duration-200 hover:bg-primary/10"
                  >
                    <Link to="/analytics">
                      <BarChart4 size={18} />
                      <span>التحليلات والإحصائيات</span>
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground tracking-wider">
            المخزون
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <motion.div 
                  animate={animateIcons && pathname === '/inventory/raw-materials' ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/inventory/raw-materials'}
                    tooltip="المواد الأولية"
                    className="transition-all duration-200 hover:bg-primary/10"
                  >
                    <Link to="/inventory/raw-materials">
                      <Package size={18} />
                      <span>المواد الأولية</span>
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <motion.div 
                  animate={animateIcons && pathname === '/inventory/semi-finished' ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/inventory/semi-finished'}
                    tooltip="المنتجات النصف مصنعة"
                    className="transition-all duration-200 hover:bg-primary/10"
                  >
                    <Link to="/inventory/semi-finished">
                      <Beaker size={18} />
                      <span>المنتجات النصف مصنعة</span>
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <motion.div 
                  animate={animateIcons && pathname === '/inventory/packaging' ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/inventory/packaging'}
                    tooltip="مستلزمات التعبئة"
                    className="transition-all duration-200 hover:bg-primary/10"
                  >
                    <Link to="/inventory/packaging">
                      <Box size={18} />
                      <span>مستلزمات التعبئة</span>
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <motion.div 
                  animate={animateIcons && pathname === '/inventory/finished-products' ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/inventory/finished-products'}
                    tooltip="المنتجات النهائية"
                    className="transition-all duration-200 hover:bg-primary/10"
                  >
                    <Link to="/inventory/finished-products">
                      <ShoppingBag size={18} />
                      <span>المنتجات النهائية</span>
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <motion.div 
                  animate={animateIcons && pathname === '/inventory/low-stock' ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/inventory/low-stock'}
                    tooltip="المخزون المنخفض"
                    className="transition-all duration-200 hover:bg-primary/10"
                  >
                    <Link to="/inventory/low-stock">
                      <div className="relative">
                        <AlertTriangle size={18} />
                        {notifications > 0 && (
                          <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                            {notifications}
                          </Badge>
                        )}
                      </div>
                      <span>المخزون المنخفض</span>
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <motion.div 
                  animate={animateIcons && pathname === '/inventory/tracking' ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/inventory/tracking'}
                    tooltip="تتبع المخزون"
                    className="transition-all duration-200 hover:bg-primary/10"
                  >
                    <Link to="/inventory/tracking">
                      <ListChecks size={18} />
                      <span>تتبع المخزون</span>
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground tracking-wider">
            الإنتاج
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <motion.div 
                  animate={animateIcons && pathname === '/production/orders' ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/production/orders'}
                    tooltip="أوامر الإنتاج"
                    className="transition-all duration-200 hover:bg-primary/10"
                  >
                    <Link to="/production/orders">
                      <Factory size={18} />
                      <span>أوامر الإنتاج</span>
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <motion.div 
                  animate={animateIcons && pathname === '/production/packaging' ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/production/packaging'}
                    tooltip="أوامر التعبئة"
                    className="transition-all duration-200 hover:bg-primary/10"
                  >
                    <Link to="/production/packaging">
                      <Layers size={18} />
                      <span>أوامر التعبئة</span>
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <motion.div 
                  animate={animateIcons && pathname === '/production/planning' ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/production/planning'}
                    tooltip="تخطيط الإنتاج"
                    className="transition-all duration-200 hover:bg-primary/10"
                  >
                    <Link to="/production/planning">
                      <TrendingUp size={18} />
                      <span>تخطيط الإنتاج</span>
                    </Link>
                  </SidebarMenuButton>
                </motion.div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
