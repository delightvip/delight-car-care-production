
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Database, RefreshCw, Clock, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useLocalStorage } from '@/hooks/use-local-storage';

const SystemSettings = () => {
  const [settings, setSettings] = useLocalStorage('system-settings', {
    autoDatabaseBackup: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    dataRetentionPeriod: 12,
    dateFormat: 'yyyy-MM-dd',
    timeFormat: '24',
    weekStartsOn: 'sunday',
    autoLogout: true,
    inactivityTimeout: 30,
    enableDebugMode: false,
  });
  
  const [formValues, setFormValues] = useState(settings);
  
  useEffect(() => {
    setFormValues(settings);
  }, [settings]);
  
  const handleToggleChange = (field: string) => {
    setFormValues({
      ...formValues,
      [field]: !formValues[field as keyof typeof formValues],
    });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormValues({
      ...formValues,
      [name]: type === 'number' ? (value === '' ? 0 : parseInt(value)) : value,
    });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };
  
  const handleSave = () => {
    setSettings(formValues);
    toast.success('تم حفظ إعدادات النظام بنجاح');
  };
  
  const handleBackupNow = () => {
    toast.success('تم بدء عملية النسخ الاحتياطي');
    setTimeout(() => {
      toast.success('تم إكمال النسخ الاحتياطي بنجاح');
    }, 2000);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات النظام</CardTitle>
        <CardDescription>
          إعدادات عامة للنظام والنسخ الاحتياطي وصيانة البيانات
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">النسخ الاحتياطي واستعادة البيانات</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoDatabaseBackup">النسخ الاحتياطي التلقائي</Label>
              <p className="text-sm text-muted-foreground">
                إنشاء نسخة احتياطية للبيانات تلقائياً
              </p>
            </div>
            <Switch
              id="autoDatabaseBackup"
              checked={formValues.autoDatabaseBackup}
              onCheckedChange={() => handleToggleChange('autoDatabaseBackup')}
            />
          </div>
          
          {formValues.autoDatabaseBackup && (
            <div className="space-y-4 pl-6 border-l">
              <div className="space-y-2">
                <Label htmlFor="backupFrequency">تكرار النسخ الاحتياطي</Label>
                <Select 
                  value={formValues.backupFrequency} 
                  onValueChange={(value) => handleSelectChange('backupFrequency', value)}
                >
                  <SelectTrigger id="backupFrequency" className="w-full max-w-xs">
                    <SelectValue placeholder="اختر تكرار النسخ الاحتياطي" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">يومياً</SelectItem>
                    <SelectItem value="weekly">أسبوعياً</SelectItem>
                    <SelectItem value="monthly">شهرياً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="backupTime">وقت النسخ الاحتياطي</Label>
                <Input
                  id="backupTime"
                  name="backupTime"
                  type="time"
                  value={formValues.backupTime}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="dataRetentionPeriod">فترة الاحتفاظ بالنسخ الاحتياطية (بالأشهر)</Label>
            <Input
              id="dataRetentionPeriod"
              name="dataRetentionPeriod"
              type="number"
              value={formValues.dataRetentionPeriod}
              onChange={handleInputChange}
              min={1}
            />
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleBackupNow} variant="outline" className="gap-2">
              <RefreshCw size={16} />
              إنشاء نسخة احتياطية الآن
            </Button>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">إعدادات الوقت والتاريخ</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFormat">تنسيق التاريخ</Label>
              <Select 
                value={formValues.dateFormat} 
                onValueChange={(value) => handleSelectChange('dateFormat', value)}
              >
                <SelectTrigger id="dateFormat" className="w-full">
                  <SelectValue placeholder="اختر تنسيق التاريخ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yyyy-MM-dd">سنة-شهر-يوم (2023-01-31)</SelectItem>
                  <SelectItem value="dd/MM/yyyy">يوم/شهر/سنة (31/01/2023)</SelectItem>
                  <SelectItem value="MM/dd/yyyy">شهر/يوم/سنة (01/31/2023)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeFormat">تنسيق الوقت</Label>
              <Select 
                value={formValues.timeFormat} 
                onValueChange={(value) => handleSelectChange('timeFormat', value)}
              >
                <SelectTrigger id="timeFormat" className="w-full">
                  <SelectValue placeholder="اختر تنسيق الوقت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 ساعة (مساءً/صباحاً)</SelectItem>
                  <SelectItem value="24">24 ساعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="weekStartsOn">بداية الأسبوع</Label>
              <Select 
                value={formValues.weekStartsOn} 
                onValueChange={(value) => handleSelectChange('weekStartsOn', value)}
              >
                <SelectTrigger id="weekStartsOn" className="w-full">
                  <SelectValue placeholder="اختر بداية الأسبوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saturday">السبت</SelectItem>
                  <SelectItem value="sunday">الأحد</SelectItem>
                  <SelectItem value="monday">الاثنين</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">إعدادات الأمان</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoLogout">تسجيل الخروج التلقائي</Label>
              <p className="text-sm text-muted-foreground">
                تسجيل الخروج تلقائياً بعد فترة من عدم النشاط
              </p>
            </div>
            <Switch
              id="autoLogout"
              checked={formValues.autoLogout}
              onCheckedChange={() => handleToggleChange('autoLogout')}
            />
          </div>
          
          {formValues.autoLogout && (
            <div className="space-y-2 pl-6 border-l">
              <Label htmlFor="inactivityTimeout">مهلة عدم النشاط (بالدقائق)</Label>
              <Input
                id="inactivityTimeout"
                name="inactivityTimeout"
                type="number"
                value={formValues.inactivityTimeout}
                onChange={handleInputChange}
                min={1}
              />
            </div>
          )}
        </div>
        
        <Separator />
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">إعدادات متقدمة</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableDebugMode">تمكين وضع التصحيح</Label>
              <p className="text-sm text-muted-foreground">
                تفعيل وضع التصحيح لعرض معلومات إضافية للأخطاء (للمطورين فقط)
              </p>
            </div>
            <Switch
              id="enableDebugMode"
              checked={formValues.enableDebugMode}
              onCheckedChange={() => handleToggleChange('enableDebugMode')}
            />
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

export default SystemSettings;
