
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2, Plus, Target, AlertTriangle, Clock, CheckCircle2, PieChart, ChevronUp, ChevronDown } from 'lucide-react';
import { format, addDays, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import ProductionService, { ProductionGoal } from '@/services/ProductionService';
import InventoryService from '@/services/InventoryService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ProductionGoals = () => {
  const [goals, setGoals] = useState<ProductionGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date>();
  const [newGoal, setNewGoal] = useState<Partial<ProductionGoal>>({
    priority: 2
  });
  const [productOptions, setProductOptions] = useState<{ code: string, name: string }[]>([]);
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'completion'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch products
        const inventoryService = InventoryService.getInstance();
        const products = await inventoryService.getFinishedProducts();
        
        setProductOptions(products.map(product => ({
          code: product.code,
          name: product.name
        })));
        
        // Fetch goals
        const productionService = ProductionService.getInstance();
        const productionGoals = await productionService.getProductionGoals();
        setGoals(productionGoals);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('حدث خطأ أثناء جلب البيانات');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleAddGoal = async () => {
    if (!newGoal.productCode || !newGoal.quantity || !date) {
      toast.error('الرجاء إدخال جميع البيانات المطلوبة');
      return;
    }
    
    // العثور على اسم المنتج من الكود
    const product = productOptions.find(p => p.code === newGoal.productCode);
    
    if (!product) {
      toast.error('لم يتم العثور على المنتج');
      return;
    }
    
    const goal: Omit<ProductionGoal, 'id'> = {
      productCode: newGoal.productCode,
      productName: product.name,
      quantity: newGoal.quantity || 0,
      targetDate: date,
      priority: newGoal.priority || 2,
      completed: 0
    };
    
    try {
      const productionService = ProductionService.getInstance();
      const savedGoal = await productionService.saveProductionGoal(goal);
      
      if (savedGoal) {
        setGoals([...goals, savedGoal]);
        setNewGoal({ priority: 2 });
        setDate(undefined);
        toast.success('تم إضافة هدف الإنتاج بنجاح');
      }
    } catch (error) {
      console.error('Error adding goal:', error);
      toast.error('حدث خطأ أثناء إضافة هدف الإنتاج');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const productionService = ProductionService.getInstance();
      const success = await productionService.deleteProductionGoal(id);
      
      if (success) {
        setGoals(goals.filter(goal => goal.id !== id));
        toast.success('تم حذف هدف الإنتاج بنجاح');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('حدث خطأ أثناء حذف هدف الإنتاج');
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return { label: 'منخفضة', color: 'bg-blue-100 text-blue-800' };
      case 2: return { label: 'متوسطة', color: 'bg-yellow-100 text-yellow-800' };
      case 3: return { label: 'عالية', color: 'bg-red-100 text-red-800' };
      default: return { label: 'متوسطة', color: 'bg-yellow-100 text-yellow-800' };
    }
  };

  const handleSortChange = (newSortBy: 'priority' | 'date' | 'completion') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  // ترتيب الأهداف حسب المعايير المختارة
  const sortedGoals = [...goals].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'priority') {
      comparison = b.priority - a.priority;
    } else if (sortBy === 'date') {
      comparison = new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    } else if (sortBy === 'completion') {
      const completionA = (a.completed / a.quantity) * 100;
      const completionB = (b.completed / b.quantity) * 100;
      comparison = completionB - completionA;
    }
    
    return sortOrder === 'asc' ? -comparison : comparison;
  });

  // تصنيف الأهداف حسب الحالة
  const overdueGoals = sortedGoals.filter(goal => 
    isBefore(new Date(goal.targetDate), new Date()) && 
    (goal.completed / goal.quantity) * 100 < 100
  );
  
  const upcomingGoals = sortedGoals.filter(goal => 
    !isBefore(new Date(goal.targetDate), new Date()) && 
    (goal.completed / goal.quantity) * 100 < 100
  );
  
  const completedGoals = sortedGoals.filter(goal => 
    (goal.completed / goal.quantity) * 100 >= 100
  );

  // حساب إحصائيات الأهداف
  const totalGoals = goals.length;
  const completedGoalsCount = completedGoals.length;
  const overdueGoalsCount = overdueGoals.length;
  const completionRate = totalGoals > 0 ? (completedGoalsCount / totalGoals) * 100 : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Clock className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p>جاري تحميل أهداف الإنتاج...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="mr-2 h-4 w-4 text-primary" />
              إجمالي الأهداف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGoals}</div>
            <div className="text-xs text-muted-foreground mt-2 flex items-center">
              <span>تتضمن جميع أهداف الإنتاج المحددة</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              الأهداف المكتملة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedGoalsCount}</div>
            <Progress 
              value={completionRate} 
              className="h-2 mt-2" 
            />
            <div className="text-xs text-muted-foreground mt-2">
              {completionRate.toFixed(0)}% من إجمالي الأهداف
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
              الأهداف المتأخرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueGoalsCount}</div>
            <Progress 
              value={totalGoals > 0 ? (overdueGoalsCount / totalGoals) * 100 : 0} 
              className="h-2 mt-2" 
              indicatorClassName="bg-red-500"
            />
            <div className="text-xs text-muted-foreground mt-2">
              {totalGoals > 0 ? ((overdueGoalsCount / totalGoals) * 100).toFixed(0) : 0}% من إجمالي الأهداف
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            إضافة هدف إنتاج جديد
          </CardTitle>
          <CardDescription>
            حدد المنتج والكمية والتاريخ المستهدف للإنتاج
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">المنتج</label>
              <Select 
                value={newGoal.productCode} 
                onValueChange={(value) => setNewGoal({...newGoal, productCode: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنتج" />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map(product => (
                    <SelectItem key={product.code} value={product.code}>
                      {product.name} ({product.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">الكمية المستهدفة</label>
              <Input 
                type="number" 
                placeholder="أدخل الكمية" 
                value={newGoal.quantity || ''} 
                onChange={(e) => setNewGoal({...newGoal, quantity: parseInt(e.target.value) || 0})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">التاريخ المستهدف</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-right"
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {date ? format(date, 'PPP', { locale: ar }) : "اختر التاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={ar}
                    disabled={(date) => isBefore(date, new Date())}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">الأولوية ({getPriorityLabel(newGoal.priority || 2).label})</label>
            <Slider
              value={[newGoal.priority || 2]}
              min={1}
              max={3}
              step={1}
              onValueChange={(value) => setNewGoal({...newGoal, priority: value[0]})}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>منخفضة</span>
              <span>متوسطة</span>
              <span>عالية</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleAddGoal} className="gap-1">
            <Plus className="h-4 w-4" />
            إضافة هدف الإنتاج
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <CardTitle>أهداف الإنتاج الحالية</CardTitle>
              <CardDescription>
                عرض وإدارة جميع أهداف الإنتاج
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              <div className="text-sm text-muted-foreground">ترتيب حسب:</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSortChange('priority')}
                className={`flex items-center gap-1 ${sortBy === 'priority' ? 'bg-primary/10' : ''}`}
              >
                الأولوية
                {sortBy === 'priority' && (
                  sortOrder === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSortChange('date')}
                className={`flex items-center gap-1 ${sortBy === 'date' ? 'bg-primary/10' : ''}`}
              >
                التاريخ
                {sortBy === 'date' && (
                  sortOrder === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSortChange('completion')}
                className={`flex items-center gap-1 ${sortBy === 'completion' ? 'bg-primary/10' : ''}`}
              >
                الإنجاز
                {sortBy === 'completion' && (
                  sortOrder === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">جميع الأهداف ({goals.length})</TabsTrigger>
              <TabsTrigger value="overdue">متأخرة ({overdueGoals.length})</TabsTrigger>
              <TabsTrigger value="upcoming">قادمة ({upcomingGoals.length})</TabsTrigger>
              <TabsTrigger value="completed">مكتملة ({completedGoals.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              {renderGoalsList(sortedGoals)}
            </TabsContent>
            
            <TabsContent value="overdue">
              {overdueGoals.length === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>جميع الأهداف في الموعد</AlertTitle>
                  <AlertDescription>
                    لا توجد أهداف إنتاج متأخرة حتى الآن.
                  </AlertDescription>
                </Alert>
              ) : (
                renderGoalsList(overdueGoals)
              )}
            </TabsContent>
            
            <TabsContent value="upcoming">
              {upcomingGoals.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>لا توجد أهداف قادمة</AlertTitle>
                  <AlertDescription>
                    لم يتم تحديد أهداف إنتاج مستقبلية بعد.
                  </AlertDescription>
                </Alert>
              ) : (
                renderGoalsList(upcomingGoals)
              )}
            </TabsContent>
            
            <TabsContent value="completed">
              {completedGoals.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>لا توجد أهداف مكتملة</AlertTitle>
                  <AlertDescription>
                    لم يتم إكمال أي هدف إنتاج حتى الآن.
                  </AlertDescription>
                </Alert>
              ) : (
                renderGoalsList(completedGoals)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );

  function renderGoalsList(goalsList: ProductionGoal[]) {
    return (
      <>
        {goalsList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>لا توجد أهداف إنتاج محددة حالياً</p>
            <p className="text-sm">قم بإضافة هدف جديد باستخدام النموذج أعلاه</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goalsList.map((goal) => (
              <Card key={goal.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="p-4 flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{goal.productName}</h3>
                        <p className="text-sm text-muted-foreground">{goal.productCode}</p>
                      </div>
                      <div className="flex gap-2">
                        {isBefore(new Date(goal.targetDate), new Date()) && 
                         (goal.completed / goal.quantity) * 100 < 100 && (
                          <Badge variant="destructive">متأخر</Badge>
                        )}
                        <Badge className={getPriorityLabel(goal.priority).color}>
                          {getPriorityLabel(goal.priority).label}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>الكمية المستهدفة:</span>
                        <span className="font-medium">{goal.quantity}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span>تاريخ الاستهداف:</span>
                        <span className="font-medium">
                          {format(new Date(goal.targetDate), 'PPP', { locale: ar })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span>التقدم:</span>
                        <span className="font-medium">
                          {Math.round((goal.completed / goal.quantity) * 100)}%
                        </span>
                      </div>
                      
                      <Progress 
                        value={(goal.completed / goal.quantity) * 100} 
                        className="h-2 mt-2" 
                        indicatorClassName={(goal.completed / goal.quantity) * 100 >= 100 ? "bg-green-500" : undefined}
                      />

                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>المكتمل: {goal.completed}</span>
                        <span>المتبقي: {goal.quantity - goal.completed}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-muted flex flex-row md:flex-col justify-end p-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </>
    );
  }
};

export default ProductionGoals;
