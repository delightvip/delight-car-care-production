
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const routeMap: Record<string, { label: string; parent?: string }> = {
  '/': { label: 'لوحة التحكم' },
  '/analytics': { label: 'التحليلات', parent: '/' },
  '/inventory/raw-materials': { label: 'المواد الأولية', parent: '/' },
  '/inventory/semi-finished': { label: 'المنتجات النصف مصنعة', parent: '/' },
  '/inventory/packaging': { label: 'مستلزمات التعبئة', parent: '/' },
  '/inventory/finished-products': { label: 'المنتجات النهائية', parent: '/' },
  '/inventory/low-stock': { label: 'المخزون المنخفض', parent: '/' },
  '/inventory/tracking': { label: 'تتبع المخزون', parent: '/' },
  '/production/orders': { label: 'أوامر الإنتاج', parent: '/' },
  '/production/packaging': { label: 'أوامر التعبئة', parent: '/' },
  '/production/planning': { label: 'تخطيط الإنتاج', parent: '/' },
};

const Breadcrumbs = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Get breadcrumb data for current path
  const currentRoute = routeMap[currentPath];
  
  if (!currentRoute) return null;
  
  // Get parent route if it exists
  const parentRoute = currentRoute.parent ? routeMap[currentRoute.parent] : null;
  
  // If we're on the home page, don't show breadcrumbs  if (currentPath === '/') return null;
  
  return (
    <div className="mb-4 md:mb-6 flex flex-col xs:flex-row gap-2 xs:items-center xs:justify-between">
      <div className="flex flex-wrap items-center gap-1 md:gap-2 space-x-1 space-x-reverse rtl:space-x-reverse">
        <Button variant="ghost" size="sm" className="h-7 md:h-9 px-2 text-xs md:text-sm" asChild>
          <Link to="/">
            <Home className="h-3.5 w-3.5 md:h-4 md:w-4 ml-1" />
            <span>الرئيسية</span>
          </Link>
        </Button>
        
        {parentRoute && currentRoute.parent !== '/' && (
          <>
            <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
            <Button variant="ghost" size="sm" className="h-7 md:h-9 px-2 text-xs md:text-sm" asChild>
              <Link to={currentRoute.parent}>{parentRoute.label}</Link>
            </Button>
          </>
        )}
        
        <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
        <span className="text-xs md:text-sm font-medium">{currentRoute.label}</span>
      </div>
      
      {/* Context-aware navigation buttons */}
      <div className="flex space-x-2 space-x-reverse rtl:space-x-reverse">
        {currentPath.includes('/inventory') && !currentPath.includes('/low-stock') && (
          <Button size="sm" variant="outline" asChild>
            <Link to="/inventory/low-stock">عرض المخزون المنخفض</Link>
          </Button>
        )}
        
        {currentPath.includes('/production') && (
          <Button size="sm" variant="outline" asChild>
            <Link to="/inventory/raw-materials">عرض المواد الأولية</Link>
          </Button>
        )}
        
        {(currentPath === '/inventory/raw-materials' || currentPath === '/inventory/semi-finished') && (
          <Button size="sm" variant="outline" asChild>
            <Link to="/production/orders">إنشاء أمر إنتاج</Link>
          </Button>
        )}
        
        {(currentPath === '/inventory/packaging' || currentPath === '/inventory/semi-finished') && (
          <Button size="sm" variant="outline" asChild>
            <Link to="/production/packaging">إنشاء أمر تعبئة</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default Breadcrumbs;
