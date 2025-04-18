import React, { useState } from 'react';
import { 
  Settings, 
  FileBarChart, 
  Package, 
  Factory, 
  ShoppingCart, 
  RotateCcw,
  PieChart,
  BarChart4,
  Zap,
  ZapOff,
  Minus,
  Plus
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// تعريف واجهة فئة الأخبار
export interface NewsTickerCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
}

// تعريف واجهة الخصائص
interface NewsTickerSettingsProps {
  onCategoriesChange: (categories: NewsTickerCategory[]) => void;
  initialCategories?: NewsTickerCategory[];
  onSpeedChange?: (speed: number) => void;
  currentSpeed?: number;
  onAutoplayChange?: (autoplay: boolean) => void;
  autoplay?: boolean;
  showTicker?: boolean;
  onToggleTicker?: () => void;
}

// تعريف المكون باستخدام صيغة التصدير المسمى
export function NewsTickerSettings({ 
  onCategoriesChange,
  initialCategories,
  onSpeedChange,
  currentSpeed = 40,
  onAutoplayChange,
  autoplay = true,
  showTicker = true,
  onToggleTicker
}: NewsTickerSettingsProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<NewsTickerCategory[]>(initialCategories || [
    { id: 'financial', name: 'مالي', icon: <FileBarChart className="h-4 w-4" />, enabled: true },
    { id: 'inventory', name: 'المخزون', icon: <Package className="h-4 w-4" />, enabled: true },
    { id: 'production', name: 'الإنتاج', icon: <Factory className="h-4 w-4" />, enabled: true },
    { id: 'commercial', name: 'المبيعات', icon: <ShoppingCart className="h-4 w-4" />, enabled: true },
    { id: 'returns', name: 'المرتجعات', icon: <RotateCcw className="h-4 w-4" />, enabled: true },
    { id: 'analytics', name: 'التحليلات', icon: <PieChart className="h-4 w-4" />, enabled: true },
  ]);
  const [speed, setSpeed] = useState<number>(currentSpeed);
  const [isAutoplay, setIsAutoplay] = useState<boolean>(autoplay);

  // معالجة تبديل حالة الفئة
  const handleCategoryToggle = (id: string) => {
    const updatedCategories = categories.map(category => 
      category.id === id ? { ...category, enabled: !category.enabled } : category
    );
    
    // التأكد من أن هناك فئة واحدة على الأقل نشطة
    if (updatedCategories.some(c => c.enabled)) {
      setCategories(updatedCategories);
      onCategoriesChange(updatedCategories);
    } else {
      toast({
        title: "تنبيه",
        description: "يجب اختيار فئة واحدة على الأقل",
        variant: "default",
      });
    }
  };

  // تحديد كل الفئات
  const selectAll = () => {
    const allSelected = categories.map(category => ({ ...category, enabled: true }));
    setCategories(allSelected);
    onCategoriesChange(allSelected);
    
    toast({
      title: "تم تحديث التفضيلات",
      description: "تم اختيار جميع الفئات",
      variant: "success",
    });
  };
    // دالة للتحكم في سرعة الشريط
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (onSpeedChange) {
      onSpeedChange(newSpeed);
    }
    // تم إزالة إشعارات تغيير السرعة
  };
  
  // دالة للتحكم في التشغيل التلقائي
  const handleAutoplayToggle = () => {
    const newAutoplay = !isAutoplay;
    setIsAutoplay(newAutoplay);
    if (onAutoplayChange) {
      onAutoplayChange(newAutoplay);
    }
    
    toast({
      title: "تم تحديث الإعدادات",
      description: newAutoplay ? "تم تفعيل التشغيل التلقائي" : "تم إيقاف التشغيل التلقائي",
      variant: "success",
    });
  };
  
  const activeCount = categories.filter(c => c.enabled).length;
  const totalCount = categories.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={`shadow-lg border-2 rounded-full p-0.5 transition-all duration-200 focus:ring-2 focus:ring-blue-400
            ${showTicker ? 'bg-primary text-white border-primary hover:bg-primary/90' : 'bg-gray-100 text-primary border-primary hover:bg-primary/10'}
            dark:${showTicker ? 'bg-primary text-white border-primary hover:bg-primary/90' : 'bg-gray-900 text-primary border-primary hover:bg-primary/10'}`}
          style={{ boxShadow: '0 2px 12px 0 rgba(0,0,0,0.18)', minWidth: 28, minHeight: 28, width: 28, height: 28 }}
          aria-label="إعدادات الشريط الإخباري"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] rtl:text-right">
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid grid-cols-2 mb-2">
            <TabsTrigger value="categories">الفئات</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>
          <TabsContent value="categories">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">تخصيص المحتوى</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={selectAll}
              >
                <BarChart4 className="h-3.5 w-3.5 mr-1" />
                عرض الكل
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              اختر فئات المحتوى التي ترغب في عرضها ({activeCount}/{totalCount})
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id={`category-${category.id}`}
                    checked={category.enabled}
                    onCheckedChange={() => handleCategoryToggle(category.id)}
                  />
                  <Label 
                    htmlFor={`category-${category.id}`}
                    className="flex items-center cursor-pointer text-sm"
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="settings" className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">سرعة الشريط الإخباري</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleSpeedChange(Math.max(10, speed - 10))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="w-full mx-2">
                    <Slider
                      value={[speed]}
                      min={10}
                      max={100}
                      step={5}
                      onValueChange={(vals) => handleSpeedChange(vals[0])}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleSpeedChange(Math.min(100, speed + 10))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  السرعة الحالية: {speed} (بطيء ← سريع)
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoplay" className="text-sm flex items-center gap-2">
                  {isAutoplay ? (
                    <Zap className="h-4 w-4 text-amber-500" />
                  ) : (
                    <ZapOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  التشغيل التلقائي
                </Label>
                <Switch
                  id="autoplay"
                  checked={isAutoplay}
                  onCheckedChange={handleAutoplayToggle}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isAutoplay ? 'سيستمر الشريط في التحرك تلقائياً' : 'سيتوقف الشريط حتى ينقر المستخدم على زر التشغيل'}
              </p>
            </div>
            {onToggleTicker && (
              <div className="flex justify-end mt-2">
                <Button
                  variant={showTicker ? "destructive" : "default"}
                  size="sm"
                  className={showTicker ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                  onClick={onToggleTicker}
                >
                  {showTicker ? 'إخفاء الشريط الإخباري' : 'إظهار الشريط الإخباري'}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
