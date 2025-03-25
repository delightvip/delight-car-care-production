
import React from 'react';
import { Link } from 'react-router-dom';
import { ModeToggle } from '@/components/mode-toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Settings, BellRing, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const Navbar = () => {
  // استعلام الحصول على عناصر المخزون المنخفض
  const { data: lowStockCount } = useQuery({
    queryKey: ['navbarLowStockCount'],
    queryFn: async () => {
      try {
        // فحص المواد الأولية ذات المخزون المنخفض
        const rawMaterialsResponse = await supabase
          .from('raw_materials')
          .select('id')
          .lt('quantity', 10);
        
        // فحص المنتجات نصف المصنعة ذات المخزون المنخفض
        const semiFinishedResponse = await supabase
          .from('semi_finished_products')
          .select('id')
          .lt('quantity', 10);
        
        // فحص مستلزمات التعبئة ذات المخزون المنخفض
        const packagingResponse = await supabase
          .from('packaging_materials')
          .select('id')
          .lt('quantity', 10);
        
        // فحص المنتجات النهائية ذات المخزون المنخفض
        const finishedResponse = await supabase
          .from('finished_products')
          .select('id')
          .lt('quantity', 10);
        
        // حساب إجمالي العناصر ذات المخزون المنخفض
        const rawMaterialsCount = rawMaterialsResponse.data?.length || 0;
        const semiFinishedCount = semiFinishedResponse.data?.length || 0;
        const packagingCount = packagingResponse.data?.length || 0;
        const finishedCount = finishedResponse.data?.length || 0;
        
        const totalCount = 
          rawMaterialsCount + 
          semiFinishedCount + 
          packagingCount + 
          finishedCount;
        
        return {
          totalCount,
          counts: {
            rawMaterials: rawMaterialsCount,
            semiFinished: semiFinishedCount,
            packaging: packagingCount,
            finished: finishedCount
          }
        };
      } catch (error) {
        console.error("خطأ في جلب عناصر المخزون المنخفض:", error);
        throw error;
      }
    },
    refetchInterval: 60000, // التحقق كل دقيقة
  });

  const totalLowStock = lowStockCount?.totalCount || 0;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-20 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <Link to="/" className="text-xl font-bold">
          <span className="text-primary">ديلايت</span>
          <span className="text-muted-foreground">مصنع</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <BellRing className="h-5 w-5" />
              {totalLowStock > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs">
                  {totalLowStock}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {totalLowStock > 0 ? (
              <>
                <DropdownMenuItem className="flex flex-col items-start">
                  <div className="font-semibold flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span>تنبيه المخزون المنخفض</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    يوجد {totalLowStock} عنصر منخفض في المخزون يحتاج إلى تجديد
                  </p>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {lowStockCount?.counts.rawMaterials > 0 && (
                  <DropdownMenuItem>
                    <div className="flex justify-between w-full">
                      <span>المواد الأولية</span>
                      <Badge variant="destructive">{lowStockCount.counts.rawMaterials}</Badge>
                    </div>
                  </DropdownMenuItem>
                )}
                {lowStockCount?.counts.semiFinished > 0 && (
                  <DropdownMenuItem>
                    <div className="flex justify-between w-full">
                      <span>منتجات نصف مصنعة</span>
                      <Badge variant="destructive">{lowStockCount.counts.semiFinished}</Badge>
                    </div>
                  </DropdownMenuItem>
                )}
                {lowStockCount?.counts.packaging > 0 && (
                  <DropdownMenuItem>
                    <div className="flex justify-between w-full">
                      <span>مستلزمات التعبئة</span>
                      <Badge variant="destructive">{lowStockCount.counts.packaging}</Badge>
                    </div>
                  </DropdownMenuItem>
                )}
                {lowStockCount?.counts.finished > 0 && (
                  <DropdownMenuItem>
                    <div className="flex justify-between w-full">
                      <span>المنتجات النهائية</span>
                      <Badge variant="destructive">{lowStockCount.counts.finished}</Badge>
                    </div>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/inventory/low-stock" className="cursor-pointer flex justify-center text-primary font-semibold">
                    عرض كل المخزون المنخفض
                  </Link>
                </DropdownMenuItem>
              </>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                لا توجد إشعارات جديدة
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
        <Separator orientation="vertical" className="h-8" />
        <ModeToggle />
      </div>
    </header>
  );
};

export default Navbar;
