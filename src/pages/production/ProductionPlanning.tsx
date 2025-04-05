
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageTransition from '@/components/ui/PageTransition';
import { Loader } from 'lucide-react';

const ProductionPlanning = () => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">تخطيط الإنتاج</h1>
          <p className="text-muted-foreground mt-1">إدارة خطط وجداول الإنتاج</p>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="semiFinished" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="semiFinished">المنتجات النصف مصنعة</TabsTrigger>
            <TabsTrigger value="products">المنتجات النهائية</TabsTrigger>
            <TabsTrigger value="packaging">مواد التعبئة</TabsTrigger>
            <TabsTrigger value="rawMaterials">المواد الخام</TabsTrigger>
          </TabsList>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="semiFinished" className="mt-4">
                <div className="bg-background rounded-md border p-6">
                  <h3 className="text-xl font-medium mb-4">تخطيط المنتجات النصف مصنعة</h3>
                  <p className="text-muted-foreground">قريباً - ميزة قيد التطوير</p>
                </div>
              </TabsContent>
              
              <TabsContent value="products" className="mt-4">
                <div className="bg-background rounded-md border p-6">
                  <h3 className="text-xl font-medium mb-4">تخطيط المنتجات النهائية</h3>
                  <p className="text-muted-foreground">قريباً - ميزة قيد التطوير</p>
                </div>
              </TabsContent>
              
              <TabsContent value="packaging" className="mt-4">
                <div className="bg-background rounded-md border p-6">
                  <h3 className="text-xl font-medium mb-4">تخطيط مواد التعبئة</h3>
                  <p className="text-muted-foreground">قريباً - ميزة قيد التطوير</p>
                </div>
              </TabsContent>
              
              <TabsContent value="rawMaterials" className="mt-4">
                <div className="bg-background rounded-md border p-6">
                  <h3 className="text-xl font-medium mb-4">تخطيط المواد الخام</h3>
                  <p className="text-muted-foreground">قريباً - ميزة قيد التطوير</p>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default ProductionPlanning;
