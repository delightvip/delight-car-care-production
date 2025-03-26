
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { 
  ArrowLeft,
  Package,
  BarChart3,
  History,
  TrendingUp,
  AlertTriangle,
  Truck,
  Edit,
  Trash2,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell
} from 'recharts';
import ProductMovementHistory from '@/components/inventory/ProductMovementHistory';

const ProductDetails = () => {
  const { id, type } = useParams<{ id: string; type: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const productTitle = {
    'raw-materials': 'المواد الخام',
    'packaging': 'مواد التغليف',
    'semi-finished': 'المنتجات النصف مصنعة',
    'finished-products': 'المنتجات النهائية'
  };
  
  const tableMapping = {
    'raw-materials': 'raw_materials',
    'packaging': 'packaging_materials',
    'semi-finished': 'semi_finished_products',
    'finished-products': 'finished_products'
  };
  
  const tableName = tableMapping[type as keyof typeof tableMapping] || 'raw_materials';
  
  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ['product', tableName, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });
  
  const { data: movements, isLoading: isLoadingMovements } = useQuery({
    queryKey: ['product-movements', tableName, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('item_id', id)
        .eq('item_type', tableName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
  
  const { data: usageStats } = useQuery({
    queryKey: ['product-usage', tableName, id],
    queryFn: async () => {
      // This is a mock function - in a real app, you would query the database for actual usage data
      return [
        { month: 'يناير', amount: Math.floor(Math.random() * 100) },
        { month: 'فبراير', amount: Math.floor(Math.random() * 100) },
        { month: 'مارس', amount: Math.floor(Math.random() * 100) },
        { month: 'أبريل', amount: Math.floor(Math.random() * 100) },
        { month: 'مايو', amount: Math.floor(Math.random() * 100) },
        { month: 'يونيو', amount: Math.floor(Math.random() * 100) },
      ];
    }
  });
  
  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('تم حذف العنصر بنجاح');
      navigate(`/inventory/${type}`);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('حدث خطأ أثناء محاولة حذف العنصر');
    } finally {
      setShowDeleteDialog(false);
    }
  };
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="animate-spin h-12 w-12 text-primary" />
        </div>
      </PageTransition>
    );
  }
  
  if (error || !product) {
    return (
      <PageTransition>
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium">حدث خطأ أثناء تحميل البيانات</h3>
          <p className="text-muted-foreground mt-2 mb-4">لم نتمكن من العثور على المنتج المطلوب</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            العودة
          </Button>
        </div>
      </PageTransition>
    );
  }
  
  const isLowStock = product.quantity <= product.min_stock;
  
  // Prepare chart data
  const pieData = [
    { name: 'الكمية الحالية', value: product.quantity, color: '#3b82f6' },
    { name: 'الحد الأدنى', value: product.min_stock, color: '#f59e0b' }
  ];
  
  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Breadcrumb>
              <BreadcrumbItem>
                <BreadcrumbLink as={Link} to="/">الرئيسية</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink as={Link} to={`/inventory/${type}`}>
                  {productTitle[type as keyof typeof productTitle]}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink>
                  {product.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            <h1 className="text-3xl font-bold mt-2">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isLowStock ? "destructive" : "outline"}>
                {isLowStock ? 'مخزون منخفض' : 'المخزون متاح'}
              </Badge>
              <Badge variant="outline" className="bg-primary/10">
                الكود: {product.code}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to={`/inventory/${type}/edit/${id}`}>
                <Edit className="h-4 w-4" />
                تعديل
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              حذف
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="col-span-1 md:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">تفاصيل المنتج</CardTitle>
              <CardDescription>جميع المعلومات الأساسية للمنتج</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview" className="gap-2">
                    <Package className="h-4 w-4" />
                    <span>نظرة عامة</span>
                  </TabsTrigger>
                  <TabsTrigger value="stats" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>إحصائيات</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-2">
                    <History className="h-4 w-4" />
                    <span>سجل الحركة</span>
                  </TabsTrigger>
                  <TabsTrigger value="usage" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>الاستخدام</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium">معلومات أساسية</h3>
                        <Separator className="my-2" />
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <dt className="text-muted-foreground">الاسم</dt>
                            <dd className="font-medium">{product.name}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">الكود</dt>
                            <dd className="font-medium">{product.code}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">المخزون الحالي</dt>
                            <dd className="font-medium">{product.quantity} {product.unit}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">الحد الأدنى</dt>
                            <dd className="font-medium">{product.min_stock} {product.unit}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">التكلفة</dt>
                            <dd className="font-medium">{product.cost_price} ج.م</dd>
                          </div>
                          {product.sale_price && (
                            <div>
                              <dt className="text-muted-foreground">سعر البيع</dt>
                              <dd className="font-medium">{product.sale_price} ج.م</dd>
                            </div>
                          )}
                          <div className="col-span-2">
                            <dt className="text-muted-foreground">الوصف</dt>
                            <dd className="font-medium">{product.description || 'لا يوجد وصف'}</dd>
                          </div>
                        </dl>
                      </div>
                      
                      {product.supplier_id && (
                        <div>
                          <h3 className="text-lg font-medium">معلومات المورد</h3>
                          <Separator className="my-2" />
                          <div className="flex items-center gap-3">
                            <Truck className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <Link to={`/commercial/parties/${product.supplier_id}`} className="text-primary hover:underline">
                                {product.supplier_name || 'المورد'}
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="h-64">
                      <h3 className="text-lg font-medium mb-4">تحليل المخزون</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="stats" className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">تغيرات المخزون</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={movements?.slice(0, 10).map(m => ({
                                date: new Date(m.created_at).toLocaleDateString('ar-EG'),
                                amount: m.quantity,
                                type: m.movement_type
                              })).reverse()}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">احصائيات الحركة</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[
                                { name: 'وارد', value: movements?.filter(m => m.movement_type === 'in').length || 0 },
                                { name: 'صادر', value: movements?.filter(m => m.movement_type === 'out').length || 0 },
                                { name: 'تسوية', value: movements?.filter(m => m.movement_type === 'adjustment').length || 0 }
                              ]}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill="#82ca9d" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="history" className="mt-6">
                  <ProductMovementHistory itemId={id} itemType={tableName} />
                </TabsContent>
                
                <TabsContent value="usage" className="mt-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">استخدام المنتج خلال الأشهر السابقة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={usageStats}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="amount"
                              stroke="#8884d8"
                              activeDot={{ r: 8 }}
                              name="كمية الاستخدام"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">المخزون الحالي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-center my-4">
                  {product.quantity}
                  <span className="text-sm font-normal text-muted-foreground mr-1">
                    {product.unit}
                  </span>
                </div>
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                    <div 
                      style={{ 
                        width: `${Math.min(100, (product.quantity / Math.max(product.min_stock * 2, 1)) * 100)}%` 
                      }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        product.quantity <= product.min_stock 
                          ? 'bg-destructive' 
                          : product.quantity <= product.min_stock * 1.5 
                          ? 'bg-warning' 
                          : 'bg-success'
                      }`}
                    ></div>
                  </div>
                </div>
                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    الحد الأدنى: {product.min_stock} {product.unit}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">الإجراءات السريعة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start gap-2" asChild>
                  <Link to={`/inventory/movements/add?itemId=${id}&itemType=${tableName}&movementType=in`}>
                    <TrendingUp className="h-4 w-4" />
                    إضافة وارد
                  </Link>
                </Button>
                <Button className="w-full justify-start gap-2" variant="secondary" asChild>
                  <Link to={`/inventory/movements/add?itemId=${id}&itemType=${tableName}&movementType=out`}>
                    <TrendingUp className="h-4 w-4 rotate-180" />
                    صرف كمية
                  </Link>
                </Button>
                <Button className="w-full justify-start gap-2" variant="outline" asChild>
                  <Link to={`/inventory/movements/add?itemId=${id}&itemType=${tableName}&movementType=adjustment`}>
                    <RefreshCw className="h-4 w-4" />
                    تسوية مخزون
                  </Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  <span>معلومات إضافية</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                  <span>{new Date(product.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">آخر تحديث:</span>
                  <span>{new Date(product.updated_at).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تكلفة المخزون:</span>
                  <span className="font-medium">{(product.quantity * product.cost_price).toFixed(2)} ج.م</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

export default ProductDetails;
