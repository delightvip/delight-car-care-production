import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  ArrowUpDown, 
  Calendar, 
  Clock, 
  Edit, 
  Info, 
  Package, 
  Truck, 
  History,
  BarChart3,
  Link as LinkIcon,
  Layers
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { InventoryMovement } from '@/types/inventoryTypes';
import MovementHistoryTable from './MovementHistoryTable';
import ProductUsageStats from './ProductUsageStats';
import RelatedProductsTable from './RelatedProductsTable';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import QRCode from 'react-qr-code';

export interface ProductDetailsViewProps {
  product: any;
  productType: string;
  tableName: string;
  movements: InventoryMovement[];
  usageStats: any[];
  relatedProducts: any[];
}

const ProductDetailsView: React.FC<ProductDetailsViewProps> = ({
  product,
  productType,
  tableName,
  movements,
  usageStats,
  relatedProducts
}) => {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-xl font-medium">لم يتم العثور على المنتج</h3>
        <p className="text-muted-foreground mt-2">المنتج غير موجود أو تم حذفه</p>
      </div>
    );
  }
  
  const getStockStatusBadge = () => {
    if (!product.min_stock) return null;
    
    if (product.quantity <= 0) {
      return <Badge variant="destructive" className="mr-2">نفذت الكمية</Badge>;
    } else if (product.quantity < product.min_stock) {
      return <Badge variant="destructive" className="mr-2">مخزون منخفض</Badge>;
    } else if (product.quantity < product.min_stock * 1.5) {
      return <Badge variant="warning" className="mr-2">مخزون متوسط</Badge>;
    } else {
      return <Badge variant="success" className="mr-2">مخزون جيد</Badge>;
    }
  };
  
  const getProductTypeLabel = () => {
    switch (productType) {
      case 'raw':
        return 'مادة خام';
      case 'packaging':
        return 'مستلزم تعبئة';
      case 'semi':
        return 'منتج نصف مصنع';
      case 'finished':
        return 'منتج نهائي';
      default:
        return 'منتج';
    }
  };
  
  const getProductTypeColor = () => {
    switch (productType) {
      case 'raw':
        return 'bg-blue-100 text-blue-800';
      case 'packaging':
        return 'bg-green-100 text-green-800';
      case 'semi':
        return 'bg-purple-100 text-purple-800';
      case 'finished':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getImportanceLabel = () => {
    if (product.importance === undefined || product.importance === null) return null;
    
    switch (product.importance) {
      case 1:
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">أساسي</Badge>;
      case 2:
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">مهم</Badge>;
      case 3:
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">عادي</Badge>;
      default:
        return null;
    }
  };
  
  const getLastMovementInfo = () => {
    if (!movements || movements.length === 0) {
      return <span className="text-muted-foreground">لا توجد حركات سابقة</span>;
    }
    
    const lastMovement = movements[0];
    const timeAgo = formatDistanceToNow(new Date(lastMovement.created_at), { 
      addSuffix: true,
      locale: ar
    });
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{timeAgo}</span>
        <Badge variant={lastMovement.movement_type === 'addition' ? 'success' : 'destructive'}>
          {lastMovement.movement_type === 'addition' ? 'إضافة' : 'سحب'}
        </Badge>
        <span>{lastMovement.quantity} {product.unit}</span>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <Badge className={getProductTypeColor()}>{getProductTypeLabel()}</Badge>
            {getStockStatusBadge()}
          </div>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <span className="font-mono">{product.code}</span>
            {getImportanceLabel()}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/inventory/${tableName}/edit/${product.id}`}>
              <Edit className="h-4 w-4 mr-1" />
              تعديل
            </Link>
          </Button>
          
          <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <LinkIcon className="h-4 w-4 mr-1" />
                QR Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>رمز QR للمنتج</DialogTitle>
                <DialogDescription>
                  يمكنك مسح هذا الرمز للوصول السريع إلى صفحة المنتج
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center p-4">
                <QRCode 
                  value={window.location.href} 
                  size={200}
                  className="mb-4"
                />
                <div className="text-center">
                  <p className="font-bold">{product.name}</p>
                  <p className="text-muted-foreground text-sm">{product.code}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Package className="h-4 w-4 mr-2" />
              معلومات المخزون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الكمية الحالية</span>
                <span className="font-medium">{product.quantity} {product.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الحد الأدنى</span>
                <span>{product.min_stock} {product.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تكلفة الوحدة</span>
                <span>{product.unit_cost?.toFixed(2) || 'غير محدد'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">القيمة الإجمالية</span>
                <span className="font-medium">
                  {product.quantity && product.unit_cost 
                    ? (product.quantity * product.unit_cost).toFixed(2) 
                    : 'غير محدد'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <History className="h-4 w-4 mr-2" />
              آخر تحديث
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">آخر حركة</span>
                {getLastMovementInfo()}
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ التحديث</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {product.updated_at 
                      ? format(new Date(product.updated_at), 'yyyy/MM/dd', { locale: ar })
                      : 'غير محدد'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">وقت التحديث</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {product.updated_at 
                      ? format(new Date(product.updated_at), 'hh:mm a', { locale: ar })
                      : 'غير محدد'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center">
              <Info className="h-4 w-4 mr-2" />
              معلومات إضافية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {productType === 'raw' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المورد الرئيسي</span>
                    <span>{product.main_supplier || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الأهمية</span>
                    <span>
                      {product.importance === 1 && 'أساسي'}
                      {product.importance === 2 && 'مهم'}
                      {product.importance === 3 && 'عادي'}
                      {(!product.importance && product.importance !== 0) && 'غير محدد'}
                    </span>
                  </div>
                </>
              )}
              
              {productType === 'packaging' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المورد الرئيسي</span>
                    <span>{product.main_supplier || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الأهمية</span>
                    <span>
                      {product.importance === 1 && 'أساسي'}
                      {product.importance === 2 && 'مهم'}
                      {product.importance === 3 && 'عادي'}
                      {(!product.importance && product.importance !== 0) && 'غير محدد'}
                    </span>
                  </div>
                </>
              )}
              
              {productType === 'semi' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">عدد المكونات</span>
                  <span>{product.components_count || 'غير محدد'}</span>
                </div>
              )}
              
              {productType === 'finished' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المنتج نصف المصنع</span>
                    <span>{product.semi_finished_name || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">كمية المنتج نصف المصنع</span>
                    <span>{product.semi_finished_quantity || 'غير محدد'}</span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ الإنشاء</span>
                <span>
                  {product.created_at 
                    ? format(new Date(product.created_at), 'yyyy/MM/dd', { locale: ar })
                    : 'غير محدد'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="movements" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="movements" className="flex items-center gap-1">
            <ArrowUpDown className="h-4 w-4" />
            <span>سجل الحركات</span>
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span>إحصائيات الاستخدام</span>
          </TabsTrigger>
          <TabsTrigger value="related" className="flex items-center gap-1">
            <Layers className="h-4 w-4" />
            <span>المنتجات المرتبطة</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="movements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>سجل حركات المخزون</CardTitle>
              <CardDescription>
                جميع عمليات الإضافة والسحب للمنتج
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <MovementHistoryTable movements={movements} />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="usage" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>إحصائيات الاستخدام</CardTitle>
              <CardDescription>
                معلومات حول استخدام المنتج في عمليات الإنتاج
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductUsageStats stats={usageStats} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="related" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>المنتجات المرتبطة</CardTitle>
              <CardDescription>
                المنتجات التي ترتبط بهذا المنتج في عمليات الإنتاج
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RelatedProductsTable products={relatedProducts} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductDetailsView;
