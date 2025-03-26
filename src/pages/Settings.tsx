
import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Settings as SettingsIcon, Printer, Bell, Currency, FileText, Palette, Monitor, Database, ShieldCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const Settings = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  // Company settings
  const [companyName, setCompanyName] = useState('شركة نجوم الشرق للصناعات');
  const [companyPhone, setCompanyPhone] = useState('0123456789');
  const [companyAddress, setCompanyAddress] = useState('المنطقة الصناعية، القاهرة');
  const [companyTaxId, setCompanyTaxId] = useState('123456789');
  const [companyLogo, setCompanyLogo] = useState<FileList | null>(null);
  
  // Billing settings
  const [currency, setCurrency] = useState('EGP');
  const [taxRate, setTaxRate] = useState('14');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState('15');
  const [invoiceTheme, setInvoiceTheme] = useState('modern');
  const [invoiceNotes, setInvoiceNotes] = useState('شكراً لتعاملكم معنا. يرجى تسديد المبلغ خلال المدة المحددة.');
  
  // Notification settings
  const [lowStockNotifications, setLowStockNotifications] = useState(true);
  const [paymentNotifications, setPaymentNotifications] = useState(true);
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  
  // System settings
  const [language, setLanguage] = useState('ar');
  const [dateFormat, setDateFormat] = useState('dd/MM/yyyy');
  const [theme, setTheme] = useState('light');
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  
  const handleSaveSettings = () => {
    setSaving(true);
    
    // Simulate saving settings
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "تم حفظ الإعدادات",
        description: "تم حفظ إعدادات النظام بنجاح",
      });
    }, 1000);
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
            <p className="text-muted-foreground mt-1">إدارة إعدادات النظام وتخصيصه</p>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </div>
        
        <Tabs defaultValue="company" className="w-full" dir="rtl">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-4">
            <TabsTrigger value="company">الشركة</TabsTrigger>
            <TabsTrigger value="billing">الفوترة</TabsTrigger>
            <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
            <TabsTrigger value="system">النظام</TabsTrigger>
          </TabsList>
          
          <TabsContent value="company" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  <span>معلومات الشركة</span>
                </CardTitle>
                <CardDescription>
                  بيانات الشركة الأساسية التي تظهر في التقارير والفواتير
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">اسم الشركة</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">رقم الهاتف</Label>
                    <Input
                      id="companyPhone"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">العنوان</Label>
                  <Textarea
                    id="companyAddress"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyTaxId">الرقم الضريبي</Label>
                    <Input
                      id="companyTaxId"
                      value={companyTaxId}
                      onChange={(e) => setCompanyTaxId(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyLogo">شعار الشركة</Label>
                    <Input
                      id="companyLogo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCompanyLogo(e.target.files)}
                    />
                    <p className="text-xs text-muted-foreground">
                      يفضل استخدام صورة بخلفية شفافة بحجم 200×200 بكسل
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="billing" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Currency className="h-5 w-5" />
                  <span>إعدادات المالية</span>
                </CardTitle>
                <CardDescription>
                  إعدادات العملة والضرائب وطرق الدفع
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="currency">العملة</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="اختر العملة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EGP">جنيه مصري (ج.م)</SelectItem>
                        <SelectItem value="USD">دولار أمريكي ($)</SelectItem>
                        <SelectItem value="EUR">يورو (€)</SelectItem>
                        <SelectItem value="SAR">ريال سعودي (ر.س)</SelectItem>
                        <SelectItem value="AED">درهم إماراتي (د.إ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="taxRate">نسبة الضريبة (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="defaultPaymentTerms">شروط الدفع (بالأيام)</Label>
                    <Input
                      id="defaultPaymentTerms"
                      type="number"
                      min="0"
                      value={defaultPaymentTerms}
                      onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="invoicePrefix">بادئة رقم الفاتورة</Label>
                    <Input
                      id="invoicePrefix"
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invoiceTheme">تصميم الفاتورة</Label>
                    <Select value={invoiceTheme} onValueChange={setInvoiceTheme}>
                      <SelectTrigger id="invoiceTheme">
                        <SelectValue placeholder="اختر التصميم" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">كلاسيكي</SelectItem>
                        <SelectItem value="modern">عصري</SelectItem>
                        <SelectItem value="minimal">بسيط</SelectItem>
                        <SelectItem value="professional">احترافي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invoiceNotes">ملاحظات الفاتورة الافتراضية</Label>
                  <Textarea
                    id="invoiceNotes"
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="showDisclaimer"
                    checked={showDisclaimer}
                    onCheckedChange={setShowDisclaimer}
                  />
                  <Label htmlFor="showDisclaimer">إظهار إخلاء المسؤولية في الفواتير</Label>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  <span>إعدادات الطباعة</span>
                </CardTitle>
                <CardDescription>
                  خيارات طباعة الفواتير والتقارير
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>حجم الورق</Label>
                    <RadioGroup defaultValue="a4" dir="rtl">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <RadioGroupItem value="a4" id="a4" />
                        <Label htmlFor="a4">A4</Label>
                      </div>
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <RadioGroupItem value="letter" id="letter" />
                        <Label htmlFor="letter">Letter</Label>
                      </div>
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <RadioGroupItem value="thermal" id="thermal" />
                        <Label htmlFor="thermal">ورق حراري (80مم)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>خيارات الطباعة</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch id="printLogo" defaultChecked />
                        <Label htmlFor="printLogo">طباعة شعار الشركة</Label>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch id="printQRCode" defaultChecked />
                        <Label htmlFor="printQRCode">طباعة رمز QR للفاتورة</Label>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch id="printDuplicate" />
                        <Label htmlFor="printDuplicate">طباعة نسخة إضافية تلقائياً</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <span>إعدادات الإشعارات</span>
                </CardTitle>
                <CardDescription>
                  تكوين تنبيهات النظام والإشعارات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lowStockNotifications" className="flex-1">تنبيهات المخزون المنخفض</Label>
                    <Switch
                      id="lowStockNotifications"
                      checked={lowStockNotifications}
                      onCheckedChange={setLowStockNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="paymentNotifications" className="flex-1">إشعارات المدفوعات</Label>
                    <Switch
                      id="paymentNotifications"
                      checked={paymentNotifications}
                      onCheckedChange={setPaymentNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="orderNotifications" className="flex-1">إشعارات أوامر الإنتاج</Label>
                    <Switch
                      id="orderNotifications"
                      checked={orderNotifications}
                      onCheckedChange={setOrderNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailNotifications" className="flex-1">إرسال الإشعارات عبر البريد الإلكتروني</Label>
                    <Switch
                      id="emailNotifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <Label>تفضيلات الإشعارات</Label>
                  <RadioGroup defaultValue="all" dir="rtl">
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all">كافة الإشعارات</Label>
                    </div>
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <RadioGroupItem value="important" id="important" />
                      <Label htmlFor="important">الإشعارات المهمة فقط</Label>
                    </div>
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <RadioGroupItem value="none" id="none" />
                      <Label htmlFor="none">لا تظهر الإشعارات</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="system" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  <span>إعدادات العرض</span>
                </CardTitle>
                <CardDescription>
                  تخصيص واجهة المستخدم
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="language">اللغة</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <SelectValue placeholder="اختر اللغة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="dateFormat">تنسيق التاريخ</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger id="dateFormat">
                      <SelectValue placeholder="اختر تنسيق التاريخ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">يوم/شهر/سنة (31/12/2023)</SelectItem>
                      <SelectItem value="MM/dd/yyyy">شهر/يوم/سنة (12/31/2023)</SelectItem>
                      <SelectItem value="yyyy-MM-dd">سنة-شهر-يوم (2023-12-31)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label>السمة</Label>
                  <ToggleGroup type="single" value={theme} onValueChange={(value) => value && setTheme(value)}>
                    <ToggleGroupItem value="light" aria-label="Light theme">
                      فاتح
                    </ToggleGroupItem>
                    <ToggleGroupItem value="dark" aria-label="Dark theme">
                      داكن
                    </ToggleGroupItem>
                    <ToggleGroupItem value="system" aria-label="System theme">
                      تلقائي
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  <span>النسخ الاحتياطي واستعادة البيانات</span>
                </CardTitle>
                <CardDescription>
                  إدارة النسخ الاحتياطي واستعادة البيانات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoBackup" className="flex-1">النسخ الاحتياطي التلقائي</Label>
                  <Switch
                    id="autoBackup"
                    checked={autoBackup}
                    onCheckedChange={setAutoBackup}
                  />
                </div>
                
                {autoBackup && (
                  <div className="space-y-3">
                    <Label htmlFor="backupFrequency">معدل النسخ الاحتياطي</Label>
                    <Select 
                      value={backupFrequency} 
                      onValueChange={setBackupFrequency}
                      disabled={!autoBackup}
                    >
                      <SelectTrigger id="backupFrequency">
                        <SelectValue placeholder="اختر معدل النسخ الاحتياطي" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">يومي</SelectItem>
                        <SelectItem value="weekly">أسبوعي</SelectItem>
                        <SelectItem value="monthly">شهري</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
                  <Button className="w-full sm:w-auto">
                    إنشاء نسخة احتياطية الآن
                  </Button>
                  <Button variant="outline" className="w-full sm:w-auto">
                    استعادة من نسخة احتياطية
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  <span>الأمان</span>
                </CardTitle>
                <CardDescription>
                  إعدادات الأمان والخصوصية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="logLoginAttempts" className="flex-1">تسجيل محاولات تسجيل الدخول</Label>
                  <Switch id="logLoginAttempts" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auditChanges" className="flex-1">تدقيق التغييرات في البيانات</Label>
                  <Switch id="auditChanges" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="inactivityLogout" className="flex-1">تسجيل الخروج عند عدم النشاط</Label>
                  <Switch id="inactivityLogout" defaultChecked />
                </div>
                <div className="pt-3">
                  <Button variant="outline" className="w-full sm:w-auto">
                    عرض سجل النشاط
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default Settings;
