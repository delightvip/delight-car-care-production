
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  AlertCircle, 
  ArrowUpDown,
  Edit,
  LineChart,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InventoryItem, InventoryMovement } from '@/types/inventoryTypes';
import ProductMovementHistory from './ProductMovementHistory';

interface ProductDetailsViewProps {
  product: InventoryItem;
  movements: InventoryMovement[];
  isLoading: boolean;
  onEditClick: () => void;
}

const ProductDetailsView: React.FC<ProductDetailsViewProps> = ({ 
  product, 
  movements, 
  isLoading, 
  onEditClick 
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل بيانات المنتج...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>خطأ</AlertTitle>
        <AlertDescription>
          لم يتم العثور على المنتج المطلوب، أو حدث خطأ أثناء تحميل البيانات.
        </AlertDescription>
      </Alert>
    );
  }

  const stockLevel = (product.quantity / product.min_stock) * 100;
  const stockStatus = 
    product.quantity <= 0 ? 'out-of-stock' :
    product.quantity < product.min_stock ? 'low' : 'normal';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{product.name}</h2>
          <p className="text-muted-foreground">كود: {product.code}</p>
        </div>
        <Button onClick={onEditClick}>
          <Edit className="mr-2 h-4 w-4" /> تعديل المنتج
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">الكمية المتاحة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product.quantity} {product.unit}</div>
            <div className="mt-2">
              <Progress value={stockLevel > 100 ? 100 : stockLevel} className="h-2" />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">الحد الأدنى: {product.min_stock} {product.unit}</span>
                <Badge variant={
                  stockStatus === 'out-of-stock' ? 'destructive' : 
                  stockStatus === 'low' ? 'warning' : 'default'
                }>
                  {stockStatus === 'out-of-stock' ? 'نفذت الكمية' : 
                   stockStatus === 'low' ? 'منخفض' : 'متوفر'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">سعر الوحدة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product.unit_cost?.toFixed(2) || '0.00'}</div>
            <div className="text-xs text-muted-foreground mt-1">آخر تحديث: {
              product.updated_at ? format(new Date(product.updated_at), 'yyyy-MM-dd') : 'غير متوفر'
            }</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">تاريخ الإضافة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{
              product.created_at ? format(new Date(product.created_at), 'yyyy-MM-dd') : 'غير متوفر'
            }</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">التفاصيل</TabsTrigger>
          <TabsTrigger value="movements">سجل الحركات</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معلومات المنتج</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">الاسم</TableCell>
                    <TableCell>{product.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">الكود</TableCell>
                    <TableCell>{product.code}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">الوحدة</TableCell>
                    <TableCell>{product.unit}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">الكمية</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">الحد الأدنى</TableCell>
                    <TableCell>{product.min_stock}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">التكلفة</TableCell>
                    <TableCell>{product.unit_cost?.toFixed(2) || '0.00'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="movements">
          <ProductMovementHistory movements={movements} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductDetailsView;
