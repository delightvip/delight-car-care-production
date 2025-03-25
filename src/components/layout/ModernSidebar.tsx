
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar
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
} from 'lucide-react';

const ModernSidebar = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const { state } = useSidebar();
  
  return (
    <Sidebar side="right" variant="sidebar" className="shadow-lg bg-gradient-to-b from-background to-background/90 border-r-0 border-l">
      <SidebarContent className="pt-16">
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-bold">الرئيسية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/'} className="hover:bg-primary/5">
                  <Link to="/">
                    <LayoutDashboard className="h-5 w-5" />
                    <span>لوحة التحكم</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/analytics'} className="hover:bg-primary/5">
                  <Link to="/analytics">
                    <BarChart4 className="h-5 w-5" />
                    <span>التحليلات والإحصائيات</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-bold">المخزون</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/inventory/raw-materials'} className="hover:bg-primary/5">
                  <Link to="/inventory/raw-materials">
                    <Package className="h-5 w-5" />
                    <span>المواد الأولية</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/inventory/semi-finished'} className="hover:bg-primary/5">
                  <Link to="/inventory/semi-finished">
                    <Beaker className="h-5 w-5" />
                    <span>المنتجات النصف مصنعة</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/inventory/packaging'} className="hover:bg-primary/5">
                  <Link to="/inventory/packaging">
                    <Box className="h-5 w-5" />
                    <span>مستلزمات التعبئة</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/inventory/finished-products'} className="hover:bg-primary/5">
                  <Link to="/inventory/finished-products">
                    <ShoppingBag className="h-5 w-5" />
                    <span>المنتجات النهائية</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/inventory/low-stock'} className="hover:bg-primary/5">
                  <Link to="/inventory/low-stock">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span>المخزون المنخفض</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/inventory/tracking'} className="hover:bg-primary/5">
                  <Link to="/inventory/tracking">
                    <ListChecks className="h-5 w-5" />
                    <span>تتبع المخزون</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-bold">الإنتاج</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/production/orders'} className="hover:bg-primary/5">
                  <Link to="/production/orders">
                    <Factory className="h-5 w-5" />
                    <span>أوامر الإنتاج</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/production/packaging'} className="hover:bg-primary/5">
                  <Link to="/production/packaging">
                    <Layers className="h-5 w-5" />
                    <span>أوامر التعبئة</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/production/planning'} className="hover:bg-primary/5">
                  <Link to="/production/planning">
                    <TrendingUp className="h-5 w-5" />
                    <span>تخطيط الإنتاج</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-bold">الإدارة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/settings/users'} className="hover:bg-primary/5">
                  <Link to="/settings/users">
                    <Users className="h-5 w-5" />
                    <span>إدارة المستخدمين</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/settings/system'} className="hover:bg-primary/5">
                  <Link to="/settings/system">
                    <Settings className="h-5 w-5" />
                    <span>إعدادات النظام</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default ModernSidebar;
