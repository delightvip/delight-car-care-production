
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DateTimeSettingsProps {
  formValues: any;
  handleSelectChange: (name: string, value: string) => void;
}

const DateTimeSettings: React.FC<DateTimeSettingsProps> = ({
  formValues,
  handleSelectChange
}) => {
  return (
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
  );
};

export default DateTimeSettings;
