
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DatabaseBackupSettingsProps {
  formValues: any;
  handleToggleChange: (field: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
}

const DatabaseBackupSettings: React.FC<DatabaseBackupSettingsProps> = ({
  formValues,
  handleToggleChange,
  handleInputChange,
  handleSelectChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">النسخ الاحتياطي التلقائي</h3>
      
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
    </div>
  );
};

export default DatabaseBackupSettings;
