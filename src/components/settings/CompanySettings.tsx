
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';

const CompanySettings = () => {
  const [companySettings, setCompanySettings] = useLocalStorage('company-settings', {
    name: '',
    taxNumber: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    logo: '',
  });

  const [formValues, setFormValues] = useState(companySettings);
  
  useEffect(() => {
    setFormValues(companySettings);
  }, [companySettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCompanySettings(formValues);
    toast.success('تم حفظ معلومات الشركة بنجاح');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>معلومات الشركة</CardTitle>
        <CardDescription>
          قم بإدخال معلومات الشركة الأساسية التي ستظهر في التقارير والفواتير
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الشركة</Label>
              <Input 
                id="name" 
                name="name" 
                value={formValues.name} 
                onChange={handleChange} 
                placeholder="اسم الشركة" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxNumber">الرقم الضريبي</Label>
              <Input 
                id="taxNumber" 
                name="taxNumber" 
                value={formValues.taxNumber} 
                onChange={handleChange} 
                placeholder="الرقم الضريبي" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input 
                id="phone" 
                name="phone" 
                value={formValues.phone} 
                onChange={handleChange} 
                placeholder="رقم الهاتف" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                value={formValues.email} 
                onChange={handleChange} 
                placeholder="البريد الإلكتروني" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">الموقع الإلكتروني</Label>
              <Input 
                id="website" 
                name="website" 
                value={formValues.website} 
                onChange={handleChange} 
                placeholder="الموقع الإلكتروني" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">شعار الشركة (رابط)</Label>
              <Input 
                id="logo" 
                name="logo" 
                value={formValues.logo} 
                onChange={handleChange} 
                placeholder="رابط شعار الشركة" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">العنوان</Label>
            <Textarea 
              id="address" 
              name="address" 
              value={formValues.address} 
              onChange={handleChange} 
              placeholder="عنوان الشركة" 
              rows={3} 
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="gap-2">
            <Save size={16} />
            حفظ المعلومات
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default CompanySettings;
