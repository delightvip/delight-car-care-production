
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
  Info,
  ArrowUp,
  ArrowDown
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
import { InventoryMovement } from '@/types/inventoryTypes';

interface ProductData {
  id: number | string;
  code?: string;
  name?: string;
  unit?: string;
  quantity?: number;
  min_stock?: number;
  unit_cost?: number;
  cost_price?: number;
  sale_price?: number;
  description?: string;
  supplier_id?: string;
  supplier_name?: string;
  created_at?: string;
  updated_at?: string;
}

const ProductDetails = () => {
  const { id, type } = useParams<{ id: string; type: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const productTitle: Record<string, string> = {
    'raw-materials': 'المواد الخام',
    'packaging': 'مواد التغليف',
    'semi-finished': 'المنتجات النصف مصنعة',
    'finished-products': 'المنتجات النهائية'
  };
  
  const tableMapping: Record<string, string> = {
    'raw-materials': 'raw_materials',
    'packaging': 'packaging_materials',
    'semi-finished': 'semi_finished_products',
    'finished-products': 'finished_products'
  };
  
  const tableName = tableMapping[type as keyof typeof tableMapping] || 'raw_materials';
  
  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ['product', tableName, id],
    queryFn: async () => {
      // Use different approach based on the tableName value
      if (tableName === 'raw_materials') {
        const { data, error } = await supabase
          .from('raw_materials')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data as ProductData;
      } else if (tableName === 'packaging_materials') {
        const { data, error } = await supabase
          .from('packaging_materials')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data as ProductData;
      } else if (tableName === 'semi_finished_products') {
        const { data, error } = await supabase
          .from('semi_finished_products')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data as ProductData;
      } else if (tableName === 'finished_products') {
        const { data, error } = await supabase
          .from('finished_products')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data as ProductData;
      } else {
        throw new Error('Invalid product type');
      }
    }
  });
  
  const { data: movements } = useQuery<InventoryMovement[]>({
    queryKey: ['product-movements', tableName, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*, users(name)')
        .eq('item_id', id)
        .eq('item_type', tableName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as InventoryMovement[];
    },
    enabled: !!id && !!tableName
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
      // Use different approach based on the tableName value
      if (tableName === 'raw_materials') {
        const { error } = await supabase
          .from('raw_materials')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
      } else if (tableName === 'packaging_materials') {
        const { error } = await supabase
          .from('packaging_materials')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
      } else if (tableName === 'semi_finished_products') {
        const { error } = await supabase
          .from('semi_finished_products')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
      } else if (tableName === 'finished_products') {
        const { error } = await supabase
          .from('finished_products')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
      } else {
        throw new Error('Invalid product type');
      }
      
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
  
  const isLowStock = product.quantity && product.min_stock ? product.quantity <= product.min_stock : false;
  
  // Prepare chart data
  const pieData = [
    { name: 'الكمية الحالية', value: product.quantity || 0, color: '#3b82f6' },
    { name: 'الحد الأدنى', value: product.min_stock || 0, color: '#f59e0b' }
  ];
  
  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Breadcrumb>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/inventory/${type}`}>
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
            <Button variant="outline" className="gap-2">
              <Link to={`/inventory/${type}/edit/${id}`} className="flex items-center gap-1">
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
                            <dd className="font-medium">{product.cost_price || product.unit_cost} ج.م</dd>
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
                            labelLine={false}
                            outerRadius={80}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [`${value} ${product.unit}`, '']} 
                            labelFormatter={(name) => name}
                          />
                          <Legend 
                            layout="horizontal" 
                            verticalAlign="bottom" 
                            align="center"
                            formatter={(value) => <span className="text-sm">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">حالة المخزون</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className="mt-2">
                            <h4 className="text-lg font-medium">الكمية الحالية</h4>
                            <p className="text-3xl font-bold text-primary">
                              {product.quantity} {product.unit}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {product.quantity && product.min_stock && product.quantity > product.min_stock * 2 
                                ? 'المخزون في حالة جيدة' 
                                : product.quantity > product.min_stock 
                                  ? 'يجب متابعة المخزون' 
                                  : 'المخزون منخفض!'
                              }
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className="mt-2">
                            <h4 className="text-lg font-medium">الحد الأدنى</h4>
                            <p className="text-3xl font-bold text-amber-500">
                              {product.min_stock} {product.unit}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {product.quantity && product.min_stock ? 
                                `${Math.round((product.quantity / product.min_stock) * 100)}% من الحد الأدنى` : 
                                'غير محدد'
                              }
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className="mt-2">
                            <h4 className="text-lg font-medium">القيمة الإجمالية</h4>
                            <p className="text-3xl font-bold text-green-600">
                              {product.quantity && (product.cost_price || product.unit_cost) ? 
                                `${(product.quantity * (product.cost_price || product.unit_cost || 0)).toLocaleString('ar-EG')}` : 
                                '0'} ج.م
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              القيمة الإجمالية للمخزون
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className="mt-2">
                            <h4 className="text-lg font-medium">تاريخ الإضافة</h4>
                            <p className="text-xl font-bold">
                              {product.created_at ? new Date(product.created_at).toLocaleDateString('ar-EG') : 'غير محدد'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              آخر تحديث: {product.updated_at ? new Date(product.updated_at).toLocaleDateString('ar-EG') : 'غير محدد'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="stats" className="mt-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>إحصائيات المخزون</CardTitle>
                        <CardDescription>تحليل بيانات المخزون والاستهلاك</CardDescription>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={usageStats}
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`${value} ${product.unit}`, 'الكمية']} />
                            <Legend />
                            <Bar dataKey="amount" name="الاستهلاك الشهري" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="history" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>سجل حركة المخزون</CardTitle>
                      <CardDescription>جميع العمليات التي تمت على هذا العنصر</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ProductMovementHistory itemId={id} itemType={tableName} />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="usage" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>معدلات الاستخدام</CardTitle>
                      <CardDescription>تحليل معدلات استخدام المنتج</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={usageStats}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} ${product.unit}`, 'الكمية']} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="amount"
                            name="معدل الاستخدام"
                            stroke="#10b981"
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <div className="col-span-1 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">ملخص المنتج</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">الكود</span>
                  <span className="font-medium">{product.code}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">المخزون الحالي</span>
                  <span className="font-medium">{product.quantity} {product.unit}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">الحد الأدنى</span>
                  <span className="font-medium">{product.min_stock} {product.unit}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">التكلفة</span>
                  <span className="font-medium">{product.cost_price || product.unit_cost} ج.م</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">آخر الحركات</CardTitle>
              </CardHeader>
              <CardContent>
                {movements && movements.length > 0 ? (
                  <div className="space-y-3">
                    {movements.slice(0, 5).map((movement) => {
                      const getTypeIcon = (type: string) => {
                        switch (type) {
                          case 'in':
                            return <ArrowUp className="h-4 w-4 text-green-500" />;
                          case 'out':
                            return <ArrowDown className="h-4 w-4 text-red-500" />;
                          case 'adjustment':
                            return <RefreshCw className="h-4 w-4 text-amber-500" />;
                          default:
                            return <Info className="h-4 w-4" />;
                        }
                      };
                      
                      return (
                        <div key={movement.id} className="flex items-start space-x-2 space-x-reverse rtl:space-x-reverse">
                          <div className="p-2 rounded-full bg-muted">
                            {getTypeIcon(movement.movement_type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {movement.movement_type === 'in' ? 'إضافة للمخزون' : 
                               movement.movement_type === 'out' ? 'خصم من المخزون' : 'تعديل المخزون'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {movement.quantity} {product.unit} · {new Date(movement.created_at).toLocaleDateString('ar-EG')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    لا توجد حركات مخزون لهذا المنتج
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد الحذف</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من رغبتك في حذف هذا العنصر؟ هذا الإجراء لا يمكن التراجع عنه.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>إلغاء</Button>
              <Button variant="destructive" onClick={handleDelete}>حذف</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default ProductDetails;
