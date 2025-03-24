
import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from "@/components/ui/progress";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

// Mock data for all inventory items with stock levels
const lowStockItems = {
  raw: [
    { id: 1, code: 'RAW-00001', name: 'كحول إيثيلي', currentStock: 40, minStock: 50, unit: 'لتر', category: 'المواد الأولية', route: '/inventory/raw-materials' },
    { id: 3, code: 'RAW-00003', name: 'جليسرين', currentStock: 18, minStock: 20, unit: 'كجم', category: 'المواد الأولية', route: '/inventory/raw-materials' }
  ],
  semi: [
    { id: 1, code: 'SEMI-00001', name: 'ملمع تابلوه سائل', currentStock: 35, minStock: 50, unit: 'لتر', category: 'المنتجات النصف مصنعة', route: '/inventory/semi-finished' }
  ],
  packaging: [
    { id: 1, code: 'PKG-00001', name: 'عبوة بلاستيكية 250مل', currentStock: 120, minStock: 200, unit: 'قطعة', category: 'مستلزمات التعبئة', route: '/inventory/packaging' },
    { id: 5, code: 'PKG-00005', name: 'كرتونة تعبئة (24 قطعة)', currentStock: 40, minStock: 50, unit: 'قطعة', category: 'مستلزمات التعبئة', route: '/inventory/packaging' }
  ],
  finished: [
    { id: 1, code: 'FIN-00001', name: 'ملمع تابلوه 250مل', currentStock: 30, minStock: 50, unit: 'قطعة', category: 'المنتجات النهائية', route: '/inventory/finished-products' }
  ]
};

const LowStockItems = () => {
  const [activeTab, setActiveTab] = useState('all');
  
  // Combine all items and sort by stock percentage
  const allItems = [
    ...lowStockItems.raw,
    ...lowStockItems.semi,
    ...lowStockItems.packaging,
    ...lowStockItems.finished
  ].sort((a, b) => {
    const percentA = (a.currentStock / a.minStock) * 100;
    const percentB = (b.currentStock / b.minStock) * 100;
    return percentA - percentB;
  });
  
  // Calculate totals
  const totalLowStock = allItems.length;
  const criticalItems = allItems.filter(item => (item.currentStock / item.minStock) * 100 <= 50).length;
  
  // Render a stock item card
  const renderStockItem = (item: any) => {
    const percentage = Math.min(100, Math.round((item.currentStock / item.minStock) * 100));
    const progressColor = 
      percentage <= 30 ? 'bg-red-500' : 
      percentage <= 70 ? 'bg-amber-500' : 
      'bg-green-500';
    
    return (
      <Card key={item.code} className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{item.code}</p>
            </div>
            <Badge 
              variant="outline" 
              className="ml-2"
            >
              {item.category}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span>المخزون الحالي: {item.currentStock} {item.unit}</span>
              <span>الحد الأدنى: {item.minStock} {item.unit}</span>
            </div>
            
            <div className="w-full">
              <Progress 
                value={percentage} 
                className={`h-2 ${progressColor}`} 
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className={`text-sm font-medium ${
                percentage <= 30 ? 'text-red-600' :
                percentage <= 70 ? 'text-amber-600' :
                'text-green-600'
              }`}>
                {percentage}%
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link to={item.route}>
                  عرض التفاصيل
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المخزون المنخفض</h1>
          <p className="text-muted-foreground mt-1">العناصر التي وصلت إلى الحد الأدنى المسموح به أو أقل</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-amber-50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-800 font-medium">إجمالي العناصر منخفضة المخزون</p>
                <h3 className="text-3xl font-bold text-amber-900 mt-1">{totalLowStock}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-red-50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-red-800 font-medium">العناصر الحرجة (أقل من 50%)</p>
                <h3 className="text-3xl font-bold text-red-900 mt-1">{criticalItems}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col h-full justify-center">
                <p className="text-sm text-muted-foreground">
                  يُوصى بتجديد المخزون للعناصر التي تقل عن الحد الأدنى لضمان استمرارية عمليات الإنتاج.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="all">الكل ({allItems.length})</TabsTrigger>
            <TabsTrigger value="raw">المواد الأولية ({lowStockItems.raw.length})</TabsTrigger>
            <TabsTrigger value="semi">النصف مصنعة ({lowStockItems.semi.length})</TabsTrigger>
            <TabsTrigger value="packaging">مستلزمات التعبئة ({lowStockItems.packaging.length})</TabsTrigger>
            <TabsTrigger value="finished">المنتجات النهائية ({lowStockItems.finished.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allItems.map(renderStockItem)}
            </div>
          </TabsContent>
          
          <TabsContent value="raw" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lowStockItems.raw.map(renderStockItem)}
            </div>
          </TabsContent>
          
          <TabsContent value="semi" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lowStockItems.semi.map(renderStockItem)}
            </div>
          </TabsContent>
          
          <TabsContent value="packaging" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lowStockItems.packaging.map(renderStockItem)}
            </div>
          </TabsContent>
          
          <TabsContent value="finished" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lowStockItems.finished.map(renderStockItem)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default LowStockItems;
