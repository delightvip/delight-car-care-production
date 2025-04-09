
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2, Plus, Target, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface ProductionGoal {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  targetDate: Date;
  priority: number;
  completed: number;
}

const ProductionGoals = () => {
  const [goals, setGoals] = useState<ProductionGoal[]>([
    {
      id: '1',
      productCode: 'PRD001',
      productName: 'منتج 1',
      quantity: 100,
      targetDate: new Date(2025, 4, 15),
      priority: 3,
      completed: 30,
    },
    {
      id: '2',
      productCode: 'PRD002',
      productName: 'منتج 2',
      quantity: 50,
      targetDate: new Date(2025, 4, 20),
      priority: 2,
      completed: 10,
    }
  ]);
  
  const [date, setDate] = useState<Date>();
  const [newGoal, setNewGoal] = useState<Partial<ProductionGoal>>({
    priority: 2
  });
  const [productOptions, setProductOptions] = useState([
    { code: 'PRD001', name: 'منتج 1' },
    { code: 'PRD002', name: 'منتج 2' },
    { code: 'PRD003', name: 'منتج 3' },
  ]);

  const handleAddGoal = () => {
    if (!newGoal.productCode || !newGoal.quantity || !date) {
      toast.error('الرجاء إدخال جميع البيانات المطلوبة');
      return;
    }
    
    // العثور على اسم المنتج من الكود
    const product = productOptions.find(p => p.code === newGoal.productCode);
    
    const goal: ProductionGoal = {
      id: Date.now().toString(),
      productCode: newGoal.productCode,
      productName: product?.name || '',
      quantity: newGoal.quantity || 0,
      targetDate: date,
      priority: newGoal.priority || 2,
      completed: 0
    };
    
    setGoals([...goals, goal]);
    setNewGoal({ priority: 2 });
    setDate(undefined);
    toast.success('تم إضافة هدف الإنتاج بنجاح');
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(goals.filter(goal => goal.id !== id));
    toast.success('تم حذف هدف الإنتاج بنجاح');
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return { label: 'منخفضة', color: 'bg-blue-100 text-blue-800' };
      case 2: return { label: 'متوسطة', color: 'bg-yellow-100 text-yellow-800' };
      case 3: return { label: 'عالية', color: 'bg-red-100 text-red-800' };
      default: return { label: 'متوسطة', color: 'bg-yellow-100 text-yellow-800' };
    }
  };

  // ترتيب الأهداف حسب الأولوية
  const sortedGoals = [...goals].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-6">
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
          <CardTitle>أهداف الإنتاج الحالية</CardTitle>
          <CardDescription>
            الأهداف مرتبة حسب أولوية الإنتاج
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedGoals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>لا توجد أهداف إنتاج محددة حالياً</p>
              <p className="text-sm">قم بإضافة هدف جديد باستخدام النموذج أعلاه</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedGoals.map((goal) => (
                <Card key={goal.id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{goal.productName}</h3>
                          <p className="text-sm text-muted-foreground">{goal.productCode}</p>
                        </div>
                        <Badge className={getPriorityLabel(goal.priority).color}>
                          {getPriorityLabel(goal.priority).label}
                        </Badge>
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>الكمية المستهدفة:</span>
                          <span className="font-medium">{goal.quantity}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span>تاريخ الاستهداف:</span>
                          <span className="font-medium">
                            {format(goal.targetDate, 'PPP', { locale: ar })}
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
                        />
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionGoals;
