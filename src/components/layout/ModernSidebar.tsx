
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
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
  Menu
} from 'lucide-react';

const ModernSidebar = () => {
  const location = useLocation();
  const pathname = location.pathname;
  
  return (
    <>
      <Sidebar>
        <SidebarContent className="pt-16">
          <SidebarGroup>
            <SidebarGroupLabel>الرئيسية</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/'}>
                    <Link to="/">
                      <LayoutDashboard className="h-5 w-5" />
                      <span>لوحة التحكم</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/analytics'}>
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
            <SidebarGroupLabel>المخزون</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/inventory/raw-materials'}>
                    <Link to="/inventory/raw-materials">
                      <Package className="h-5 w-5" />
                      <span>المواد الأولية</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/inventory/semi-finished'}>
                    <Link to="/inventory/semi-finished">
                      <Beaker className="h-5 w-5" />
                      <span>المنتجات النصف مصنعة</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/inventory/packaging'}>
                    <Link to="/inventory/packaging">
                      <Box className="h-5 w-5" />
                      <span>مستلزمات التعبئة</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/inventory/finished-products'}>
                    <Link to="/inventory/finished-products">
                      <ShoppingBag className="h-5 w-5" />
                      <span>المنتجات النهائية</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/inventory/low-stock'}>
                    <Link to="/inventory/low-stock">
                      <AlertTriangle className="h-5 w-5" />
                      <span>المخزون المنخفض</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/inventory/tracking'}>
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
            <SidebarGroupLabel>الإنتاج</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/production/orders'}>
                    <Link to="/production/orders">
                      <Factory className="h-5 w-5" />
                      <span>أوامر الإنتاج</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/production/packaging'}>
                    <Link to="/production/packaging">
                      <Layers className="h-5 w-5" />
                      <span>أوامر التعبئة</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/production/planning'}>
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
            <SidebarGroupLabel>الإدارة</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/settings/users'}>
                    <Link to="/settings/users">
                      <Users className="h-5 w-5" />
                      <span>إدارة المستخدمين</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/settings/system'}>
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
      
      {/* Mobile trigger button */}
      <div className="fixed bottom-4 left-4 md:hidden z-50">
        <SidebarTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="rounded-full shadow-lg"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SidebarTrigger>
      </div>
    </>
  );
};

export default ModernSidebar;
