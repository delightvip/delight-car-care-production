import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronDown, ChevronUp, Clock, FileBarChart, Filter, Loader2, Plus, RefreshCw, Save, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Bar, BarChart } from 'recharts';
import { format, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
  category: string;
  isLowStock: boolean;
  reorderLevel: number;
  optimalOrderQuantity: number;
}

interface ForecastItem {
  materialId: string;
  materialName: string;
  materialCode: string;
  unit: string;
  currentQuantity: number;
  forecastedConsumption: number;
  suggestedOrder: number;
  expectedEndQuantity: number;
  unitCost: number;
  totalCost: number;
  status: 'ok' | 'warning' | 'critical';
}

interface HistoricalConsumption {
  materialId: string;
  month: string;
  consumptionQty: number;
  consumptionRate: number;
}

const MaterialsForecasting = () => {
  const [forecastDate, setForecastDate] = useState<Date>(addMonths(new Date(), 1));
  const [forecastItems, setForecastItems] = useState<ForecastItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'materialName', direction: 'asc' });
  const [autoApprovedMaterials, setAutoApprovedMaterials] = useState<string[]>([]);
  
  const { data: rawMaterials, isLoading: isLoadingRawMaterials } = useQuery({
    queryKey: ['raw-materials-for-forecast'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('raw_materials')
          .select('id, code, name, quantity, unit_cost, unit, min_stock')
          .order('name');
        
        if (error) throw error;
        
        return (data || []).map(material => ({
          id: material.id.toString(),
          code: material.code,
          name: material.name,
          unit: material.unit,
          quantity: material.quantity || 0,
          unitCost: material.unit_cost || 0,
          category: 'raw-material',
          isLowStock: (material.quantity || 0) <= (material.min_stock || 0),
          reorderLevel: material.min_stock || 0,
          optimalOrderQuantity: Math.ceil((material.min_stock || 0) * 1.5)
        }));
      } catch (err) {
        console.error("Error fetching raw materials:", err);
        return [];
      }
    }
  });
  
  const { data: packagingMaterials, isLoading: isLoadingPackaging } = useQuery({
    queryKey: ['packaging-materials-for-forecast'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('packaging_materials')
          .select('id, code, name, quantity, unit_cost, unit, min_stock')
          .order('name');
        
        if (error) throw error;
        
        return (data || []).map(material => ({
          id: material.id.toString(),
          code: material.code,
          name: material.name,
          unit: material.unit,
          quantity: material.quantity || 0,
          unitCost: material.unit_cost || 0,
          category: 'packaging',
          isLowStock: (material.quantity || 0) <= (material.min_stock || 0),
          reorderLevel: material.min_stock || 0,
          optimalOrderQuantity: Math.ceil((material.min_stock || 0) * 1.5)
        }));
      } catch (err) {
        console.error("Error fetching packaging materials:", err);
        return [];
      }
    }
  });
  
  const generateHistoricalConsumption = (): HistoricalConsumption[] => {
    const allMaterials = [...(rawMaterials || []), ...(packagingMaterials || [])];
    if (allMaterials.length === 0) return [];
    
    const monthsRange = eachMonthOfInterval({
      start: addMonths(new Date(), -6),
      end: new Date()
    });
    
    let historicalData: HistoricalConsumption[] = [];
    
    allMaterials.forEach(material => {
      monthsRange.forEach(month => {
        const baseConsumption = material.category === 'raw-material' 
          ? material.reorderLevel * (0.7 + Math.random() * 0.6) 
          : material.reorderLevel * (0.5 + Math.random() * 0.5);
        
        const recencyFactor = 1 + (monthsRange.indexOf(month) / monthsRange.length) * 0.2;
        
        const trendFactor = 1 + (monthsRange.indexOf(month) / monthsRange.length) * 0.3;
        
        const randomNoise = 0.9 + Math.random() * 0.2;
        
        const consumptionQty = Math.round(baseConsumption * recencyFactor * trendFactor * randomNoise);
        
        historicalData.push({
          materialId: material.id,
          month: format(month, 'yyyy-MM'),
          consumptionQty,
          consumptionRate: consumptionQty / 30
        });
      });
    });
    
    return historicalData;
  };
  
  const generateForecast = () => {
    const allMaterials = [...(rawMaterials || []), ...(packagingMaterials || [])];
    if (allMaterials.length === 0) {
      toast.error('لا توجد بيانات للمواد');
      return;
    }
    
    const historicalData = generateHistoricalConsumption();
    
    const forecastMonth = format(forecastDate, 'yyyy-MM');
    const forecastResults: ForecastItem[] = [];
    
    allMaterials.forEach(material => {
      const materialHistoryData = historicalData.filter(h => h.materialId === material.id);
      
      let forecastedConsumption = 0;
      
      if (materialHistoryData.length > 0) {
        const totalWeightedConsumption = materialHistoryData.reduce((sum, item, index) => {
          const weight = (index + 1) / materialHistoryData.length;
          return sum + (item.consumptionQty * weight);
        }, 0);
        
        forecastedConsumption = Math.round(totalWeightedConsumption / materialHistoryData.length * 1.1);
      } else {
        forecastedConsumption = Math.ceil(material.reorderLevel * 1.2);
      }
      
      const expectedEndQuantity = Math.max(0, material.quantity - forecastedConsumption);
      
      let status: 'ok' | 'warning' | 'critical' = 'ok';
      
      if (expectedEndQuantity <= 0) {
        status = 'critical';
      } else if (expectedEndQuantity <= material.reorderLevel) {
        status = 'warning';
      }
      
      const suggestedOrder = status !== 'ok' 
        ? Math.max(material.optimalOrderQuantity, forecastedConsumption - expectedEndQuantity)
        : 0;
      
      forecastResults.push({
        materialId: material.id,
        materialName: material.name,
        materialCode: material.code,
        unit: material.unit,
        currentQuantity: material.quantity,
        forecastedConsumption,
        suggestedOrder,
        expectedEndQuantity,
        unitCost: material.unitCost,
        totalCost: suggestedOrder * material.unitCost,
        status
      });
    });
    
    setForecastItems(forecastResults);
    toast.success('تم إنشاء التوقعات بنجاح لشهر ' + format(forecastDate, 'MMMM yyyy'));
  };
  
  useEffect(() => {
    if (!isLoadingRawMaterials && !isLoadingPackaging) {
      generateForecast();
    }
  }, [isLoadingRawMaterials, isLoadingPackaging, forecastDate]);
  
  const getFilteredItems = () => {
    return forecastItems.filter(item => {
      const matchesCategory = categoryFilter === 'all' || 
        (categoryFilter === 'raw' && item.materialId.toString().includes('raw')) ||
        (categoryFilter === 'packaging' && !item.materialId.toString().includes('raw'));
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      
      const matchesSearch = searchTerm === '' || 
        item.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.materialCode.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesCategory && matchesStatus && matchesSearch;
    });
  };
  
  const getSortedItems = () => {
    const filteredItems = getFilteredItems();
    
    return [...filteredItems].sort((a, b) => {
      if (sortConfig.key === 'materialName') {
        return sortConfig.direction === 'asc' 
          ? a.materialName.localeCompare(b.materialName)
          : b.materialName.localeCompare(a.materialName);
      } else if (sortConfig.key === 'currentQuantity') {
        return sortConfig.direction === 'asc' 
          ? a.currentQuantity - b.currentQuantity
          : b.currentQuantity - a.currentQuantity;
      } else if (sortConfig.key === 'forecastedConsumption') {
        return sortConfig.direction === 'asc' 
          ? a.forecastedConsumption - b.forecastedConsumption
          : b.forecastedConsumption - a.forecastedConsumption;
      } else if (sortConfig.key === 'suggestedOrder') {
        return sortConfig.direction === 'asc' 
          ? a.suggestedOrder - b.suggestedOrder
          : b.suggestedOrder - a.suggestedOrder;
      } else if (sortConfig.key === 'totalCost') {
        return sortConfig.direction === 'asc' 
          ? a.totalCost - b.totalCost
          : b.totalCost - a.totalCost;
      } else if (sortConfig.key === 'status') {
        const statusPriority = { 'critical': 0, 'warning': 1, 'ok': 2 };
        return sortConfig.direction === 'asc' 
          ? statusPriority[a.status] - statusPriority[b.status]
          : statusPriority[b.status] - statusPriority[a.status];
      }
      
      return 0;
    });
  };
  
  const toggleSort = (key: string) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };
  
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setForecastDate(date);
    }
  };
  
  const approveOrderSuggestion = (materialId: string) => {
    setAutoApprovedMaterials(prev => [...prev, materialId]);
    toast.success('تمت الموافقة على توصية الطلب');
  };
  
  const resetForecast = () => {
    setAutoApprovedMaterials([]);
    generateForecast();
    toast.info('تم إعادة تعيين التوقعات');
  };
  
  const saveForecast = () => {
    toast.success('تم حفظ التوقعات لشهر ' + format(forecastDate, 'MMMM yyyy'));
  };
  
  const getHistoricalConsumptionChartData = () => {
    const historicalData = generateHistoricalConsumption();
    
    const months = Array.from(new Set(historicalData.map(item => item.month))).sort();
    
    return months.map(month => {
      const monthData = historicalData.filter(item => item.month === month);
      
      const rawMaterialsConsumption = monthData
        .filter(item => item.materialId.toString().includes('raw'))
        .reduce((sum, item) => sum + item.consumptionQty, 0);
      
      const packagingConsumption = monthData
        .filter(item => !item.materialId.toString().includes('raw'))
        .reduce((sum, item) => sum + item.consumptionQty, 0);
      
      return {
        month: month,
        'المواد الخام': rawMaterialsConsumption,
        'مواد التعبئة': packagingConsumption,
        'الإجمالي': rawMaterialsConsumption + packagingConsumption
      };
    });
  };
  
  const getForecastChartData = () => {
    const materialsByCategory = {
      raw: forecastItems.filter(item => item.materialId.toString().includes('raw')),
      packaging: forecastItems.filter(item => !item.materialId.toString().includes('raw'))
    };
    
    const totalRawConsumption = materialsByCategory.raw.reduce((sum, item) => sum + item.forecastedConsumption, 0);
    const totalPackagingConsumption = materialsByCategory.packaging.reduce((sum, item) => sum + item.forecastedConsumption, 0);
    
    const currentRawStock = materialsByCategory.raw.reduce((sum, item) => sum + item.currentQuantity, 0);
    const currentPackagingStock = materialsByCategory.packaging.reduce((sum, item) => sum + item.currentQuantity, 0);
    
    const expectedRawEndStock = materialsByCategory.raw.reduce((sum, item) => sum + item.expectedEndQuantity, 0);
    const expectedPackagingEndStock = materialsByCategory.packaging.reduce((sum, item) => sum + item.expectedEndQuantity, 0);
    
    return [
      {
        name: 'المخزون الحالي',
        'المواد الخام': currentRawStock,
        'مواد التعبئة': currentPackagingStock
      },
      {
        name: 'الاستهلاك المتوقع',
        'المواد الخام': totalRawConsumption,
        'مواد التعبئة': totalPackagingConsumption
      },
      {
        name: 'المخزون المتوقع',
        'المواد الخام': expectedRawEndStock,
        'مواد التعبئة': expectedPackagingEndStock
      }
    ];
  };
  
  const getForecastCostData = () => {
    const materialsByCategory = {
      raw: forecastItems.filter(item => item.materialId.toString().includes('raw')),
      packaging: forecastItems.filter(item => !item.materialId.toString().includes('raw'))
    };
    
    const rawMaterialCost = materialsByCategory.raw.reduce((sum, item) => sum + item.totalCost, 0);
    const packagingCost = materialsByCategory.packaging.reduce((sum, item) => sum + item.totalCost, 0);
    
    return [
      { name: 'المواد الخام', value: rawMaterialCost },
      { name: 'مواد التعبئة', value: packagingCost }
    ];
  };
  
  const filteredItems = getSortedItems();
  const isLoading = isLoadingRawMaterials || isLoadingPackaging;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex flex-col">
                <Label className="mb-2">شهر التوقع</Label>
                <div className="flex gap-2">
                  <DatePicker 
                    date={forecastDate}
                    setDate={handleDateChange}
                  />
                  <Button size="icon" variant="outline" onClick={() => setForecastDate(addMonths(new Date(), 1))}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Label>تصفية البيانات</Label>
              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    <SelectItem value="raw">المواد الخام</SelectItem>
                    <SelectItem value="packaging">مواد التعبئة</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="critical">حرجة</SelectItem>
                    <SelectItem value="warning">تحذير</SelectItem>
                    <SelectItem value="ok">جيدة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative">
                <Input
                  placeholder="بحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-8"
                />
                <Filter className="absolute top-2.5 right-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 flex flex-col justify-between h-full">
            <div className="space-y-1">
              <Label>إجراءات</Label>
              <div className="text-sm text-muted-foreground">
                إنشاء وحفظ التوقعات للمواد
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={resetForecast} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                إعادة تعيين
              </Button>
              <Button onClick={saveForecast} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                حفظ التوقعات
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileBarChart className="h-5 w-5" />
              ملخص التوقعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingIndicator />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">إجمالي المواد</div>
                    <div className="text-xl font-bold mt-1">{forecastItems.length}</div>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">مواد بحاجة للطلب</div>
                    <div className="text-xl font-bold mt-1 text-amber-500">
                      {forecastItems.filter(item => item.status !== 'ok').length}
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">حالة حرجة</div>
                    <div className="text-xl font-bold mt-1 text-red-500">
                      {forecastItems.filter(item => item.status === 'critical').length}
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">إجمالي التكلفة المتوقعة</div>
                    <div className="text-xl font-bold mt-1">
                      {forecastItems.reduce((sum, item) => sum + item.totalCost, 0).toLocaleString()} ج.م
                    </div>
                  </div>
                </div>
                
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getForecastChartData()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="المواد الخام" fill="#6366F1" />
                      <Bar dataKey="مواد التعبئة" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5" />
              توقعات المواد
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingIndicator />
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد نتائج تطابق معايير البحث
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort('materialName')}
                      >
                        المادة
                        {sortConfig.key === 'materialName' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="inline h-4 w-4 ml-1" /> : <ChevronDown className="inline h-4 w-4 ml-1" />
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort('currentQuantity')}
                      >
                        المخزون الحالي
                        {sortConfig.key === 'currentQuantity' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="inline h-4 w-4 ml-1" /> : <ChevronDown className="inline h-4 w-4 ml-1" />
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort('forecastedConsumption')}
                      >
                        الاستهلاك المتوقع
                        {sortConfig.key === 'forecastedConsumption' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="inline h-4 w-4 ml-1" /> : <ChevronDown className="inline h-4 w-4 ml-1" />
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort('status')}
                      >
                        الحالة المتوقعة
                        {sortConfig.key === 'status' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="inline h-4 w-4 ml-1" /> : <ChevronDown className="inline h-4 w-4 ml-1" />
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort('suggestedOrder')}
                      >
                        كمية الطلب المقترحة
                        {sortConfig.key === 'suggestedOrder' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="inline h-4 w-4 ml-1" /> : <ChevronDown className="inline h-4 w-4 ml-1" />
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleSort('totalCost')}
                      >
                        التكلفة المتوقعة
                        {sortConfig.key === 'totalCost' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="inline h-4 w-4 ml-1" /> : <ChevronDown className="inline h-4 w-4 ml-1" />
                        )}
                      </TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.slice(0, 10).map(item => (
                      <TableRow key={item.materialId}>
                        <TableCell>
                          <div className="font-medium">{item.materialName}</div>
                          <div className="text-xs text-muted-foreground">{item.materialCode}</div>
                        </TableCell>
                        <TableCell>
                          {item.currentQuantity} {item.unit}
                        </TableCell>
                        <TableCell>
                          {item.forecastedConsumption} {item.unit}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            item.status === 'critical' ? 'destructive' :
                            item.status === 'warning' ? 'warning' : 'outline'
                          }>
                            {item.status === 'critical' ? 'حرجة' : 
                             item.status === 'warning' ? 'تحذير' : 'جيدة'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.suggestedOrder > 0 ? `${item.suggestedOrder} ${item.unit}` : '-'}
                        </TableCell>
                        <TableCell>
                          {item.totalCost > 0 ? `${item.totalCost.toLocaleString()} ج.م` : '-'}
                        </TableCell>
                        <TableCell>
                          {item.suggestedOrder > 0 && (
                            <Button
                              size="sm"
                              variant={autoApprovedMaterials.includes(item.materialId) ? "default" : "outline"}
                              onClick={() => approveOrderSuggestion(item.materialId)}
                              disabled={autoApprovedMaterials.includes(item.materialId)}
                            >
                              {autoApprovedMaterials.includes(item.materialId) ? 'تمت الموافقة' : 'موافقة'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تحليل الاستهلاك التاريخي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={getHistoricalConsumptionChartData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="المواد الخام" 
                    stroke="#6366F1" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="مواد التعبئة" 
                    stroke="#F59E0B" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="الإجمالي" 
                    stroke="#10b981" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">توزيع تكاليف المواد المتوقعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getForecastCostData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" />
                  <Tooltip formatter={(value) => [`${value.toLocaleString()} ج.م`, 'التكلفة المتوقعة']} />
                  <Legend />
                  <Bar dataKey="value" fill="#8B5CF6" name="التكلفة المتوقعة" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 text-center">
              <div className="text-sm text-muted-foreground">إجمالي التكلفة المتوقعة للطلبات</div>
              <div className="text-xl font-bold mt-1">
                {forecastItems.reduce((sum, item) => sum + item.totalCost, 0).toLocaleString()} ج.م
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MaterialsForecasting;
