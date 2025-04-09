
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageTransition from '@/components/ui/PageTransition';
import { Calendar as CalendarIcon, ListFilter, Layers, Package2, Hammer } from 'lucide-react';
import SemiFinishedPlanning from '@/components/production/planning/SemiFinishedPlanning';
import FinishedProductsPlanning from '@/components/production/planning/FinishedProductsPlanning';
import PackagingPlanning from '@/components/production/planning/PackagingPlanning';
import RawMaterialsPlanning from '@/components/production/planning/RawMaterialsPlanning';

const ProductionPlanning = () => {
  const [tabView, setTabView] = useState<"semiFinished" | "products" | "packaging" | "rawMaterials">("semiFinished");

  return (
    <PageTransition>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">تخطيط الإنتاج</h1>
          <p className="text-muted-foreground">إدارة وتخطيط الإنتاج للمنتجات والمواد الخام</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">تخطيط المواد والمنتجات</CardTitle>
            <CardDescription>
              إدارة وتخطيط الاحتياجات المستقبلية من المواد الخام والمنتجات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tabView} onValueChange={(value) => setTabView(value as any)} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
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
