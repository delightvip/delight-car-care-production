
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PageTransition from '@/components/ui/PageTransition';
import InventoryDistribution from '@/components/dashboard/InventoryDistribution';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DataTable from '@/components/ui/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

const InventoryDistributionPage = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [inventoryType, setInventoryType] = React.useState('all');
  
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: async () => {
      try {
        // جلب بيانات المخزون المختلفة
        const [rawMaterials, semiFinished, packaging, finished] = await Promise.all([
          supabase
            .from('raw_materials')
            .select('*')
            .then(res => res.data || []),
            
          supabase
            .from('semi_finished_products')
            .select('*')
            .then(res => res.data || []),
            
          supabase
            .from('packaging_materials')
            .select('*')
            .then(res => res.data || []),
            
          supabase
            .from('finished_products')
            .select('*')
            .then(res => res.data || [])
        ]);
        
        // معالجة البيانات وتوحيد الحقول
        const processedRawMaterials = rawMaterials.map(item => ({
          ...item,
          type: 'raw',
          typeName: 'مواد أولية',
          totalValue: item.quantity * item.unit_cost
        }));
        
        const processedSemiFinished = semiFinished.map(item => ({
          ...item,
          type: 'semi',
          typeName: 'منتجات نصف مصنعة',
          totalValue: item.quantity * item.unit_cost
        }));
        
        const processedPackaging = packaging.map(item => ({
          ...item,
          type: 'packaging',
          typeName: 'مستلزمات تعبئة',
          totalValue: item.quantity * item.unit_cost
        }));
        
        const processedFinished = finished.map(item => ({
          ...item,
          type: 'finished',
          typeName: 'منتجات نهائية',
          totalValue: item.quantity * item.unit_cost
        }));
        
        // دمج جميع البيانات
        return {
          rawMaterials: processedRawMaterials,
          semiFinished: processedSemiFinished,
          packaging: processedPackaging,
          finished: processedFinished,
          all: [
            ...processedRawMaterials,
            ...processedSemiFinished,
            ...processedPackaging,
            ...processedFinished
          ]
        };
      } catch (error) {
        console.error("Error fetching inventory data:", error);
        return {
          rawMaterials: [],
          semiFinished: [],
          packaging: [],
          finished: [],
          all: []
        };
      }
    },
    refetchInterval: 60000
  });
  
  // استخراج بيانات المخزون لتغذية الرسم البياني
  const chartData = React.useMemo(() => {
    if (!inventoryData) return [];
    
    const rawMaterialsValue = inventoryData.rawMaterials.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    const semiFinishedValue = inventoryData.semiFinished.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    const packagingValue = inventoryData.packaging.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    const finishedValue = inventoryData.finished.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    
    return [
      { name: 'المواد الأولية', value: rawMaterialsValue },
      { name: 'المنتجات النصف مصنعة', value: semiFinishedValue },
      { name: 'مواد التعبئة', value: packagingValue },
      { name: 'المنتجات النهائية', value: finishedValue }
    ];
  }, [inventoryData]);
  
  // فلترة البيانات بناءً على نوع المخزون وكلمة البحث
  const filteredData = React.useMemo(() => {
    if (!inventoryData) return [];
    
    let data = inventoryData[inventoryType as keyof typeof inventoryData] || [];
    
    if (Array.isArray(data) && searchTerm) {
      return data.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return data;
  }, [inventoryData, inventoryType, searchTerm]);
  
  const columns = [
    { 
      key: "code", 
      title: "الرمز",
      render: (value: any, item: any) => <span className="font-medium">{item.code}</span>
    },
    { 
      key: "name", 
      title: "الاسم"
    },
    { 
      key: "quantity", 
      title: "الكمية",
      render: (value: any, item: any) => (
        <span className="font-medium">{item.quantity} {item.unit}</span>
      )
    },
    {
      key: "unit_cost",
      title: "تكلفة الوحدة",
      render: (value: any, item: any) => (
        <span>{item.unit_cost?.toLocaleString('ar-EG')} ج.م</span>
      )
    },
    {
      key: "totalValue",
      title: "القيمة الإجمالية",
      render: (value: any, item: any) => (
        <span className="font-medium">{item.totalValue?.toLocaleString('ar-EG')} ج.م</span>
      )
    },
    {
      key: "typeName",
      title: "النوع",
      render: (value: any, item: any) => {
        const typeColors: Record<string, string> = {
          raw: 'bg-blue-100 text-blue-800',
          semi: 'bg-purple-100 text-purple-800',
          packaging: 'bg-green-100 text-green-800',
          finished: 'bg-amber-100 text-amber-800'
        };
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${typeColors[item.type] || ''}`}>
            {item.typeName}
          </span>
        );
      }
    }
  ];
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">توزيع المخزون</h1>
          <p className="text-muted-foreground mt-1">تحليل توزيع قيمة المخزون وتفاصيل العناصر</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>تمثيل توزيع المخزون</CardTitle>
                <CardDescription>
                  نسب توزيع المخزون بناءً على القيم الإجمالية للعناصر
                </CardDescription>
              </CardHeader>
              <CardContent className="h-96">
                <InventoryDistribution data={chartData} />
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>عناصر المخزون</CardTitle>
                <CardDescription>
                  جميع عناصر المخزون وقيمتها
                </CardDescription>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className="flex-1">
                    <Input
                      placeholder="بحث عن عنصر..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="w-full sm:w-64">
                    <Select value={inventoryType} onValueChange={setInventoryType}>
                      <SelectTrigger>
                        <SelectValue placeholder="جميع العناصر" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع العناصر</SelectItem>
                        <SelectItem value="rawMaterials">المواد الأولية</SelectItem>
                        <SelectItem value="semiFinished">المنتجات النصف مصنعة</SelectItem>
                        <SelectItem value="packaging">مستلزمات التعبئة</SelectItem>
                        <SelectItem value="finished">المنتجات النهائية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <DataTable 
                    data={filteredData} 
                    columns={columns} 
                    searchable={false}
                    pagination={true}
                    itemsPerPage={10}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default InventoryDistributionPage;
