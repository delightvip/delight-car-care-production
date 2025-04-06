
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Truck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

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
  importance?: number;
}

interface ProductOverviewTabProps {
  product: ProductData;
}

const ProductOverviewTab: React.FC<ProductOverviewTabProps> = ({ product }) => {
  // Prepare chart data
  const pieData = [
    { name: 'الكمية الحالية', value: product.quantity || 0, color: '#3b82f6' },
    { name: 'الحد الأدنى', value: product.min_stock || 0, color: '#f59e0b' }
  ];

  return (
    <div className="mt-6">
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
              {product.importance !== undefined && (
                <div>
                  <dt className="text-muted-foreground">الأهمية</dt>
                  <dd className="font-medium">
                    {product.importance === 0 ? 'منخفضة' : 
                     product.importance === 1 ? 'متوسطة' : 'عالية'}
                  </dd>
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
                  <a href={`/commercial/parties/${product.supplier_id}`} className="text-primary hover:underline">
                    {product.supplier_name || 'المورد'}
                  </a>
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
      
      <div className="mt-6">
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
                      : 'المخزون منخفض!'}
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
                    'غير محدد'}
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
    </div>
  );
};

export default ProductOverviewTab;
