import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Package, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import DetailModal from './DetailModal';

interface InventoryValueSummary {
  raw_materials: number;
  semi_finished: number;
  packaging: number;
  finished: number;
  total: number;
}

interface InventoryCountSummary {
  raw_materials: number;
  semi_finished: number;
  packaging: number;
  finished: number;
  total: number;
}

interface InventoryAlertSummary {
  low_stock: number;
  out_of_stock: number;
}

const InventoryDashboardSummary: React.FC = () => {
  // حالة لتتبع النافذة المنبثقة المفتوحة
  const [openModalType, setOpenModalType] = useState<'inventory-value' | 'average-value' | 'low-stock' | 'out-of-stock' | null>(null);
  // بيانات لتمريرها إلى النافذة المنبثقة
  const [selectedCardData, setSelectedCardData] = useState<any>(null);
  const { data: valueSummary, isLoading: isLoadingValue } = useQuery({
    queryKey: ['inventory-value-summary'],
    queryFn: async () => {
      try {
        // استعلام قيمة المخزون من جميع الجداول
        const [rawMaterials, semiFinished, packaging, finished] = await Promise.all([
          supabase
            .from('raw_materials')
            .select('quantity, unit_cost')
            .then(res => {
              if (res.error) throw res.error;
              return res.data || [];
            }),
            
          supabase
            .from('semi_finished_products')
            .select('quantity, unit_cost')
            .then(res => {
              if (res.error) throw res.error;
              return res.data || [];
            }),
            
          supabase
            .from('packaging_materials')
            .select('quantity, unit_cost')
            .then(res => {
              if (res.error) throw res.error;
              return res.data || [];
            }),
            
          supabase
            .from('finished_products')
            .select('quantity, unit_cost')
            .then(res => {
              if (res.error) throw res.error;
              return res.data || [];
            })
        ]);
        
        // حساب إجمالي القيمة لكل نوع
        const rawMaterialsValue = rawMaterials.reduce(
          (sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
        );
        
        const semiFinishedValue = semiFinished.reduce(
          (sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
        );
        
        const packagingValue = packaging.reduce(
          (sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
        );
        
        const finishedValue = finished.reduce(
          (sum, item) => sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
        );
        
        const totalValue = rawMaterialsValue + semiFinishedValue + packagingValue + finishedValue;
        
        return {
          raw_materials: rawMaterialsValue,
          semi_finished: semiFinishedValue,
          packaging: packagingValue,
          finished: finishedValue,
          total: totalValue
        };
      } catch (error) {
        console.error("Error fetching inventory value summary:", error);
        return {
          raw_materials: 0,
          semi_finished: 0,
          packaging: 0,
          finished: 0,
          total: 0
        };
      }
    },
    refetchInterval: 600000 // إعادة الاستعلام كل 10 دقائق
  });
  
  const { data: countSummary, isLoading: isLoadingCount } = useQuery({
    queryKey: ['inventory-count-summary'],
    queryFn: async () => {
      try {
        // استعلام عدد العناصر في كل جدول
        const [rawCount, semiCount, packagingCount, finishedCount] = await Promise.all([
          supabase.from('raw_materials').select('id', { count: 'exact', head: true }),
          supabase.from('semi_finished_products').select('id', { count: 'exact', head: true }),
          supabase.from('packaging_materials').select('id', { count: 'exact', head: true }),
          supabase.from('finished_products').select('id', { count: 'exact', head: true })
        ]);
        
        return {
          raw_materials: rawCount.count || 0,
          semi_finished: semiCount.count || 0,
          packaging: packagingCount.count || 0,
          finished: finishedCount.count || 0,
          total: (rawCount.count || 0) + (semiCount.count || 0) + (packagingCount.count || 0) + (finishedCount.count || 0)
        };
      } catch (error) {
        console.error("Error fetching inventory count summary:", error);
        return {
          raw_materials: 0,
          semi_finished: 0,
          packaging: 0,
          finished: 0,
          total: 0
        };
      }
    },
    refetchInterval: 600000
  });
    const { data: alertSummary, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['inventory-alert-summary'],
    queryFn: async () => {
      try {
        // استعلام الأصناف ذات المخزون المنخفض أو النافذ
        const [rawLow, semiLow, packagingLow, finishedLow] = await Promise.all([
          supabase.from('raw_materials').select('id, code, name, quantity, unit').lt('quantity', 10).gt('quantity', 0),
          supabase.from('semi_finished_products').select('id, code, name, quantity, unit').lt('quantity', 10).gt('quantity', 0),
          supabase.from('packaging_materials').select('id, code, name, quantity, unit').lt('quantity', 10).gt('quantity', 0),
          supabase.from('finished_products').select('id, code, name, quantity, unit').lt('quantity', 10).gt('quantity', 0)
        ]);
        
        const [rawOut, semiOut, packagingOut, finishedOut] = await Promise.all([
          supabase.from('raw_materials').select('id, code, name, quantity, unit').eq('quantity', 0),
          supabase.from('semi_finished_products').select('id, code, name, quantity, unit').eq('quantity', 0),
          supabase.from('packaging_materials').select('id, code, name, quantity, unit').eq('quantity', 0),
          supabase.from('finished_products').select('id, code, name, quantity, unit').eq('quantity', 0)
        ]);
        
        const lowStock = (rawLow.data?.length || 0) + 
                         (semiLow.data?.length || 0) + 
                         (packagingLow.data?.length || 0) + 
                         (finishedLow.data?.length || 0);
                         
        const outOfStock = (rawOut.data?.length || 0) + 
                           (semiOut.data?.length || 0) + 
                           (packagingOut.data?.length || 0) + 
                           (finishedOut.data?.length || 0);
        
        // تجميع البيانات التفصيلية للعناصر
        const lowStockItems = [
          ...(rawLow.data || []).map(item => ({ ...item, type: 'raw' })),
          ...(semiLow.data || []).map(item => ({ ...item, type: 'semi' })),
          ...(packagingLow.data || []).map(item => ({ ...item, type: 'packaging' })),
          ...(finishedLow.data || []).map(item => ({ ...item, type: 'finished' }))
        ];
        
        const outOfStockItems = [
          ...(rawOut.data || []).map(item => ({ ...item, type: 'raw', impact: 'high' })),
          ...(semiOut.data || []).map(item => ({ ...item, type: 'semi', impact: 'medium' })),
          ...(packagingOut.data || []).map(item => ({ ...item, type: 'packaging', impact: 'medium' })),
          ...(finishedOut.data || []).map(item => ({ ...item, type: 'finished', impact: 'low' }))
        ];
        
        return {
          low_stock: lowStock,
          out_of_stock: outOfStock,
          lowStockItems,
          outOfStockItems
        };
      } catch (error) {
        console.error("Error fetching inventory alerts:", error);
        return {
          low_stock: 0,
          out_of_stock: 0,
          lowStockItems: [],
          outOfStockItems: []
        };
      }
    },
    refetchInterval: 300000 // إعادة الاستعلام كل 5 دقائق
  });
  
  // وظائف التعامل مع النقر على البطاقات
  const handleCardClick = (type: 'inventory-value' | 'average-value' | 'low-stock' | 'out-of-stock') => {
    // تحضير البيانات المناسبة حسب نوع البطاقة
    let data = {};
    
    switch (type) {
      case 'inventory-value':
        data = {
          rawMaterialsValue: valueSummary?.raw_materials || 0,
          semiFinishedValue: valueSummary?.semi_finished || 0,
          packagingValue: valueSummary?.packaging || 0,
          finishedValue: valueSummary?.finished || 0,
          totalValue: valueSummary?.total || 0,
          rawMaterialsCount: countSummary?.raw_materials || 0,
          semiFinishedCount: countSummary?.semi_finished || 0,
          packagingCount: countSummary?.packaging || 0,
          finishedCount: countSummary?.finished || 0,
          totalCount: countSummary?.total || 0
        };
        break;
      case 'average-value':
        data = {
          rawMaterialsValue: valueSummary?.raw_materials || 0,
          semiFinishedValue: valueSummary?.semi_finished || 0,
          packagingValue: valueSummary?.packaging || 0,
          finishedValue: valueSummary?.finished || 0,
          totalValue: valueSummary?.total || 0,
          rawMaterialsCount: countSummary?.raw_materials || 0,
          semiFinishedCount: countSummary?.semi_finished || 0,
          packagingCount: countSummary?.packaging || 0,
          finishedCount: countSummary?.finished || 0,
          totalCount: countSummary?.total || 0
        };
        break;
      case 'low-stock':
        data = {
          items: alertSummary?.lowStockItems || []
        };
        break;
      case 'out-of-stock':
        data = {
          items: alertSummary?.outOfStockItems || []
        };
        break;
    }
    
    // تحديث الحالة لفتح النافذة المنبثقة
    setSelectedCardData(data);
    setOpenModalType(type);
  };
  
  // إغلاق النافذة المنبثقة
  const handleCloseModal = () => {
    setOpenModalType(null);
  };

  // قيم الدلالة اللونية لحالة المؤشرات
  const getTrendColor = (value: number) => {
    return value < 20 ? 'text-red-500' : value < 50 ? 'text-amber-500' : 'text-green-500';
  };
  
  const formatNumberAr = (num: number) => {
    return num.toLocaleString('ar-EG');
  };

  if (isLoadingValue || isLoadingCount || isLoadingAlerts) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-4 w-24 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const summaryItems = [
    {
      title: 'إجمالي قيمة المخزون',
      value: `${formatNumberAr(valueSummary?.total || 0)} ج.م`,
      subtitle: `${countSummary?.total || 0} صنف في المخزون`,
      icon: <Package className="h-5 w-5 text-blue-500" />,
      trend: 100, // نسبة القيمة الحالية من الحد الأقصى المسموح
      trendLabel: 'من الحد المسموح'
    },
    {
      title: 'متوسط قيمة الصنف',
      value: countSummary?.total ? 
        `${formatNumberAr(Math.round((valueSummary?.total || 0) / countSummary.total))} ج.م` : 
        '0 ج.م',
      subtitle: 'متوسط تكلفة الصنف الواحد',
      icon: <BarChart3 className="h-5 w-5 text-purple-500" />,
      trend: 100, // نسبة من المتوسط المستهدف
      trendLabel: 'من المتوسط المستهدف'
    },
    {
      title: 'مخزون منخفض',
      value: `${alertSummary?.low_stock || 0} صنف`,
      subtitle: 'أصناف بكميات منخفضة',
      icon: <TrendingDown className="h-5 w-5 text-amber-500" />,
      trend: alertSummary?.low_stock && countSummary?.total ? 
        100 - Math.round((alertSummary.low_stock / countSummary.total) * 100) : 100,
      trendLabel: 'من إجمالي الأصناف'
    },
    {
      title: 'مخزون نافذ',
      value: `${alertSummary?.out_of_stock || 0} صنف`,
      subtitle: 'أصناف نفذت من المخزون',
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      trend: alertSummary?.out_of_stock && countSummary?.total ? 
        100 - Math.round((alertSummary.out_of_stock / countSummary.total) * 100) : 100,
      trendLabel: 'من إجمالي الأصناف'
    }
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <style>{`
        @media (min-width: 1024px) {
          .inventory-summary-card {
            max-width: 270px;
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>
      {summaryItems.map((item, index) => (
        <Card 
          key={index} 
          className="inventory-summary-card border-border/40 hover:border-primary/40 transition-colors cursor-pointer hover:shadow-md"
          onClick={() => handleCardClick(
            index === 0 ? 'inventory-value' : 
            index === 1 ? 'average-value' : 
            index === 2 ? 'low-stock' : 
            'out-of-stock'
          )}
        >
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                <h3 className="text-2xl font-bold mt-1">{item.value}</h3>
                <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
              </div>
              <div className="bg-muted/50 p-2 rounded-full">
                {item.icon}
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-muted/50 h-1.5 rounded-full">
                <div 
                  className={`h-full rounded-full ${getTrendColor(item.trend)}`} 
                  style={{ width: `${item.trend}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex justify-between">
                <span>{item.trendLabel}</span>
                <span>{item.trend}%</span>
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* النافذة المنبثقة للتفاصيل */}
      {openModalType && (
        <DetailModal 
          isOpen={!!openModalType}
          onClose={handleCloseModal}
          type={openModalType}
          data={selectedCardData}
        />
      )}
    </div>
  );
};

export default InventoryDashboardSummary;
