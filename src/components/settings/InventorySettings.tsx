
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Save, Package, BarChart } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useLocalStorage } from '@/hooks/use-local-storage';

const InventorySettings = () => {
  const [settings, setSettings] = useLocalStorage('inventory-settings', {
    autoUpdateCosts: true,
    defaultCostMethod: 'average',
    enableBarcodes: false,
    autoBatchNumbering: true,
    trackExpiryDates: true,
    enableLocationTracking: false,
    enableReorderNotifications: true,
    defaultReorderPoint: 10,
  });
  
  const [formValues, setFormValues] = useState(settings);
  
  const handleToggleChange = (field: string) => {
    setFormValues({
      ...formValues,
      [field]: !formValues[field as keyof typeof formValues],
    });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value === '' ? 0 : parseInt(value),
    });
  };
  
  const handleSave = () => {
    setSettings(formValues);
    toast.success('تم حفظ إعدادات المخزون بنجاح');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات المخزون</CardTitle>
        <CardDescription>
          تخصيص كيفية إدارة المخزون وتتبعه
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">إعدادات التكلفة والتسعير</h3>
          
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoUpdateCosts">تحديث التكاليف تلقائياً</Label>
                <p className="text-sm text-muted-foreground">
                  يتم تحديث تكاليف المنتجات تلقائياً عند تغير تكاليف المواد الخام
                </p>
              </div>
              <Switch
                id="autoUpdateCosts"
                checked={formValues.autoUpdateCosts}
                onCheckedChange={() => handleToggleChange('autoUpdateCosts')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="defaultCostMethod">طريقة حساب التكلفة الافتراضية</Label>
              <Select 
                value={formValues.defaultCostMethod} 
                onValueChange={(value) => handleSelectChange('defaultCostMethod', value)}
              >
                <SelectTrigger id="defaultCostMethod" className="w-full max-w-xs">
                  <SelectValue placeholder="اختر طريقة حساب التكلفة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fifo">الوارد أولاً صادر أولاً (FIFO)</SelectItem>
                  <SelectItem value="lifo">الوارد أخيراً صادر أولاً (LIFO)</SelectItem>
                  <SelectItem value="average">متوسط التكلفة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">تتبع المخزون</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableBarcodes">تمكين الباركود</Label>
                <p className="text-sm text-muted-foreground">
                  استخدام الباركود لتتبع المنتجات والمواد
                </p>
              </div>
              <Switch
                id="enableBarcodes"
                checked={formValues.enableBarcodes}
                onCheckedChange={() => handleToggleChange('enableBarcodes')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoBatchNumbering">ترقيم الدفعات تلقائياً</Label>
                <p className="text-sm text-muted-foreground">
                  تعيين أرقام للدفعات تلقائياً عند الاستلام
                </p>
              </div>
              <Switch
                id="autoBatchNumbering"
                checked={formValues.autoBatchNumbering}
                onCheckedChange={() => handleToggleChange('autoBatchNumbering')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trackExpiryDates">تتبع تواريخ انتهاء الصلاحية</Label>
                <p className="text-sm text-muted-foreground">
                  تتبع تواريخ انتهاء صلاحية المنتجات والمواد
                </p>
              </div>
              <Switch
                id="trackExpiryDates"
                checked={formValues.trackExpiryDates}
                onCheckedChange={() => handleToggleChange('trackExpiryDates')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableLocationTracking">تتبع المواقع</Label>
                <p className="text-sm text-muted-foreground">
                  تتبع مواقع المنتجات في المخازن المختلفة
                </p>
              </div>
              <Switch
                id="enableLocationTracking"
                checked={formValues.enableLocationTracking}
                onCheckedChange={() => handleToggleChange('enableLocationTracking')}
              />
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">إعادة الطلب</h3>
          
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableReorderNotifications">تفعيل إشعارات إعادة الطلب</Label>
                <p className="text-sm text-muted-foreground">
                  إشعارات عندما تنخفض مستويات المخزون عن نقطة إعادة الطلب
                </p>
              </div>
              <Switch
                id="enableReorderNotifications"
                checked={formValues.enableReorderNotifications}
                onCheckedChange={() => handleToggleChange('enableReorderNotifications')}
              />
            </div>
            
            {formValues.enableReorderNotifications && (
              <div className="flex flex-row items-center space-x-2 space-x-reverse">
                <Label htmlFor="defaultReorderPoint" className="min-w-[180px]">نقطة إعادة الطلب الافتراضية:</Label>
                <Input
                  id="defaultReorderPoint"
                  name="defaultReorderPoint"
                  type="number"
                  value={formValues.defaultReorderPoint}
                  onChange={handleInputChange}
                  className="max-w-[100px]"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">وحدة</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} className="gap-2">
          <Save size={16} />
          حفظ الإعدادات
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InventorySettings;
