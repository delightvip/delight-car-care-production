
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun, Monitor, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalStorage } from '@/hooks/use-local-storage';

const AppearanceSettings = () => {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useLocalStorage('font-size', 'medium');
  const [rtl, setRtl] = useLocalStorage('rtl-mode', true);
  const [compactMode, setCompactMode] = useLocalStorage('compact-mode', false);
  
  const handleSave = () => {
    toast.success('تم حفظ إعدادات المظهر بنجاح');
    
    // Apply RTL setting
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    
    // Apply font size
    const bodyClasses = document.body.classList;
    bodyClasses.remove('text-sm', 'text-base', 'text-lg');
    switch (fontSize) {
      case 'small':
        bodyClasses.add('text-sm');
        break;
      case 'medium':
        bodyClasses.add('text-base');
        break;
      case 'large':
        bodyClasses.add('text-lg');
        break;
    }
    
    // Apply compact mode
    bodyClasses.toggle('compact-mode', compactMode);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات المظهر</CardTitle>
        <CardDescription>
          تخصيص مظهر التطبيق وتجربة المستخدم حسب تفضيلاتك
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">السمة</h3>
          <p className="text-sm text-muted-foreground">
            اختر نمط الألوان المفضل لديك للتطبيق
          </p>
          <RadioGroup
            defaultValue={theme}
            value={theme}
            onValueChange={(value) => setTheme(value)}
            className="grid grid-cols-3 gap-4 mt-2"
          >
            <div>
              <RadioGroupItem value="light" id="light" className="sr-only" />
              <Label
                htmlFor="light"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                <Sun className="mb-3 h-6 w-6" />
                فاتح
              </Label>
            </div>
            <div>
              <RadioGroupItem value="dark" id="dark" className="sr-only" />
              <Label
                htmlFor="dark"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                <Moon className="mb-3 h-6 w-6" />
                داكن
              </Label>
            </div>
            <div>
              <RadioGroupItem value="system" id="system" className="sr-only" />
              <Label
                htmlFor="system"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                <Monitor className="mb-3 h-6 w-6" />
                النظام
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">حجم الخط</h3>
          <p className="text-sm text-muted-foreground">
            اختر حجم الخط المناسب لك
          </p>
          <Select value={fontSize} onValueChange={setFontSize}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="اختر حجم الخط" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">صغير</SelectItem>
              <SelectItem value="medium">متوسط</SelectItem>
              <SelectItem value="large">كبير</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">اتجاه الصفحة</h3>
          <div className="flex items-center space-x-4 space-x-reverse">
            <Switch
              id="rtl"
              checked={rtl}
              onCheckedChange={setRtl}
            />
            <Label htmlFor="rtl">تمكين وضع RTL (من اليمين إلى اليسار)</Label>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">وضع المساحات المتقاربة</h3>
          <div className="flex items-center space-x-4 space-x-reverse">
            <Switch
              id="compact"
              checked={compactMode}
              onCheckedChange={setCompactMode}
            />
            <Label htmlFor="compact">تمكين وضع المساحات المتقاربة (لعرض المزيد من المحتوى)</Label>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} className="gap-2">
          <Save size={16} />
          حفظ التغييرات
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AppearanceSettings;
