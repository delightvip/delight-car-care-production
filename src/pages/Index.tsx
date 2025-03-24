
import React from 'react';
import { Link } from 'react-router-dom';
import PageTransition from '@/components/ui/PageTransition';
import DashboardCard from '@/components/dashboard/DashboardCard';
import InventoryStats from '@/components/dashboard/InventoryStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Box, Factory, Flask, Layers, Package, ShoppingBag } from 'lucide-react';

const inventoryStatsData = [
  { name: 'المواد الأولية', value: 86, color: '#3B82F6' },
  { name: 'النصف مصنعة', value: 42, color: '#10B981' },
  { name: 'مستلزمات التعبئة', value: 56, color: '#F59E0B' },
  { name: 'المنتجات النهائية', value: 35, color: '#6366F1' },
];

const lowStockItems = [
  { id: 1, code: 'RAW-00123', name: 'كحول إيثيلي', currentStock: 25, minStock: 50, unit: 'لتر' },
  { id: 2, code: 'PKG-00087', name: 'عبوة بلاستيكية 250مل', currentStock: 120, minStock: 200, unit: 'قطعة' },
  { id: 3, code: 'RAW-00045', name: 'عطر ليمون', currentStock: 8, minStock: 15, unit: 'لتر' },
];

const recentOrders = [
  { id: 1, code: 'PROD-230801-00001', product: 'ملمع تابلوه', quantity: 200, status: 'مكتمل', date: '2023-08-15' },
  { id: 2, code: 'PACK-230801-00002', product: 'منظف زجاج 500مل', quantity: 150, status: 'قيد التنفيذ', date: '2023-08-16' },
  { id: 3, code: 'PROD-230801-00003', product: 'معطر سيارات', quantity: 100, status: 'قيد الانتظار', date: '2023-08-17' },
];

const Index = () => {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
            <p className="text-muted-foreground mt-1">مرحبًا بك في نظام إدارة مصنع منتجات DELIGHT للعناية بالسيارات</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button asChild>
              <Link to="/production/orders">
                <Factory className="mr-2 h-4 w-4" />
                أمر إنتاج جديد
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/production/packaging">
                <Layers className="mr-2 h-4 w-4" />
                أمر تعبئة جديد
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="المواد الأولية"
            value="86"
            icon={<Package size={24} />}
            color="primary"
            link="/inventory/raw-materials"
          />
          <DashboardCard
            title="المنتجات النصف مصنعة"
            value="42"
            icon={<Flask size={24} />}
            color="success"
            link="/inventory/semi-finished"
          />
          <DashboardCard
            title="مستلزمات التعبئة"
            value="56"
            icon={<Box size={24} />}
            color="warning"
            link="/inventory/packaging"
          />
          <DashboardCard
            title="المنتجات النهائية"
            value="35"
            icon={<ShoppingBag size={24} />}
            color="secondary"
            link="/inventory/finished-products"
          />
          <DashboardCard
            title="العناصر منخفضة المخزون"
            value="8"
            icon={<AlertTriangle size={24} />}
            color="danger"
            link="/inventory/low-stock"
          />
          <DashboardCard
            title="أوامر الإنتاج النشطة"
            value="5"
            icon={<Factory size={24} />}
            color="info"
            link="/production/orders"
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InventoryStats data={inventoryStatsData} />
          
          <Card>
            <CardHeader>
              <CardTitle>العناصر منخفضة المخزون</CardTitle>
              <CardDescription>
                العناصر التي وصلت إلى الحد الأدنى المسموح به أو أقل
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">{item.code}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{item.currentStock} {item.unit}</div>
                        <div className="text-xs text-muted-foreground">الحد الأدنى: {item.minStock} {item.unit}</div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                        <span className="font-medium text-sm">
                          {Math.round((item.currentStock / item.minStock) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full">
                  <Link to="/inventory/low-stock">عرض الكل</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>أحدث أوامر الإنتاج</CardTitle>
            <CardDescription>
              آخر أوامر الإنتاج والتعبئة في النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-2 text-left font-medium">الكود</th>
                    <th className="py-3 px-2 text-left font-medium">المنتج</th>
                    <th className="py-3 px-2 text-left font-medium">الكمية</th>
                    <th className="py-3 px-2 text-left font-medium">الحالة</th>
                    <th className="py-3 px-2 text-left font-medium">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2 text-sm">{order.code}</td>
                      <td className="py-3 px-2 text-sm">{order.product}</td>
                      <td className="py-3 px-2 text-sm">{order.quantity}</td>
                      <td className="py-3 px-2 text-sm">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium
                          ${order.status === 'مكتمل' ? 'bg-green-100 text-green-800' : 
                            order.status === 'قيد التنفيذ' ? 'bg-blue-100 text-blue-800' : 
                            'bg-amber-100 text-amber-800'}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm">{order.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-center">
              <Button asChild variant="outline">
                <Link to="/production/orders">عرض جميع الأوامر</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Index;
