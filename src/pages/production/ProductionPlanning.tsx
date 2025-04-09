
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageTransition from '@/components/ui/PageTransition';
import { Calendar as CalendarIcon, ListFilter, Layers, Package2, Hammer, BarChart, TargetIcon, FlaskConical, Calendar, Clock } from 'lucide-react';
import SemiFinishedPlanning from '@/components/production/planning/SemiFinishedPlanning';
import FinishedProductsPlanning from '@/components/production/planning/FinishedProductsPlanning';
import PackagingPlanning from '@/components/production/planning/PackagingPlanning';
import RawMaterialsPlanning from '@/components/production/planning/RawMaterialsPlanning';
import ProductionDashboard from '@/components/production/planning/dashboard/ProductionDashboard';
import ProductionGoals from '@/components/production/planning/goals/ProductionGoals';
import ProductionSimulation from '@/components/production/planning/simulation/ProductionSimulation';
import MaterialsRequirements from '@/components/production/planning/materials/MaterialsRequirements';
import ProductionSchedule from '@/components/production/planning/schedule/ProductionSchedule';

const ProductionPlanning = () => {
  const [tabView, setTabView] = useState<"dashboard" | "goals" | "simulation" | "materials" | "schedule" | "semiFinished" | "products" | "packaging" | "rawMaterials">("dashboard");

  return (
    <PageTransition>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">تخطيط الإنتاج</h1>
          <p className="text-muted-foreground">إدارة وتخطيط الإنتاج للمنتجات والمواد الخام</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">تخطيط وتحليل الإنتاج</CardTitle>
            <CardDescription>
              إدارة وتخطيط الاحتياجات المستقبلية من المواد الخام والمنتجات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tabView} onValueChange={(value) => setTabView(value as any)} className="w-full">
              <TabsList className="grid grid-cols-3 md:grid-cols-9 w-full">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <BarChart size={16} />
                  <span className="hidden sm:inline">لوحة المعلومات</span>
                </TabsTrigger>
                <TabsTrigger value="goals" className="flex items-center gap-2">
                  <TargetIcon size={16} />
                  <span className="hidden sm:inline">أهداف الإنتاج</span>
                </TabsTrigger>
                <TabsTrigger value="simulation" className="flex items-center gap-2">
                  <FlaskConical size={16} />
                  <span className="hidden sm:inline">محاكاة الإنتاج</span>
                </TabsTrigger>
                <TabsTrigger value="materials" className="flex items-center gap-2">
                  <ListFilter size={16} />
                  <span className="hidden sm:inline">المواد المطلوبة</span>
                </TabsTrigger>
                <TabsTrigger value="schedule" className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span className="hidden sm:inline">الجدول الزمني</span>
                </TabsTrigger>
                <TabsTrigger value="semiFinished" className="flex items-center gap-2">
                  <Layers size={16} />
                  <span className="hidden sm:inline">نصف مصنعة</span>
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package2 size={16} />
                  <span className="hidden sm:inline">منتجات</span>
                </TabsTrigger>
                <TabsTrigger value="packaging" className="flex items-center gap-2">
                  <Hammer size={16} />
                  <span className="hidden sm:inline">تعبئة</span>
                </TabsTrigger>
                <TabsTrigger value="rawMaterials" className="flex items-center gap-2">
                  <ListFilter size={16} />
                  <span className="hidden sm:inline">مواد خام</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-4 mt-4">
                <ProductionDashboard />
              </TabsContent>

              <TabsContent value="goals" className="space-y-4 mt-4">
                <ProductionGoals />
              </TabsContent>

              <TabsContent value="simulation" className="space-y-4 mt-4">
                <ProductionSimulation />
              </TabsContent>

              <TabsContent value="materials" className="space-y-4 mt-4">
                <MaterialsRequirements />
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4 mt-4">
                <ProductionSchedule />
              </TabsContent>

              <TabsContent value="semiFinished" className="space-y-4 mt-4">
                <SemiFinishedPlanning />
              </TabsContent>

              <TabsContent value="products" className="space-y-4 mt-4">
                <FinishedProductsPlanning />
              </TabsContent>

              <TabsContent value="packaging" className="space-y-4 mt-4">
                <PackagingPlanning />
              </TabsContent>

              <TabsContent value="rawMaterials" className="space-y-4 mt-4">
                <RawMaterialsPlanning />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default ProductionPlanning;
