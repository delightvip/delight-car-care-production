
import React, { useState, useEffect } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, BarChart3, PieChart, TrendingUp, Layers, FileBarChart, Clock, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Import the report components
import ReportFilterCard from '@/components/inventory/reports/ReportFilterCard';
import ReportInfoCard from '@/components/inventory/reports/ReportInfoCard';
import ReportContent from '@/components/inventory/reports/ReportContent';

export interface ItemCategory {
  id: string;
  name: string;
  type: 'raw' | 'semi' | 'packaging' | 'finished';
  itemCount: number;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
}

const inventoryTables = [
  { id: 'raw', name: 'المواد الخام', table: 'raw_materials' as const },
  { id: 'semi', name: 'المنتجات النصف مصنعة', table: 'semi_finished_products' as const },
  { id: 'packaging', name: 'مواد التعبئة', table: 'packaging_materials' as const },
  { id: 'finished', name: 'المنتجات النهائية', table: 'finished_products' as const }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6384', '#36A2EB', '#4BC0C0', '#9966FF', '#C9CBCF'];

const InventoryReports = () => {
  const params = useParams<{ type?: string; id?: string }>();
  const navigate = useNavigate();
  const isItemReport = !!params.type && !!params.id;

  const [activeTab, setActiveTab] = useState('item-movement');
  const [timeRange, setTimeRange] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState<string>(params.type || 'raw');
  const [selectedItem, setSelectedItem] = useState<string | null>(params.id || null);
  const [reportType, setReportType] = useState<string>('movement');
  
  // Fetch categories (raw materials, packaging, etc)
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const result: ItemCategory[] = [];
      
      for (const type of inventoryTables) {
        const { count, error } = await supabase
          .from(type.table)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.error(`Error fetching count for ${type.table}:`, error);
        }
          
        result.push({
          id: type.id,
          name: type.name,
          type: type.id as ItemCategory['type'],
          itemCount: count || 0
        });
      }
      
      return result;
    }
  });
  
  // Fetch items by category
  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ['inventory-items', selectedCategory],
    queryFn: async () => {
      const selectedTableInfo = inventoryTables.find(t => t.id === selectedCategory);
      
      if (!selectedTableInfo) return [];
      
      const { data, error } = await supabase
        .from(selectedTableInfo.table)
        .select('id, code, name, quantity, unit');
        
      if (error) {
        console.error(`Error fetching items from ${selectedTableInfo.table}:`, error);
        return [];
      }
        
      return data.map(item => ({
        id: String(item.id),
        code: String(item.code),
        name: String(item.name),
        quantity: Number(item.quantity),
        unit: String(item.unit)
      })) as InventoryItem[];
    },
    enabled: !!selectedCategory
  });
  
  // Fetch selected item details
  const { data: selectedItemDetails, isLoading: isLoadingItemDetails } = useQuery({
    queryKey: ['inventory-item-details', selectedCategory, selectedItem],
    queryFn: async () => {
      if (!selectedItem) return null;
      
      const selectedTableInfo = inventoryTables.find(t => t.id === selectedCategory);
      
      if (!selectedTableInfo) return null;
      
      const { data, error } = await supabase
        .from(selectedTableInfo.table)
        .select('id, code, name, quantity, unit')
        .eq('id', parseInt(selectedItem))
        .single();
        
      if (error) {
        console.error(`Error fetching item details:`, error);
        return null;
      }
        
      return {
        id: String(data.id),
        code: String(data.code),
        name: String(data.name),
        quantity: Number(data.quantity),
        unit: String(data.unit)
      } as InventoryItem;
    },
    enabled: !!selectedItem && !!selectedCategory
  });

  // Fetch price trends data for all raw materials and packaging
  const { data: priceTrendsData, isLoading: isLoadingPriceTrends } = useQuery({
    queryKey: ['price-trends'],
    queryFn: async () => {
      const rawMaterialsQuery = await supabase
        .from('raw_materials')
        .select('id, code, name, unit_cost, created_at, updated_at')
        .order('updated_at', { ascending: false });
        
      const packagingQuery = await supabase
        .from('packaging_materials')
        .select('id, code, name, unit_cost, created_at, updated_at')
        .order('updated_at', { ascending: false });
        
      if (rawMaterialsQuery.error) console.error('Error fetching raw materials price data:', rawMaterialsQuery.error);
      if (packagingQuery.error) console.error('Error fetching packaging price data:', packagingQuery.error);
      
      return {
        rawMaterials: rawMaterialsQuery.data || [],
        packaging: packagingQuery.data || []
      };
    },
    enabled: activeTab === 'price-trends'
  });

  // Fetch top consumed materials based on inventory movements
  const { data: topConsumedMaterials, isLoading: isLoadingTopConsumed } = useQuery({
    queryKey: ['top-consumed-materials', timeRange],
    queryFn: async () => {
      // For raw materials
      const rawMaterialsQuery = await supabase
        .from('inventory_movements')
        .select('item_id, item_type, quantity')
        .eq('item_type', 'raw')
        .lt('quantity', 0) // Only count outgoing movements
        .order('created_at', { ascending: false });
        
      // For packaging materials
      const packagingQuery = await supabase
        .from('inventory_movements')
        .select('item_id, item_type, quantity')
        .eq('item_type', 'packaging')
        .lt('quantity', 0) // Only count outgoing movements
        .order('created_at', { ascending: false });
        
      if (rawMaterialsQuery.error) console.error('Error fetching raw materials consumption data:', rawMaterialsQuery.error);
      if (packagingQuery.error) console.error('Error fetching packaging consumption data:', packagingQuery.error);
      
      // Process raw materials consumption
      const rawConsumption: Record<string, number> = {};
      for (const movement of rawMaterialsQuery.data || []) {
        if (!rawConsumption[movement.item_id]) rawConsumption[movement.item_id] = 0;
        rawConsumption[movement.item_id] += Math.abs(movement.quantity);
      }
      
      // Process packaging consumption
      const packagingConsumption: Record<string, number> = {};
      for (const movement of packagingQuery.data || []) {
        if (!packagingConsumption[movement.item_id]) packagingConsumption[movement.item_id] = 0;
        packagingConsumption[movement.item_id] += Math.abs(movement.quantity);
      }
      
      // Fetch names for the top consumed items
      const topRawIds = Object.entries(rawConsumption)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(entry => entry[0]);
        
      const topPackagingIds = Object.entries(packagingConsumption)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(entry => entry[0]);
        
      // Get item details for raw materials
      const topRawMaterialsQuery = await supabase
        .from('raw_materials')
        .select('id, code, name, unit')
        .in('id', topRawIds);
        
      // Get item details for packaging materials
      const topPackagingMaterialsQuery = await supabase
        .from('packaging_materials')
        .select('id, code, name, unit')
        .in('id', topPackagingIds);
        
      if (topRawMaterialsQuery.error) console.error('Error fetching top raw materials details:', topRawMaterialsQuery.error);
      if (topPackagingMaterialsQuery.error) console.error('Error fetching top packaging details:', topPackagingMaterialsQuery.error);
      
      // Combine the data
      const rawMaterialsResult = (topRawMaterialsQuery.data || []).map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        consumption: rawConsumption[item.id.toString()] || 0,
        type: 'raw'
      })).sort((a, b) => b.consumption - a.consumption);
      
      const packagingResult = (topPackagingMaterialsQuery.data || []).map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        consumption: packagingConsumption[item.id.toString()] || 0,
        type: 'packaging'
      })).sort((a, b) => b.consumption - a.consumption);
      
      return {
        rawMaterials: rawMaterialsResult,
        packaging: packagingResult
      };
    },
    enabled: activeTab === 'consumption' || activeTab === 'least-used'
  });

  // Fetch materials dependency data (materials used in products)
  const { data: materialsDependency, isLoading: isLoadingDependency } = useQuery({
    queryKey: ['materials-dependency'],
    queryFn: async () => {
      // Fetch semi-finished product ingredients
      const semiFinishedIngredientsQuery = await supabase
        .from('semi_finished_ingredients')
        .select('raw_material_id, semi_finished_id');
        
      // Fetch finished product packaging materials
      const finishedProductPackagingQuery = await supabase
        .from('finished_product_packaging')
        .select('packaging_material_id, finished_product_id');
        
      // Fetch all raw materials
      const rawMaterialsQuery = await supabase
        .from('raw_materials')
        .select('id, code, name');
        
      // Fetch all packaging materials
      const packagingMaterialsQuery = await supabase
        .from('packaging_materials')
        .select('id, code, name');
        
      if (semiFinishedIngredientsQuery.error) console.error('Error fetching semi-finished ingredients:', semiFinishedIngredientsQuery.error);
      if (finishedProductPackagingQuery.error) console.error('Error fetching finished product packaging:', finishedProductPackagingQuery.error);
      if (rawMaterialsQuery.error) console.error('Error fetching raw materials:', rawMaterialsQuery.error);
      if (packagingMaterialsQuery.error) console.error('Error fetching packaging materials:', packagingMaterialsQuery.error);
      
      // Count dependencies for raw materials
      const rawMaterialDependencies: Record<string, number> = {};
      for (const ingredient of semiFinishedIngredientsQuery.data || []) {
        const materialId = ingredient.raw_material_id.toString();
        if (!rawMaterialDependencies[materialId]) rawMaterialDependencies[materialId] = 0;
        rawMaterialDependencies[materialId]++;
      }
      
      // Count dependencies for packaging materials
      const packagingDependencies: Record<string, number> = {};
      for (const packaging of finishedProductPackagingQuery.data || []) {
        const materialId = packaging.packaging_material_id.toString();
        if (!packagingDependencies[materialId]) packagingDependencies[materialId] = 0;
        packagingDependencies[materialId]++;
      }
      
      // Combine with material details
      const rawMaterialsResult = (rawMaterialsQuery.data || []).map(material => ({
        id: material.id,
        code: material.code,
        name: material.name,
        dependencyCount: rawMaterialDependencies[material.id.toString()] || 0,
        type: 'raw'
      })).sort((a, b) => b.dependencyCount - a.dependencyCount);
      
      const packagingResult = (packagingMaterialsQuery.data || []).map(material => ({
        id: material.id,
        code: material.code,
        name: material.name,
        dependencyCount: packagingDependencies[material.id.toString()] || 0,
        type: 'packaging'
      })).sort((a, b) => b.dependencyCount - a.dependencyCount);
      
      return {
        rawMaterials: rawMaterialsResult,
        packaging: packagingResult
      };
    },
    enabled: activeTab === 'dependency' || activeTab === 'unused-materials'
  });

  useEffect(() => {
    if (items && items.length > 0 && !selectedItem) {
      setSelectedItem(items[0].id);
    }
  }, [items, selectedItem]);

  const handleExportReport = () => {
    toast.info("جاري تحضير التقرير للتنزيل...");
    
    setTimeout(() => {
      toast.success("تم تحضير التقرير بنجاح، جاري التنزيل");
    }, 1500);
  };

  const getPriceTrendData = () => {
    if (!priceTrendsData) return [];
    
    const combinedItems = [
      ...priceTrendsData.rawMaterials.slice(0, 5).map(item => ({
        ...item,
        type: 'مواد خام'
      })),
      ...priceTrendsData.packaging.slice(0, 5).map(item => ({
        ...item,
        type: 'مواد تعبئة'
      }))
    ];
    
    // Group data by month for the chart
    const monthlyData: Record<string, any> = {};
    combinedItems.forEach(item => {
      const date = new Date(item.updated_at);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { month: monthYear };
      }
      
      // Use the code as a key
      monthlyData[monthYear][item.code] = item.unit_cost;
    });
    
    return Object.values(monthlyData);
  };

  const renderPriceTrends = () => {
    const data = getPriceTrendData();
    
    if (isLoadingPriceTrends) {
      return <div className="h-60 flex items-center justify-center">
        <Skeleton className="h-40 w-full" />
      </div>;
    }
    
    if (data.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">لا توجد بيانات كافية لعرض اتجاهات الأسعار</div>;
    }
    
    const dataKeys = data.length > 0 ? 
      Object.keys(data[0]).filter(key => key !== 'month') : 
      [];
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          {dataKeys.map((key, index) => (
            <Line 
              key={key} 
              type="monotone" 
              dataKey={key} 
              stroke={COLORS[index % COLORS.length]} 
              activeDot={{ r: 8 }} 
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderConsumptionChart = (data: any[], title: string) => {
    if (!data || data.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">لا توجد بيانات كافية لعرض بيانات الاستهلاك</div>;
    }
    
    return (
      <div className="w-full">
        <h3 className="text-lg font-medium mb-4 text-center">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" />
            <Tooltip />
            <Legend />
            <Bar dataKey="consumption" name="كمية الاستهلاك" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderDependencyChart = (data: any[], title: string) => {
    if (!data || data.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">لا توجد بيانات كافية لعرض علاقات المواد</div>;
    }
    
    return (
      <div className="w-full">
        <h3 className="text-lg font-medium mb-4 text-center">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" />
            <Tooltip />
            <Legend />
            <Bar dataKey="dependencyCount" name="عدد المنتجات" fill="#0088FE" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderUnusedMaterials = () => {
    if (isLoadingDependency) {
      return <div className="h-60 flex items-center justify-center">
        <Skeleton className="h-40 w-full" />
      </div>;
    }
    
    if (!materialsDependency) {
      return <div className="text-center py-8 text-muted-foreground">لا توجد بيانات متاحة</div>;
    }
    
    const unusedRawMaterials = materialsDependency.rawMaterials.filter(material => material.dependencyCount === 0);
    const unusedPackaging = materialsDependency.packaging.filter(material => material.dependencyCount === 0);
    
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>المواد الخام غير المستخدمة</CardTitle>
            <CardDescription>المواد الخام التي لا تدخل في أي منتج</CardDescription>
          </CardHeader>
          <CardContent>
            {unusedRawMaterials.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">جميع المواد الخام مستخدمة في المنتجات</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>الاسم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unusedRawMaterials.map(material => (
                    <TableRow key={material.id}>
                      <TableCell>{material.code}</TableCell>
                      <TableCell>{material.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>مواد التعبئة غير المستخدمة</CardTitle>
            <CardDescription>مواد التعبئة التي لا تدخل في أي منتج</CardDescription>
          </CardHeader>
          <CardContent>
            {unusedPackaging.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">جميع مواد التعبئة مستخدمة في المنتجات</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>الاسم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unusedPackaging.map(material => (
                    <TableRow key={material.id}>
                      <TableCell>{material.code}</TableCell>
                      <TableCell>{material.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const getLeastUsedMaterials = () => {
    if (!topConsumedMaterials) return { rawMaterials: [], packaging: [] };
    
    // Combine all materials and sort by consumption (ascending)
    const allRawMaterials = [...topConsumedMaterials.rawMaterials].sort((a, b) => a.consumption - b.consumption);
    const allPackaging = [...topConsumedMaterials.packaging].sort((a, b) => a.consumption - b.consumption);
    
    return {
      rawMaterials: allRawMaterials.slice(0, 10),
      packaging: allPackaging.slice(0, 10)
    };
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">تقارير وتحليلات المخزون</h1>
            <p className="text-muted-foreground mt-1">تحليل وإحصائيات حركة المخزون والتوزيع</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleExportReport}
            >
              <Download size={16} />
              تصدير التقرير
            </Button>
            {isItemReport && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/inventory/reports')}
              >
                العودة للتقارير العامة
              </Button>
            )}
          </div>
        </div>
        
        {isItemReport ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ReportFilterCard
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
                categories={categories}
                items={items}
                isLoadingCategories={isLoadingCategories}
                isLoadingItems={isLoadingItems}
                isItemReport={isItemReport}
              />
              
              <ReportInfoCard
                selectedItemDetails={selectedItemDetails}
                isLoadingItemDetails={isLoadingItemDetails}
              />
            </div>
            
            <div className="bg-muted/30 rounded-lg p-6 border border-border/40 shadow-sm">
              <ReportContent
                selectedItem={selectedItem}
                selectedCategory={selectedCategory}
                isLoadingItemDetails={isLoadingItemDetails}
                selectedItemDetails={selectedItemDetails}
                reportType={reportType}
                setReportType={setReportType}
                timeRange={timeRange}
                setTimeRange={setTimeRange}
              />
            </div>
          </>
        ) : (
          <Tabs defaultValue="item-movement" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-2 md:grid-cols-5">
              <TabsTrigger value="item-movement" className="flex items-center gap-2">
                <BarChart3 size={16} />
                <span className="hidden md:inline">حركة الصنف</span>
              </TabsTrigger>
              <TabsTrigger value="price-trends" className="flex items-center gap-2">
                <TrendingUp size={16} />
                <span className="hidden md:inline">اتجاهات الأسعار</span>
              </TabsTrigger>
              <TabsTrigger value="dependency" className="flex items-center gap-2">
                <Layers size={16} />
                <span className="hidden md:inline">اعتمادية المواد</span>
              </TabsTrigger>
              <TabsTrigger value="consumption" className="flex items-center gap-2">
                <FileBarChart size={16} />
                <span className="hidden md:inline">الأكثر استهلاكاً</span>
              </TabsTrigger>
              <TabsTrigger value="least-used" className="flex items-center gap-2">
                <Clock size={16} />
                <span className="hidden md:inline">الأقل استهلاكاً</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="h-2"></div>
            
            <Card>
              <CardContent className="p-6">
                <TabsContent value="item-movement" className="mt-0">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">حركة وتحليل الأصناف</h2>
                    <div className="flex items-center gap-2">
                      <Select defaultValue={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="اختر نوع الأصناف" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryTables.map(category => (
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select defaultValue={selectedItem || ''} onValueChange={setSelectedItem}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="اختر الصنف" />
                        </SelectTrigger>
                        <SelectContent>
                          {items?.map(item => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {selectedItem && (
                    <Button
                      variant="default"
                      className="mb-6"
                      onClick={() => navigate(`/inventory/reports/${selectedCategory}/${selectedItem}`)}
                    >
                      عرض تقرير مفصل للصنف
                    </Button>
                  )}
                  
                  <div className="bg-muted/30 rounded-lg p-6 border border-border/40 shadow-sm">
                    <ReportContent
                      selectedItem={selectedItem}
                      selectedCategory={selectedCategory}
                      isLoadingItemDetails={isLoadingItemDetails}
                      selectedItemDetails={selectedItemDetails}
                      reportType={reportType}
                      setReportType={setReportType}
                      timeRange={timeRange}
                      setTimeRange={setTimeRange}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="price-trends" className="mt-0">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">اتجاهات أسعار المواد</h2>
                    <div className="flex items-center gap-2">
                      <Select defaultValue={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="الفترة الزمنية" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">شهري</SelectItem>
                          <SelectItem value="quarter">ربع سنوي</SelectItem>
                          <SelectItem value="year">سنوي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>تغير أسعار المواد بمرور الوقت</CardTitle>
                      <CardDescription>يوضح التغير في أسعار المواد الخام ومواد التعبئة</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {renderPriceTrends()}
                    </CardContent>
                  </Card>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>المواد الخام - التكلفة الحالية</CardTitle>
                        <CardDescription>أعلى 5 مواد خام من حيث التكلفة</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingPriceTrends ? (
                          <Skeleton className="h-40 w-full" />
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>الاسم</TableHead>
                                <TableHead>التكلفة</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {priceTrendsData?.rawMaterials
                                .sort((a, b) => b.unit_cost - a.unit_cost)
                                .slice(0, 5)
                                .map(material => (
                                  <TableRow key={material.id}>
                                    <TableCell>{material.name}</TableCell>
                                    <TableCell>{material.unit_cost.toLocaleString('ar-EG')} ج.م</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>مواد التعبئة - التكلفة الحالية</CardTitle>
                        <CardDescription>أعلى 5 مواد تعبئة من حيث التكلفة</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingPriceTrends ? (
                          <Skeleton className="h-40 w-full" />
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>الاسم</TableHead>
                                <TableHead>التكلفة</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {priceTrendsData?.packaging
                                .sort((a, b) => b.unit_cost - a.unit_cost)
                                .slice(0, 5)
                                .map(material => (
                                  <TableRow key={material.id}>
                                    <TableCell>{material.name}</TableCell>
                                    <TableCell>{material.unit_cost.toLocaleString('ar-EG')} ج.م</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="dependency" className="mt-0">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">اعتمادية المواد في المنتجات</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {isLoadingDependency ? (
                      <>
                        <Skeleton className="h-96 w-full" />
                        <Skeleton className="h-96 w-full" />
                      </>
                    ) : (
                      <>
                        {renderDependencyChart(
                          materialsDependency?.rawMaterials.filter(m => m.dependencyCount > 0).slice(0, 10) || [], 
                          "أكثر 10 مواد خام استخداماً في المنتجات"
                        )}
                        {renderDependencyChart(
                          materialsDependency?.packaging.filter(m => m.dependencyCount > 0).slice(0, 10) || [], 
                          "أكثر 10 مواد تعبئة استخداماً في المنتجات"
                        )}
                      </>
                    )}
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>توزيع اعتمادية المواد</CardTitle>
                      <CardDescription>يوضح نسبة المواد المستخدمة وغير المستخدمة</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingDependency ? (
                        <Skeleton className="h-60 w-full" />
                      ) : (
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-lg font-medium mb-4 text-center">المواد الخام</h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <RechartsPieChart>
                                <Pie
                                  data={[
                                    { 
                                      name: 'مستخدمة', 
                                      value: materialsDependency?.rawMaterials.filter(m => m.dependencyCount > 0).length || 0 
                                    },
                                    { 
                                      name: 'غير مستخدمة', 
                                      value: materialsDependency?.rawMaterials.filter(m => m.dependencyCount === 0).length || 0 
                                    }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={true}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {[0, 1].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium mb-4 text-center">مواد التعبئة</h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <RechartsPieChart>
                                <Pie
                                  data={[
                                    { 
                                      name: 'مستخدمة', 
                                      value: materialsDependency?.packaging.filter(m => m.dependencyCount > 0).length || 0 
                                    },
                                    { 
                                      name: 'غير مستخدمة', 
                                      value: materialsDependency?.packaging.filter(m => m.dependencyCount === 0).length || 0 
                                    }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={true}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {[0, 1].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="consumption" className="mt-0">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">المواد الأكثر استهلاكاً</h2>
                    <div className="flex items-center gap-2">
                      <Select defaultValue={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="الفترة الزمنية" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">شهري</SelectItem>
                          <SelectItem value="quarter">ربع سنوي</SelectItem>
                          <SelectItem value="year">سنوي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {isLoadingTopConsumed ? (
                      <>
                        <Skeleton className="h-96 w-full" />
                        <Skeleton className="h-96 w-full" />
                      </>
                    ) : (
                      <>
                        {renderConsumptionChart(
                          topConsumedMaterials?.rawMaterials.slice(0, 10) || [], 
                          "أعلى 10 مواد خام استهلاكاً"
                        )}
                        {renderConsumptionChart(
                          topConsumedMaterials?.packaging.slice(0, 10) || [], 
                          "أعلى 10 مواد تعبئة استهلاكاً"
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>أكثر المواد الخام استهلاكاً</CardTitle>
                        <CardDescription>استناداً إلى بيانات حركة المخزون</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingTopConsumed ? (
                          <Skeleton className="h-40 w-full" />
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>الكود</TableHead>
                                <TableHead>الاسم</TableHead>
                                <TableHead>الكمية المستهلكة</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {topConsumedMaterials?.rawMaterials.slice(0, 5).map(material => (
                                <TableRow key={material.id}>
                                  <TableCell>{material.code}</TableCell>
                                  <TableCell>{material.name}</TableCell>
                                  <TableCell>{material.consumption.toLocaleString('ar-EG')} {material.unit}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>أكثر مواد التعبئة استهلاكاً</CardTitle>
                        <CardDescription>استناداً إلى بيانات حركة المخزون</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingTopConsumed ? (
                          <Skeleton className="h-40 w-full" />
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>الكود</TableHead>
                                <TableHead>الاسم</TableHead>
                                <TableHead>الكمية المستهلكة</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {topConsumedMaterials?.packaging.slice(0, 5).map(material => (
                                <TableRow key={material.id}>
                                  <TableCell>{material.code}</TableCell>
                                  <TableCell>{material.name}</TableCell>
                                  <TableCell>{material.consumption.toLocaleString('ar-EG')} {material.unit}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="least-used" className="mt-0">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">المواد الأقل استهلاكاً</h2>
                    <div className="flex items-center gap-2">
                      <Select defaultValue={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="الفترة الزمنية" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">شهري</SelectItem>
                          <SelectItem value="quarter">ربع سنوي</SelectItem>
                          <SelectItem value="year">سنوي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {isLoadingTopConsumed ? (
                      <>
                        <Skeleton className="h-96 w-full" />
                        <Skeleton className="h-96 w-full" />
                      </>
                    ) : (
                      <>
                        {renderConsumptionChart(
                          getLeastUsedMaterials().rawMaterials, 
                          "أقل 10 مواد خام استهلاكاً"
                        )}
                        {renderConsumptionChart(
                          getLeastUsedMaterials().packaging, 
                          "أقل 10 مواد تعبئة استهلاكاً"
                        )}
                      </>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-semibold mb-4">المواد غير المستخدمة في المنتجات</h2>
                  {renderUnusedMaterials()}
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        )}
      </div>
    </PageTransition>
  );
};

export default InventoryReports;
