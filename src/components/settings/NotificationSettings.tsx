
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Save, Bell, BellRing, BellOff } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';

const NotificationSettings = () => {
  const [settings, setSettings] = useLocalStorage('notification-settings', {
    lowStock: true,
    lowStockThreshold: 5,
    expiry: true,
    expiryThreshold: 30,
    invoices: true,
    payments: true,
    orders: true,
    production: true,
  });
  
  const [formValues, setFormValues] = useState(settings);
  
  const handleToggleChange = (field: string) => {
    setFormValues({
      ...formValues,
      [field]: !formValues[field as keyof typeof formValues],
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
    toast.success('تم حفظ إعدادات الإشعارات بنجاح');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات الإشعارات</CardTitle>
        <CardDescription>
          تحكم في الإشعارات التي تتلقاها وكيفية عرضها
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">إشعارات المخزون</h3>
          
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="lowStock">إشعار انخفاض المخزون</Label>
                <p className="text-sm text-muted-foreground">
                  تلقي إشعارات عندما ينخفض مستوى المخزون عن حد معين
                </p>
              </div>
              <Switch
                id="lowStock"
                checked={formValues.lowStock}
                onCheckedChange={() => handleToggleChange('lowStock')}
              />
            </div>
            {formValues.lowStock && (
              <div className="flex flex-row items-center space-x-2 space-x-reverse mt-2">
                <Label htmlFor="lowStockThreshold" className="min-w-[180px]">حد الإشعار عند:</Label>
                <Input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  value={formValues.lowStockThreshold}
                  onChange={handleInputChange}
                  className="max-w-[100px]"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">وحدة أو أقل</span>
              </div>
            )}
          </div>
          
          <Separator />
          
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="expiry">إشعار قرب انتهاء الصلاحية</Label>
                <p className="text-sm text-muted-foreground">
                  تلقي إشعارات عندما تقترب المنتجات من تاريخ انتهاء الصلاحية
                </p>
              </div>
              <Switch
                id="expiry"
                checked={formValues.expiry}
                onCheckedChange={() => handleToggleChange('expiry')}
              />
            </div>
            {formValues.expiry && (
              <div className="flex flex-row items-center space-x-2 space-x-reverse mt-2">
                <Label htmlFor="expiryThreshold" className="min-w-[180px]">حد الإشعار قبل:</Label>
                <Input
                  id="expiryThreshold"
                  name="expiryThreshold"
                  type="number"
                  value={formValues.expiryThreshold}
                  onChange={handleInputChange}
                  className="max-w-[100px]"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">يوم</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">إشعارات المعاملات التجارية</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="invoices">إشعارات الفواتير</Label>
                <p className="text-sm text-muted-foreground">
                  إشعارات عن الفواتير الجديدة والمستحقة
                </p>
              </div>
              <Switch
                id="invoices"
                checked={formValues.invoices}
                onCheckedChange={() => handleToggleChange('invoices')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="payments">إشعارات المدفوعات</Label>
                <p className="text-sm text-muted-foreground">
                  إشعارات عن المدفوعات الجديدة والمستلمة
                </p>
              </div>
              <Switch
                id="payments"
                checked={formValues.payments}
                onCheckedChange={() => handleToggleChange('payments')}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">إشعارات الإنتاج</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="orders">إشعارات أوامر الشراء</Label>
                <p className="text-sm text-muted-foreground">
                  إشعارات عن أوامر الشراء الجديدة والمعلقة
                </p>
              </div>
              <Switch
                id="orders"
                checked={formValues.orders}
                onCheckedChange={() => handleToggleChange('orders')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="production">إشعارات الإنتاج</Label>
                <p className="text-sm text-muted-foreground">
                  إشعارات عن حالة أوامر الإنتاج والتعبئة
                </p>
              </div>
              <Switch
                id="production"
                checked={formValues.production}
                onCheckedChange={() => handleToggleChange('production')}
              />
            </div>
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

export default NotificationSettings;
