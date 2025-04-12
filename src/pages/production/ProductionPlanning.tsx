
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageTransition from '@/components/ui/PageTransition';
import { AlertTriangle, Calculator, ChartBar, DatabaseIcon, Factory, InfoIcon, LineChart, Package2, Truck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ProductionSimulation from '@/components/production/planning/ProductionSimulation';
import PackagingSimulation from '@/components/production/planning/PackagingSimulation';
import CostSimulation from '@/components/production/planning/CostSimulation';
import MaterialsForecasting from '@/components/production/planning/MaterialsForecasting';
import ProductionCapacityPlanning from '@/components/production/planning/ProductionCapacityPlanning';

const ProductionPlanning = () => {
  const [tabView, setTabView] = useState<"production" | "packaging" | "costs" | "materials" | "capacity">("production");

  return (
    <PageTransition>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">تخطيط ومحاكاة الإنتاج</h1>
          <p className="text-muted-foreground">أداة متقدمة لمحاكاة سيناريوهات الإنتاج وتخطيط الموارد</p>
        </div>
        
        <Alert variant="warning" className="bg-amber-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>محاكاة فقط</AlertTitle>
          <AlertDescription>
            هذه الأداة للمحاكاة والتخطيط فقط ولا تؤثر على بيانات النظام الفعلية.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              محاكاة سيناريوهات الإنتاج
            </CardTitle>
            <CardDescription>
              استخدم هذه الأدوات لمحاكاة مختلف سيناريوهات الإنتاج وتقييم التكاليف والموارد المطلوبة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tabView} onValueChange={(value) => setTabView(value as any)} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
                <TabsTrigger value="production" className="flex items-center gap-2">
                  <Factory size={16} />
                  <span className="hidden sm:inline">محاكاة الإنتاج</span>
                </TabsTrigger>
                <TabsTrigger value="packaging" className="flex items-center gap-2">
                  <Package2 size={16} />
                  <span className="hidden sm:inline">محاكاة التعبئة</span>
                </TabsTrigger>
                <TabsTrigger value="costs" className="flex items-center gap-2">
                  <ChartBar size={16} />
                  <span className="hidden sm:inline">محاكاة التكاليف</span>
                </TabsTrigger>
                <TabsTrigger value="materials" className="flex items-center gap-2">
                  <Truck size={16} />
                  <span className="hidden sm:inline">توقع المواد</span>
                </TabsTrigger>
                <TabsTrigger value="capacity" className="flex items-center gap-2">
                  <LineChart size={16} />
                  <span className="hidden sm:inline">تخطيط السعة</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="production" className="space-y-4 mt-4">
                <ProductionSimulation />
              </TabsContent>

              <TabsContent value="packaging" className="space-y-4 mt-4">
                <PackagingSimulation />
              </TabsContent>

              <TabsContent value="costs" className="space-y-4 mt-4">
                <CostSimulation />
              </TabsContent>

              <TabsContent value="materials" className="space-y-4 mt-4">
                <MaterialsForecasting />
              </TabsContent>

              <TabsContent value="capacity" className="space-y-4 mt-4">
                <ProductionCapacityPlanning />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default ProductionPlanning;
