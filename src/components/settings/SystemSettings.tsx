
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/use-local-storage';
import BackupRestoreCard from './backup/BackupRestoreCard';
import FactoryResetCard from './system/FactoryResetCard';
import SystemSettingsCard from './system/SystemSettingsCard';

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
  
  return (
    <div className="space-y-6">
      <SystemSettingsCard 
        formValues={formValues}
        handleToggleChange={handleToggleChange}
        handleInputChange={handleInputChange}
        handleSelectChange={handleSelectChange}
        handleSave={handleSave}
      />
      
      <BackupRestoreCard />
      
      <FactoryResetCard />
    </div>
  );
};

export default SystemSettings;
