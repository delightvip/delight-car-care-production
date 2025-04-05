
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save } from 'lucide-react';
import DatabaseBackupSettings from './DatabaseBackupSettings';
import DateTimeSettings from './DateTimeSettings';
import SecuritySettings from './SecuritySettings';
import AdvancedSettings from './AdvancedSettings';

interface SystemSettingsCardProps {
  formValues: any;
  handleToggleChange: (field: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleSave: () => void;
}

const SystemSettingsCard: React.FC<SystemSettingsCardProps> = ({
  formValues,
  handleToggleChange,
  handleInputChange,
  handleSelectChange,
  handleSave
}) => {
  return (
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
  );
};

export default SystemSettingsCard;
