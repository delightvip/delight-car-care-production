
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useLocalStorage } from '@/hooks/use-local-storage';
import BackupRestoreCard from './backup/BackupRestoreCard';
import FactoryResetDialog from './factory-reset/FactoryResetDialog';
import DatabaseBackupSettings from './system/DatabaseBackupSettings';
import DateTimeSettings from './system/DateTimeSettings';
import SecuritySettings from './system/SecuritySettings';
import AdvancedSettings from './system/AdvancedSettings';

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
  const [isFactoryResetDialogOpen, setIsFactoryResetDialogOpen] = useState(false);
  
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
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات النظام</CardTitle>
          <CardDescription>
            إعدادات عامة للنظام والنسخ الاحتياطي وصيانة البيانات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DatabaseBackupSettings 
            formValues={formValues} 
            handleToggleChange={handleToggleChange}
            handleInputChange={handleInputChange}
            handleSelectChange={handleSelectChange}
          />
          
          <Separator />
          
          <DateTimeSettings 
            formValues={formValues} 
            handleSelectChange={handleSelectChange}
          />
          
          <Separator />
          
          <SecuritySettings 
            formValues={formValues} 
            handleToggleChange={handleToggleChange}
            handleInputChange={handleInputChange}
          />
          
          <Separator />
          
          <AdvancedSettings 
            formValues={formValues} 
            handleToggleChange={handleToggleChange}
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} className="gap-2">
            <Save size={16} />
            حفظ الإعدادات
          </Button>
        </CardFooter>
      </Card>
      
      <BackupRestoreCard />
      
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 size={20} />
            <span>إعادة ضبط النظام</span>
          </CardTitle>
          <CardDescription>
            إعادة ضبط النظام إلى الإعدادات الافتراضية وحذف جميع البيانات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            سيؤدي هذا الإجراء إلى إعادة ضبط جميع بيانات النظام وإزالة جميع السجلات. 
            يرجى التأكد من إنشاء نسخة احتياطية قبل المتابعة.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="destructive" 
            className="gap-2"
            onClick={() => setIsFactoryResetDialogOpen(true)}
          >
            <Trash2 size={16} />
            إعادة ضبط المصنع
          </Button>
        </CardFooter>
      </Card>

      <FactoryResetDialog
        open={isFactoryResetDialogOpen}
        onOpenChange={setIsFactoryResetDialogOpen}
      />
    </div>
  );
};

export default SystemSettings;
