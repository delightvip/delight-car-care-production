
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart4,
  Package,
  Layers,
  Box,
  ShoppingBag,
  AlertTriangle,
  ListChecks,
  FileSpreadsheet,
  Boxes,
  Tags,
  Settings,
  PieChart,
  Calculator
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSidebar } from '@/components/layout/SidebarContext';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import ImportanceCalculationService from '@/services/ImportanceCalculationService';

interface MenuItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  badge?: number;
  badgeVariant?: 'default' | 'destructive' | 'success';
}

const MenuItem: React.FC<MenuItemProps> = ({ to, icon, label, isActive, badge, badgeVariant = 'default' }) => (
  <Link
    to={to}
    className={cn(
      'flex items-center py-2.5 px-4 gap-3 rounded-md transition-colors group hover:bg-muted',
      isActive && 'bg-primary/10 text-primary font-medium'
    )}
  >
    <div className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')}>
      {icon}
    </div>
    <span className="flex-1 text-sm">{label}</span>
    {typeof badge === 'number' && badge > 0 && (
      <Badge variant={badgeVariant} className="ml-auto">
        {badge}
      </Badge>
    )}
  </Link>
);

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <motion.div 
    className="space-y-1.5"
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="px-4 py-2">
      <h2 className="text-xs font-semibold text-muted-foreground tracking-tight">{title}</h2>
    </div>
    {children}
  </motion.div>
);

const ModernSidebar = () => {
  const location = useLocation();
  const { openMobile, setOpenMobile, isOpen } = useSidebar();
  const { lowStockItems } = useNotifications();
  
  const totalLowStock = lowStockItems?.totalCount || 0;
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const handleRecalculateImportance = async () => {
    const service = ImportanceCalculationService.getInstance();
    await service.recalculateAllImportance();
  };
  
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <motion.div 
        className="p-4" 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-lg font-bold text-primary">نظام إدارة المصنع</h2>
        <p className="text-sm text-muted-foreground">مرحباً بك في نظام ديلايت</p>
      </motion.div>
      <Separator />
      <ScrollArea className="flex-1 py-4">
        <div className="space-y-6 px-2">
          <Section title="الرئيسية">
            <MenuItem 
              to="/" 
              icon={<LayoutDashboard />} 
              label="لوحة التحكم" 
              isActive={isActive('/')} 
            />
            <MenuItem 
              to="/analytics" 
              icon={<BarChart4 />} 
              label="التحليلات" 
              isActive={isActive('/analytics')} 
            />
          </Section>
          
          <Section title="المخزون">
            <MenuItem 
              to="/inventory/raw-materials" 
              icon={<Package />} 
              label="المواد الأولية" 
              isActive={isActive('/inventory/raw-materials')} 
              badge={lowStockItems?.counts?.rawMaterials || 0}
              badgeVariant="destructive"
            />
            <MenuItem 
              to="/inventory/semi-finished" 
              icon={<Layers />} 
              label="المنتجات النصف مصنعة" 
              isActive={isActive('/inventory/semi-finished')} 
              badge={lowStockItems?.counts?.semiFinished || 0}
              badgeVariant="destructive"
            />
            <MenuItem 
              to="/inventory/packaging" 
              icon={<Box />} 
              label="مستلزمات التعبئة" 
              isActive={isActive('/inventory/packaging')} 
              badge={lowStockItems?.counts?.packaging || 0}
              badgeVariant="destructive"
            />
            <MenuItem 
              to="/inventory/finished-products" 
              icon={<ShoppingBag />} 
              label="المنتجات النهائية" 
              isActive={isActive('/inventory/finished-products')} 
              badge={lowStockItems?.counts?.finished || 0}
              badgeVariant="destructive"
            />
            <MenuItem 
              to="/inventory/low-stock" 
              icon={<AlertTriangle />} 
              label="المخزون المنخفض" 
              isActive={isActive('/inventory/low-stock')} 
              badge={totalLowStock}
              badgeVariant="destructive"
            />
            <MenuItem 
              to="/inventory/tracking" 
              icon={<ListChecks />} 
              label="تتبع المخزون" 
              isActive={isActive('/inventory/tracking')} 
            />
          </Section>
          
          <Section title="الإنتاج">
            <MenuItem 
              to="/production/orders" 
              icon={<FileSpreadsheet />} 
              label="أوامر الإنتاج" 
              isActive={isActive('/production/orders')} 
            />
            <MenuItem 
              to="/production/packaging" 
              icon={<Boxes />} 
              label="أوامر التعبئة" 
              isActive={isActive('/production/packaging')} 
            />
            <MenuItem 
              to="/production/planning" 
              icon={<Tags />} 
              label="تخطيط الإنتاج" 
              isActive={isActive('/production/planning')} 
            />
          </Section>
          
          <Section title="التحليل">
            <MenuItem 
              to="/analytics/distribution" 
              icon={<PieChart />} 
              label="توزيع المخزون" 
              isActive={isActive('/analytics/distribution')} 
            />
          </Section>
          
          <Section title="الإعدادات">
            <MenuItem 
              to="/settings" 
              icon={<Settings />} 
              label="إعدادات النظام" 
              isActive={isActive('/settings')} 
            />
            <div className="px-4 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRecalculateImportance}
                className="w-full flex items-center justify-center gap-2 text-xs transition-all hover:bg-primary/10"
              >
                <Calculator className="h-3.5 w-3.5" />
                إعادة حساب الأهمية
              </Button>
            </div>
          </Section>
        </div>
      </ScrollArea>
    </div>
  );

  if (useIsMobile().isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="right" className="p-0 w-72 bg-background">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className={cn(
      "fixed top-0 right-0 h-full w-64 bg-background border-l shadow-sm transition-all z-10",
      !isOpen && "translate-x-full"
    )}>
      <div className="pt-16 h-full">
        {sidebarContent}
      </div>
    </div>
  );
};

const useIsMobile = () => {
  const { isMobile } = useSidebar();
  return { isMobile };
};

export default ModernSidebar;
