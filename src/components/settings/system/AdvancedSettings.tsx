
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface AdvancedSettingsProps {
  formValues: any;
  handleToggleChange: (field: string) => void;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  formValues,
  handleToggleChange
}) => {
  return (
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
  );
};

export default AdvancedSettings;
