
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageTransition from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventorySummaryStats } from '@/components/inventory/reports/InventorySummaryStats';
import { InventoryMovementChart } from '@/components/inventory/reports/InventoryMovementChart';
import { InventoryUsageChart } from '@/components/inventory/reports/InventoryUsageChart';
import { ProductMovementHistory } from '@/components/inventory/movement';

const InventoryReports: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('overview');
  
  const getTableNameFromType = (type: string | undefined): string => {
    switch (type) {
      case 'raw-materials':
        return 'raw_materials';
      case 'packaging':
        return 'packaging_materials';
      case 'semi-finished':
        return 'semi_finished_products';
      case 'finished-products':
        return 'finished_products';
      default:
        return '';
    }
  };
  
  const tableName = getTableNameFromType(type);
  
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['inventory-item', tableName, id],
    queryFn: async () => {
      if (!tableName || !id) return null;
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tableName && !!id
  });
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4">
            <div className="space-y-1">
              <div className="h-7 w-40 bg-muted animate-pulse rounded"></div>
              <div className="h-5 w-60 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }
  
  if (error || !product) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              حدث خطأ أثناء تحميل بيانات المنتج. يرجى المحاولة مرة أخرى.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>العودة</span>
          </Button>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col items-start pb-4">
          <div className="flex w-full items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">{product.name}</h1>
              <p className="text-muted-foreground">
                تقارير وإحصائيات المخزون | {product.code}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/inventory/${type}/${id}`)}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>العودة للتفاصيل</span>
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="movement">حركة المخزون</TabsTrigger>
            <TabsTrigger value="usage">معدلات الاستهلاك</TabsTrigger>
            <TabsTrigger value="history">سجل العمليات</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <InventorySummaryStats itemId={id || ''} itemType={tableName} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InventoryMovementChart 
                itemId={id || ''} 
                itemType={tableName}
                title="حركة المخزون (آخر 6 أشهر)"
              />
              <InventoryUsageChart 
                itemId={id || ''} 
                itemType={tableName}
                title="معدل الاستهلاك الشهري"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="movement" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تحليل حركة المخزون</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InventoryMovementChart 
                  itemId={id || ''} 
                  itemType={tableName}
                  title={`حركة المخزون لـ ${product.name}`}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>معدلات الاستهلاك</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <InventoryUsageChart 
                  itemId={id || ''} 
                  itemType={tableName}
                  title={`معدل استهلاك ${product.name}`}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>سجل العمليات الكامل</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ProductMovementHistory itemId={id || ''} itemType={tableName} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default InventoryReports;
