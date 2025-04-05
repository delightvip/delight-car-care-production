
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

interface SecuritySettingsProps {
  formValues: any;
  handleToggleChange: (field: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  formValues,
  handleToggleChange,
  handleInputChange
}) => {
  return (
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
  );
};

export default SecuritySettings;
