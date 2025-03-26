
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Receipt, DollarSign, PercentIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useLocalStorage } from '@/hooks/use-local-storage';

const CommercialSettings = () => {
  const [settings, setSettings] = useLocalStorage('commercial-settings', {
    invoiceNumberPrefix: 'INV-',
    invoiceNumberSuffix: '',
    autoIncrementInvoices: true,
    nextInvoiceNumber: 1001,
    defaultPaymentTerms: 30,
    enableTax: true,
    defaultTaxRate: 15,
    defaultCurrency: 'SAR',
    enableDiscounts: true,
    maxDiscountPercentage: 15,
    requireApprovalAbove: 20,
    showPricesWithTax: true,
    enablePartialPayments: true,
    requirePaymentReferences: true,
    enableCreditLimits: true,
  });
  
  const [formValues, setFormValues] = useState(settings);
  const [activeTab, setActiveTab] = useState('invoices');
  
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
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value,
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
    toast.success('تم حفظ إعدادات المعاملات التجارية بنجاح');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات المعاملات التجارية</CardTitle>
        <CardDescription>
          تخصيص إعدادات الفواتير والمدفوعات والمبيعات
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="invoices" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="invoices" className="gap-2">
              <Receipt size={16} />
              <span>الفواتير</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <DollarSign size={16} />
              <span>المدفوعات</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-2">
              <PercentIcon size={16} />
              <span>التسعير والضرائب</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="invoices" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumberPrefix">بادئة رقم الفاتورة</Label>
                <Input
                  id="invoiceNumberPrefix"
                  name="invoiceNumberPrefix"
                  value={formValues.invoiceNumberPrefix}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceNumberSuffix">لاحقة رقم الفاتورة</Label>
                <Input
                  id="invoiceNumberSuffix"
                  name="invoiceNumberSuffix"
                  value={formValues.invoiceNumberSuffix}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoIncrementInvoices">زيادة أرقام الفواتير تلقائياً</Label>
                <p className="text-sm text-muted-foreground">
                  زيادة رقم الفاتورة تلقائياً عند إنشاء فاتورة جديدة
                </p>
              </div>
              <Switch
                id="autoIncrementInvoices"
                checked={formValues.autoIncrementInvoices}
                onCheckedChange={() => handleToggleChange('autoIncrementInvoices')}
              />
            </div>
            
            {formValues.autoIncrementInvoices && (
              <div className="space-y-2">
                <Label htmlFor="nextInvoiceNumber">رقم الفاتورة التالي</Label>
                <Input
                  id="nextInvoiceNumber"
                  name="nextInvoiceNumber"
                  type="number"
                  value={formValues.nextInvoiceNumber}
                  onChange={handleInputChange}
                  min={1}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="defaultPaymentTerms">شروط الدفع الافتراضية (بالأيام)</Label>
              <Input
                id="defaultPaymentTerms"
                name="defaultPaymentTerms"
                type="number"
                value={formValues.defaultPaymentTerms}
                onChange={handleInputChange}
                min={0}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="payments" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enablePartialPayments">تمكين المدفوعات الجزئية</Label>
                <p className="text-sm text-muted-foreground">
                  السماح بتسجيل مدفوعات جزئية على الفواتير
                </p>
              </div>
              <Switch
                id="enablePartialPayments"
                checked={formValues.enablePartialPayments}
                onCheckedChange={() => handleToggleChange('enablePartialPayments')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requirePaymentReferences">طلب مرجع للمدفوعات</Label>
                <p className="text-sm text-muted-foreground">
                  يتطلب إدخال رقم مرجعي عند تسجيل المدفوعات
                </p>
              </div>
              <Switch
                id="requirePaymentReferences"
                checked={formValues.requirePaymentReferences}
                onCheckedChange={() => handleToggleChange('requirePaymentReferences')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableCreditLimits">تمكين حدود الائتمان</Label>
                <p className="text-sm text-muted-foreground">
                  تطبيق حدود ائتمانية على حسابات العملاء
                </p>
              </div>
              <Switch
                id="enableCreditLimits"
                checked={formValues.enableCreditLimits}
                onCheckedChange={() => handleToggleChange('enableCreditLimits')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">العملة الافتراضية</Label>
              <Select 
                value={formValues.defaultCurrency} 
                onValueChange={(value) => handleSelectChange('defaultCurrency', value)}
              >
                <SelectTrigger id="defaultCurrency" className="w-full max-w-xs">
                  <SelectValue placeholder="اختر العملة الافتراضية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                  <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                  <SelectItem value="EUR">يورو (EUR)</SelectItem>
                  <SelectItem value="GBP">جنيه إسترليني (GBP)</SelectItem>
                  <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
          
          <TabsContent value="pricing" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableTax">تمكين الضرائب</Label>
                <p className="text-sm text-muted-foreground">
                  تطبيق الضرائب على الفواتير والمبيعات
                </p>
              </div>
              <Switch
                id="enableTax"
                checked={formValues.enableTax}
                onCheckedChange={() => handleToggleChange('enableTax')}
              />
            </div>
            
            {formValues.enableTax && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="defaultTaxRate">نسبة الضريبة الافتراضية (%)</Label>
                  <Input
                    id="defaultTaxRate"
                    name="defaultTaxRate"
                    type="number"
                    value={formValues.defaultTaxRate}
                    onChange={handleInputChange}
                    min={0}
                    max={100}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showPricesWithTax">عرض الأسعار شاملة الضريبة</Label>
                    <p className="text-sm text-muted-foreground">
                      عرض الأسعار متضمنة الضريبة في الفواتير والتقارير
                    </p>
                  </div>
                  <Switch
                    id="showPricesWithTax"
                    checked={formValues.showPricesWithTax}
                    onCheckedChange={() => handleToggleChange('showPricesWithTax')}
                  />
                </div>
              </>
            )}
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enableDiscounts">تمكين الخصومات</Label>
                <p className="text-sm text-muted-foreground">
                  السماح بتطبيق الخصومات على الفواتير والمبيعات
                </p>
              </div>
              <Switch
                id="enableDiscounts"
                checked={formValues.enableDiscounts}
                onCheckedChange={() => handleToggleChange('enableDiscounts')}
              />
            </div>
            
            {formValues.enableDiscounts && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="maxDiscountPercentage">أقصى نسبة خصم مسموح بها (%)</Label>
                  <Input
                    id="maxDiscountPercentage"
                    name="maxDiscountPercentage"
                    type="number"
                    value={formValues.maxDiscountPercentage}
                    onChange={handleInputChange}
                    min={0}
                    max={100}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="requireApprovalAbove">طلب موافقة للخصومات فوق (%)</Label>
                  <Input
                    id="requireApprovalAbove"
                    name="requireApprovalAbove"
                    type="number"
                    value={formValues.requireApprovalAbove}
                    onChange={handleInputChange}
                    min={0}
                    max={100}
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
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

export default CommercialSettings;
