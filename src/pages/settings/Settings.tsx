
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import PageTransition from '@/components/ui/PageTransition';
import { useTheme } from '@/components/theme-provider';
import { 
  Save, 
  RefreshCw, 
  Database, 
  Network, 
  PaintBucket, 
  Bell, 
  FileText, 
  Copy, 
  User, 
  Building, 
  Package, 
  Truck, 
  Receipt 
} from 'lucide-react';
import NotificationSettings from '@/components/settings/NotificationSettings';
import CompanySettings from '@/components/settings/CompanySettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import InventorySettings from '@/components/settings/InventorySettings';
import CommercialSettings from '@/components/settings/CommercialSettings';
import SystemSettings from '@/components/settings/SystemSettings';

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = React.useState('general');
  
  return (
    <PageTransition>
      <div className="container mx-auto py-6">
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
            <p className="text-muted-foreground">إدارة إعدادات النظام والتفضيلات الشخصية</p>
          </div>
          
          <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto py-2">
              <TabsTrigger value="general" className="gap-2">
                <Building size={16} />
                <span>معلومات الشركة</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2">
                <PaintBucket size={16} />
                <span>المظهر</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell size={16} />
                <span>الإشعارات</span>
              </TabsTrigger>
              <TabsTrigger value="inventory" className="gap-2">
                <Package size={16} />
                <span>المخزون</span>
              </TabsTrigger>
              <TabsTrigger value="commercial" className="gap-2">
                <Receipt size={16} />
                <span>المعاملات التجارية</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="gap-2">
                <Database size={16} />
                <span>النظام</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4">
              <CompanySettings />
            </TabsContent>
            
            <TabsContent value="appearance" className="space-y-4">
              <AppearanceSettings />
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-4">
              <NotificationSettings />
            </TabsContent>
            
            <TabsContent value="inventory" className="space-y-4">
              <InventorySettings />
            </TabsContent>
            
            <TabsContent value="commercial" className="space-y-4">
              <CommercialSettings />
            </TabsContent>
            
            <TabsContent value="system" className="space-y-4">
              <SystemSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
};

export default Settings;
