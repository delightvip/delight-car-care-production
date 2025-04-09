
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ar } from 'date-fns/locale';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, List, Clock, CheckSquare, AlertTriangle, Package, Layers, CalendarDays, ListTodo } from 'lucide-react';
import ProductionService from '@/services/ProductionService';
import { toast } from 'sonner';
import { ProductionOrder, PackagingOrder } from '@/services/ProductionService';

const ProductionSchedule = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [packagingOrders, setPackagingOrders] = useState<PackagingOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedDateOrders, setSelectedDateOrders] = useState<{
    production: ProductionOrder[],
    packaging: PackagingOrder[]
  }>({ production: [], packaging: [] });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const productionForDate = productionOrders.filter(order => 
        isSameDay(parseISO(order.date), selectedDate)
      );
      
      const packagingForDate = packagingOrders.filter(order => 
        isSameDay(parseISO(order.date), selectedDate)
      );
      
      setSelectedDateOrders({
        production: productionForDate,
        packaging: packagingForDate
      });
    }
  }, [selectedDate, productionOrders, packagingOrders]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const productionService = ProductionService.getInstance();
      
      // جلب أوامر الإنتاج
      const prodOrders = await productionService.getProductionOrders();
      setProductionOrders(prodOrders);
      
      // جلب أوامر التعبئة
      const packOrders = await productionService.getPackagingOrders();
      setPackagingOrders(packOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  // تحديد الأيام التي بها أوامر إنتاج أو تعبئة
  const getDayClassNames = (day: Date, modifiers: any) => {
    if (!day) return "";
    
    const hasProductionOrder = productionOrders.some(order => isSameDay(parseISO(order.date), day));
    const hasPackagingOrder = packagingOrders.some(order => isSameDay(parseISO(order.date), day));
    
    if (hasProductionOrder && hasPackagingOrder) {
      return "bg-purple-100 text-purple-800";
    } else if (hasProductionOrder) {
      return "bg-blue-100 text-blue-800";
    } else if (hasPackagingOrder) {
      return "bg-green-100 text-green-800";
    }
    
    return "";
  };

  // الحصول على جميع الأوامر مرتبة حسب التاريخ
  const getAllOrdersByDate = () => {
    const allOrders: {
      id: number;
      code: string;
      productName: string;
      date: string;
      type: 'production' | 'packaging';
      status: string;
    }[] = [
      ...productionOrders.map(order => ({
        id: order.id,
        code: order.code,
        productName: order.productName,
        date: order.date,
        type: 'production' as const,
        status: order.status
      })),
      ...packagingOrders.map(order => ({
        id: order.id,
        code: order.code,
        productName: order.productName,
        date: order.date,
        type: 'packaging' as const,
        status: order.status
      }))
    ];
    
    // ترتيب الأوامر حسب التاريخ
    return allOrders.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  // تحويل حالة الأمر إلى اللغة العربية
  const getStatusTranslation = (status: string) => {
    const translations: Record<string, string> = {
      pending: 'قيد الانتظار',
      inProgress: 'قيد التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي'
    };
    
    return translations[status] || status;
  };

  // الحصول على لون الحالة
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'inProgress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>الجدول الزمني للإنتاج</CardTitle>
              <CardDescription>
                جدول زمني لأوامر الإنتاج والتعبئة
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TabsList>
                <TabsTrigger 
                  value="calendar" 
                  onClick={() => setView('calendar')}
                  className={view === 'calendar' ? "bg-primary text-white" : ""}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  التقويم
                </TabsTrigger>
                <TabsTrigger 
                  value="list" 
                  onClick={() => setView('list')}
                  className={view === 'list' ? "bg-primary text-white" : ""}
                >
                  <List className="h-4 w-4 mr-2" />
                  القائمة
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {view === 'calendar' ? (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
              <div className="md:col-span-4">
                <Card>
                  <CardContent className="p-4">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={ar}
                      className="border rounded-md"
                      classNames={{
                        day_today: "bg-primary/20 text-primary font-bold",
                        day_selected: "bg-primary text-primary-foreground font-bold",
                        day_range_end: getDayClassNames,
                        day_range_middle: getDayClassNames,
                        day_range_start: getDayClassNames,
                      }}
                    />
                  </CardContent>
                </Card>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="text-xs">التاريخ المحدد</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-xs">أوامر إنتاج</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs">أوامر تعبئة</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-xs">أوامر إنتاج وتعبئة</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      {selectedDate && format(selectedDate, 'PPP', { locale: ar })}
                    </CardTitle>
                    <CardDescription>
                      الأوامر المجدولة في هذا اليوم
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedDateOrders.production.length === 0 && selectedDateOrders.packaging.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ListTodo className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>لا توجد أوامر إنتاج أو تعبئة في هذا اليوم</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedDateOrders.production.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Layers className="h-4 w-4" />
                              أوامر الإنتاج
                            </h3>
                            <div className="space-y-2">
                              {selectedDateOrders.production.map(order => (
                                <div key={order.id} className="p-2 bg-muted rounded-md">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-medium block">{order.productName}</span>
                                      <span className="text-xs text-muted-foreground">{order.code}</span>
                                    </div>
                                    <Badge className={getStatusColor(order.status)}>
                                      {getStatusTranslation(order.status)}
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between text-sm mt-1">
                                    <span>الكمية: {order.quantity} {order.unit}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {selectedDateOrders.packaging.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              أوامر التعبئة
                            </h3>
                            <div className="space-y-2">
                              {selectedDateOrders.packaging.map(order => (
                                <div key={order.id} className="p-2 bg-muted rounded-md">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-medium block">{order.productName}</span>
                                      <span className="text-xs text-muted-foreground">{order.code}</span>
                                    </div>
                                    <Badge className={getStatusColor(order.status)}>
                                      {getStatusTranslation(order.status)}
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between text-sm mt-1">
                                    <span>الكمية: {order.quantity} {order.unit}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>قائمة الأوامر الزمنية</CardTitle>
                <CardDescription>
                  جميع أوامر الإنتاج والتعبئة مرتبة زمنياً
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {getAllOrdersByDate().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>لا توجد أوامر إنتاج أو تعبئة</p>
                    </div>
                  ) : (
                    <>
                      {getAllOrdersByDate().map((order, index) => (
                        <div key={`${order.type}-${order.id}`}>
                          {index === 0 || format(new Date(order.date), 'yyyy-MM-dd') !== format(new Date(getAllOrdersByDate()[index - 1].date), 'yyyy-MM-dd') ? (
                            <div className="sticky top-0 bg-background py-2 z-10">
                              <h3 className="font-medium text-sm bg-muted p-2 rounded-md">
                                {format(new Date(order.date), 'PPP', { locale: ar })}
                              </h3>
                            </div>
                          ) : null}
                          
                          <div className="flex items-start gap-4 p-3 hover:bg-muted/50 rounded-md transition-colors">
                            <div className="mt-0.5">
                              {order.type === 'production' ? (
                                <Layers className="h-5 w-5 text-blue-500" />
                              ) : (
                                <Package className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-medium">
                                    {order.productName}
                                  </span>
                                  <div className="text-sm text-muted-foreground">
                                    {order.code}
                                  </div>
                                </div>
                                <Badge className={getStatusColor(order.status)}>
                                  {getStatusTranslation(order.status)}
                                </Badge>
                              </div>
                              <div className="text-sm mt-1 flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {order.type === 'production' ? 'أمر إنتاج' : 'أمر تعبئة'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionSchedule;
