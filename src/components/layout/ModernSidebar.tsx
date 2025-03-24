
import React, { useState } from 'react';
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
  TrendingUp
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

const ModernSidebar = () => {
  const location = useLocation();
  const pathname = location.pathname;
  
  return (
    <Sidebar className="fixed top-0 pt-16 h-full border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>الرئيسية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/'}
                  tooltip="لوحة التحكم"
                >
                  <Link to="/">
                    <LayoutDashboard size={18} />
                    <span>لوحة التحكم</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/analytics'}
                  tooltip="التحليلات والإحصائيات"
                >
                  <Link to="/analytics">
                    <BarChart4 size={18} />
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
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/inventory/raw-materials'}
                  tooltip="المواد الأولية"
                >
                  <Link to="/inventory/raw-materials">
                    <Package size={18} />
                    <span>المواد الأولية</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/inventory/semi-finished'}
                  tooltip="المنتجات النصف مصنعة"
                >
                  <Link to="/inventory/semi-finished">
                    <Beaker size={18} />
                    <span>المنتجات النصف مصنعة</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/inventory/packaging'}
                  tooltip="مستلزمات التعبئة"
                >
                  <Link to="/inventory/packaging">
                    <Box size={18} />
                    <span>مستلزمات التعبئة</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/inventory/finished-products'}
                  tooltip="المنتجات النهائية"
                >
                  <Link to="/inventory/finished-products">
                    <ShoppingBag size={18} />
                    <span>المنتجات النهائية</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/inventory/low-stock'}
                  tooltip="المخزون المنخفض"
                >
                  <Link to="/inventory/low-stock">
                    <AlertTriangle size={18} />
                    <span>المخزون المنخفض</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/inventory/tracking'}
                  tooltip="تتبع المخزون"
                >
                  <Link to="/inventory/tracking">
                    <ListChecks size={18} />
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
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/production/orders'}
                  tooltip="أوامر الإنتاج"
                >
                  <Link to="/production/orders">
                    <Factory size={18} />
                    <span>أوامر الإنتاج</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/production/packaging'}
                  tooltip="أوامر التعبئة"
                >
                  <Link to="/production/packaging">
                    <Layers size={18} />
                    <span>أوامر التعبئة</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/production/planning'}
                  tooltip="تخطيط الإنتاج"
                >
                  <Link to="/production/planning">
                    <TrendingUp size={18} />
                    <span>تخطيط الإنتاج</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-3 border-t">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-primary-foreground">إد</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">أحمد محمد</span>
              <span className="text-xs text-muted-foreground">مدير النظام</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default ModernSidebar;
