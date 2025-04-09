
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Search, Download, Filter, Package, AlertTriangle, ShoppingCart, TrendingUp, Layers, Package2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import InventoryService from '@/services/InventoryService';
import { toast } from 'sonner';
import { exportToCSV } from '@/utils/exportUtils';

interface MaterialItem {
  code: string;
  name: string;
  quantity: number;
  unit: string;
  min_stock: number;
  status: 'normal' | 'low' | 'critical';
  importance: string;
  usageRate: number;
  lastUsed?: Date;
  alternatives?: string[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const MaterialsRequirements = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [materialType, setMaterialType] = useState<'raw' | 'packaging' | 'semi-finished'>('raw');
  const [loading, setLoading] = useState<boolean>(true);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<MaterialItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'low' | 'critical'>('all');
  const [importanceFilter, setImportanceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    fetchMaterials();
  }, [materialType]);

  useEffect(() => {
    filterMaterials();
  }, [materials, searchTerm, statusFilter, importanceFilter]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const inventoryService = InventoryService.getInstance();
      let fetchedMaterials: any[] = [];

      if (materialType === 'raw') {
        fetchedMaterials = await inventoryService.getRawMaterials();
      } else if (materialType === 'packaging') {
        fetchedMaterials = await inventoryService.getPackagingMaterials();
      } else {
        fetchedMaterials = await inventoryService.getSemiFinishedProducts();
      }

      // تحويل البيانات إلى الشكل المطلوب
      const formattedMaterials = fetchedMaterials.map(item => {
        // حساب حالة المخزون
        let status: 'normal' | 'low' | 'critical' = 'normal';
        if (item.quantity <= item.min_stock * 0.5) {
          status = 'critical';
        } else if (item.quantity <= item.min_stock) {
          status = 'low';
        }

        // إضافة معدل استهلاك افتراضي للعرض
        const usageRate = Math.random() * 10;

        return {
          code: item.code,
          name: item.name,
          quantity: item.quantity || 0,
          unit: item.unit,
          min_stock: item.min_stock || 0,
          status,
          importance: item.importance || 'medium',
          usageRate: parseFloat(usageRate.toFixed(2)),
          lastUsed: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
          alternatives: []
        };
      });

      setMaterials(formattedMaterials);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('حدث خطأ أثناء جلب بيانات المواد');
    } finally {
      setLoading(false);
    }
  };

  const filterMaterials = () => {
    let filtered = [...materials];

    // تطبيق البحث
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // تطبيق فلتر الحالة
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // تطبيق فلتر الأهمية
    if (importanceFilter !== 'all') {
      filtered = filtered.filter(item => item.importance === importanceFilter);
    }

    setFilteredMaterials(filtered);
  };

  const exportMaterialsData = () => {
    try {
      const dataToExport = filteredMaterials.map(item => ({
        'الكود': item.code,
        'الاسم': item.name,
        'الكمية الحالية': item.quantity,
        'الوحدة': item.unit,
        'الحد الأدنى': item.min_stock,
        'الحالة': item.status === 'normal' ? 'عادي' : item.status === 'low' ? 'منخفض' : 'حرج',
        'الأهمية': item.importance === 'high' ? 'عالية' : item.importance === 'medium' ? 'متوسطة' : 'منخفضة',
        'معدل الاستهلاك': item.usageRate
      }));

      const fileName = materialType === 'raw' ? 'المواد_الخام_المطلوبة' : 
                     materialType === 'packaging' ? 'مواد_التعبئة_المطلوبة' : 
                     'المنتجات_نصف_المصنعة_المطلوبة';

      exportToCSV(dataToExport, fileName);
      toast.success('تم تصدير البيانات بنجاح');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات');
    }
  };

  // حساب إحصائيات للرسوم البيانية
  const getStatusChartData = () => {
    const counts = { normal: 0, low: 0, critical: 0 };
    materials.forEach(item => counts[item.status]++);
    
    return [
      { name: 'عادي', value: counts.normal },
      { name: 'منخفض', value: counts.low },
      { name: 'حرج', value: counts.critical }
    ];
  };

  const getCriticalMaterials = () => {
    return materials.filter(item => item.status === 'critical');
  };

  const getLowMaterials = () => {
    return materials.filter(item => item.status === 'low');
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('ar-EG', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              مواد في الحالة الحرجة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getCriticalMaterials().length}</div>
            <Progress 
              value={materials.length ? (getCriticalMaterials().length / materials.length) * 100 : 0} 
              className="h-2 mt-2"
              indicatorClassName="bg-red-500"
            />
            <div className="text-xs text-muted-foreground mt-2">
              {materials.length 
                ? `${Math.round((getCriticalMaterials().length / materials.length) * 100)}% من إجمالي المواد` 
                : '0% من إجمالي المواد'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShoppingCart className="h-4 w-4 text-amber-500" />
              مواد منخفضة المخزون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getLowMaterials().length}</div>
            <Progress 
              value={materials.length ? (getLowMaterials().length / materials.length) * 100 : 0} 
              className="h-2 mt-2"
              indicatorClassName="bg-amber-500"
            />
            <div className="text-xs text-muted-foreground mt-2">
              {materials.length 
                ? `${Math.round((getLowMaterials().length / materials.length) * 100)}% من إجمالي المواد` 
                : '0% من إجمالي المواد'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-green-500" />
              القيمة التقديرية المطلوبة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(
                [...getCriticalMaterials(), ...getLowMaterials()].reduce(
                  (sum, item) => sum + ((item.min_stock - item.quantity) * (item.usageRate || 0)), 
                  0
                )
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              تكلفة تقديرية لشراء المواد الناقصة
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>متطلبات المواد</CardTitle>
            <CardDescription>
              تحليل احتياجات المواد المطلوبة للإنتاج
            </CardDescription>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <TabsList>
                <TabsTrigger 
                  value="raw" 
                  onClick={() => setMaterialType('raw')}
                  className={materialType === 'raw' ? "bg-primary text-white" : ""}
                >
                  <Package className="h-4 w-4 mr-2" />
                  المواد الخام
                </TabsTrigger>
                <TabsTrigger 
                  value="packaging" 
                  onClick={() => setMaterialType('packaging')}
                  className={materialType === 'packaging' ? "bg-primary text-white" : ""}
                >
                  <Package2 className="h-4 w-4 mr-2" />
                  مواد التعبئة
                </TabsTrigger>
                <TabsTrigger 
                  value="semi-finished" 
                  onClick={() => setMaterialType('semi-finished')}
                  className={materialType === 'semi-finished' ? "bg-primary text-white" : ""}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  نصف مصنعة
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن مادة..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select 
                    value={statusFilter} 
                    onValueChange={(value) => setStatusFilter(value as any)}
                  >
                    <SelectTrigger className="w-[130px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="normal">عادي</SelectItem>
                      <SelectItem value="low">منخفض</SelectItem>
                      <SelectItem value="critical">حرج</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select 
                    value={importanceFilter} 
                    onValueChange={(value) => setImportanceFilter(value as any)}
                  >
                    <SelectTrigger className="w-[130px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="الأهمية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأهميات</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="low">منخفضة</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={exportMaterialsData}
                    title="تصدير البيانات"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredMaterials.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>لا توجد مواد تطابق معايير البحث</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredMaterials.map(item => (
                    <Card key={item.code} className="p-3">
                      <div className="flex flex-col sm:flex-row justify-between gap-2">
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-xs text-muted-foreground">{item.code}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <Badge 
                            variant={
                              item.status === 'normal' ? 'default' : 
                              item.status === 'low' ? 'outline' : 'destructive'
                            }
                          >
                            {item.status === 'normal' ? 'عادي' : 
                             item.status === 'low' ? 'منخفض' : 'حرج'}
                          </Badge>
                          <Badge variant="outline">
                            {item.importance === 'high' ? 'عالية' : 
                             item.importance === 'medium' ? 'متوسطة' : 'منخفضة'}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">الكمية:</span>{' '}
                          <span className="font-medium">{item.quantity} {item.unit}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">الحد الأدنى:</span>{' '}
                          <span className="font-medium">{item.min_stock} {item.unit}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">معدل الاستهلاك:</span>{' '}
                          <span className="font-medium">{item.usageRate} {item.unit}/شهر</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">آخر استخدام:</span>{' '}
                          <span className="font-medium">
                            {item.lastUsed ? item.lastUsed.toLocaleDateString('ar-EG') : 'غير متوفر'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1">
                        <Progress 
                          value={(item.quantity / Math.max(item.min_stock * 2, 0.1)) * 100} 
                          className="h-1.5" 
                          indicatorClassName={
                            item.status === 'normal' ? 'bg-green-500' : 
                            item.status === 'low' ? 'bg-amber-500' : 'bg-red-500'
                          }
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              إجمالي العناصر: {filteredMaterials.length} من أصل {materials.length}
            </p>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>إحصائيات المواد</CardTitle>
            <CardDescription>
              تحليل مرئي لحالة المواد
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getStatusChartData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getStatusChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">توزيع حالات المواد</h3>
              <div className="space-y-2">
                {[
                  { label: 'عادي', color: COLORS[0], status: 'normal' },
                  { label: 'منخفض', color: COLORS[1], status: 'low' },
                  { label: 'حرج', color: COLORS[2], status: 'critical' }
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span>{item.label}</span>
                    </div>
                    <span className="font-medium">
                      {materials.filter(m => m.status === item.status).length}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">إجراءات مقترحة</h3>
              <div className="space-y-1 text-sm">
                {getCriticalMaterials().length > 0 && (
                  <p className="text-red-500">• يجب شراء {getCriticalMaterials().length} مادة بشكل عاجل</p>
                )}
                {getLowMaterials().length > 0 && (
                  <p className="text-amber-600">• يجب التخطيط لشراء {getLowMaterials().length} مادة قريباً</p>
                )}
                {getCriticalMaterials().length === 0 && getLowMaterials().length === 0 && (
                  <p className="text-green-600">• جميع المواد متوفرة بكميات كافية</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MaterialsRequirements;
