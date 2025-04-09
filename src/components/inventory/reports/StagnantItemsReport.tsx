
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Filter, Eye, CalendarClock } from 'lucide-react';
import { enhancedToast } from '@/components/ui/enhanced-toast';
import { useNavigate } from 'react-router-dom';

interface StagnantItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  type: 'raw' | 'packaging' | 'semi' | 'finished';
  typeName: string;
  lastMovement: string | null;
  daysSinceLastMovement: number | null;
}

const StagnantItemsReport = () => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [timeThreshold, setTimeThreshold] = useState<string>('90');
  const navigate = useNavigate();
  
  const { data: stagnantItems, isLoading } = useQuery({
    queryKey: ['stagnant-items', selectedType, timeThreshold],
    queryFn: async () => {
      try {
        // Get the current date and calculate threshold date
        const now = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(now.getDate() - parseInt(timeThreshold));
        
        // Get all inventory movements
        const { data: movements, error: movError } = await supabase
          .from('inventory_movements')
          .select('item_id, item_type, created_at')
          .order('created_at', { ascending: false });
          
        if (movError) throw movError;
        
        // Create a map of last movement date for each item
        const lastMovementMap = new Map();
        movements?.forEach(movement => {
          const key = `${movement.item_type}-${movement.item_id}`;
          if (!lastMovementMap.has(key)) {
            lastMovementMap.set(key, movement.created_at);
          }
        });
        
        // Prepare arrays to hold results from each category
        const results: StagnantItem[] = [];
        
        // Process raw materials if needed
        if (selectedType === 'all' || selectedType === 'raw') {
          const { data: items, error } = await supabase
            .from('raw_materials')
            .select('id, code, name, quantity, unit');
            
          if (error) throw error;
          
          for (const item of items || []) {
            const lastMovementDate = lastMovementMap.get(`raw-${item.id}`);
            
            // Calculate days since last movement
            let daysSince = null;
            if (lastMovementDate) {
              const lastDate = new Date(lastMovementDate);
              const diffTime = Math.abs(now.getTime() - lastDate.getTime());
              daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              // If movement is more recent than threshold, this isn't stagnant
              if (lastDate > thresholdDate) continue;
            } else {
              // If no movement found, consider it stagnant
              daysSince = 1000; // Arbitrary large number
            }
            
            // Add to stagnant items
            if (daysSince !== null && daysSince >= parseInt(timeThreshold)) {
              results.push({
                id: item.id,
                code: item.code,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                type: 'raw',
                typeName: 'مواد خام',
                lastMovement: lastMovementDate,
                daysSinceLastMovement: daysSince
              });
            }
          }
        }
        
        // Process packaging materials if needed
        if (selectedType === 'all' || selectedType === 'packaging') {
          const { data: items, error } = await supabase
            .from('packaging_materials')
            .select('id, code, name, quantity, unit');
            
          if (error) throw error;
          
          for (const item of items || []) {
            const lastMovementDate = lastMovementMap.get(`packaging-${item.id}`);
            
            // Calculate days since last movement
            let daysSince = null;
            if (lastMovementDate) {
              const lastDate = new Date(lastMovementDate);
              const diffTime = Math.abs(now.getTime() - lastDate.getTime());
              daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              // If movement is more recent than threshold, this isn't stagnant
              if (lastDate > thresholdDate) continue;
            } else {
              // If no movement found, consider it stagnant
              daysSince = 1000; // Arbitrary large number
            }
            
            // Add to stagnant items
            if (daysSince !== null && daysSince >= parseInt(timeThreshold)) {
              results.push({
                id: item.id,
                code: item.code,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                type: 'packaging',
                typeName: 'مواد تعبئة',
                lastMovement: lastMovementDate,
                daysSinceLastMovement: daysSince
              });
            }
          }
        }
        
        // Process semi-finished products if needed
        if (selectedType === 'all' || selectedType === 'semi') {
          const { data: items, error } = await supabase
            .from('semi_finished_products')
            .select('id, code, name, quantity, unit');
            
          if (error) throw error;
          
          for (const item of items || []) {
            const lastMovementDate = lastMovementMap.get(`semi-${item.id}`);
            
            // Calculate days since last movement
            let daysSince = null;
            if (lastMovementDate) {
              const lastDate = new Date(lastMovementDate);
              const diffTime = Math.abs(now.getTime() - lastDate.getTime());
              daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              // If movement is more recent than threshold, this isn't stagnant
              if (lastDate > thresholdDate) continue;
            } else {
              // If no movement found, consider it stagnant
              daysSince = 1000; // Arbitrary large number
            }
            
            // Add to stagnant items
            if (daysSince !== null && daysSince >= parseInt(timeThreshold)) {
              results.push({
                id: item.id,
                code: item.code,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                type: 'semi',
                typeName: 'منتجات نصف مصنعة',
                lastMovement: lastMovementDate,
                daysSinceLastMovement: daysSince
              });
            }
          }
        }
        
        // Process finished products if needed
        if (selectedType === 'all' || selectedType === 'finished') {
          const { data: items, error } = await supabase
            .from('finished_products')
            .select('id, code, name, quantity, unit');
            
          if (error) throw error;
          
          for (const item of items || []) {
            const lastMovementDate = lastMovementMap.get(`finished-${item.id}`);
            
            // Calculate days since last movement
            let daysSince = null;
            if (lastMovementDate) {
              const lastDate = new Date(lastMovementDate);
              const diffTime = Math.abs(now.getTime() - lastDate.getTime());
              daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              // If movement is more recent than threshold, this isn't stagnant
              if (lastDate > thresholdDate) continue;
            } else {
              // If no movement found, consider it stagnant
              daysSince = 1000; // Arbitrary large number
            }
            
            // Add to stagnant items
            if (daysSince !== null && daysSince >= parseInt(timeThreshold)) {
              results.push({
                id: item.id,
                code: item.code,
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                type: 'finished',
                typeName: 'منتجات نهائية',
                lastMovement: lastMovementDate,
                daysSinceLastMovement: daysSince
              });
            }
          }
        }
        
        // Sort by days since last movement (descending)
        return results.sort((a, b) => {
          if (a.daysSinceLastMovement === null) return 1;
          if (b.daysSinceLastMovement === null) return -1;
          return b.daysSinceLastMovement - a.daysSinceLastMovement;
        });
      } catch (error) {
        console.error("Error fetching stagnant items:", error);
        enhancedToast.error("حدث خطأ أثناء جلب بيانات العناصر الراكدة");
        return [];
      }
    },
    refetchOnWindowFocus: false
  });
  
  const getStatusBadge = (days: number | null) => {
    if (days === null) return <Badge variant="outline">غير معروف</Badge>;
    if (days > 180) return <Badge variant="destructive">راكد جداً</Badge>;
    if (days > 90) return <Badge variant="warning">راكد</Badge>;
    return <Badge variant="secondary">بطيء الحركة</Badge>;
  };
  
  const viewItemDetails = (item: StagnantItem) => {
    let route = '';
    
    switch (item.type) {
      case 'raw':
        route = `/inventory/raw-materials/${item.id}`;
        break;
      case 'packaging':
        route = `/inventory/packaging-materials/${item.id}`;
        break;
      case 'semi':
        route = `/inventory/semi-finished/${item.id}`;
        break;
      case 'finished':
        route = `/inventory/finished-products/${item.id}`;
        break;
    }
    
    // Navigate to the item details
    if (route) {
      navigate(route);
    } else {
      enhancedToast.warning("تعذر فتح تفاصيل العنصر");
    }
  };
  
  return (
    <Card id="stagnant-items">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center">
          <Clock className="mr-2 h-5 w-5 text-amber-500" />
          تقرير العناصر الراكدة
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-muted-foreground" />
            <Select value={timeThreshold} onValueChange={setTimeThreshold}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="مدة الركود" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 يوم</SelectItem>
                <SelectItem value="60">60 يوم</SelectItem>
                <SelectItem value="90">90 يوم</SelectItem>
                <SelectItem value="180">180 يوم</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted-foreground" />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="نوع العنصر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="raw">المواد الخام</SelectItem>
                <SelectItem value="packaging">مواد التعبئة</SelectItem>
                <SelectItem value="semi">منتجات نصف مصنعة</SelectItem>
                <SelectItem value="finished">منتجات نهائية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : stagnantItems && stagnantItems.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead className="text-center">الكمية</TableHead>
                  <TableHead className="text-center">آخر حركة</TableHead>
                  <TableHead className="text-center">عدد الأيام</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center w-[100px]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stagnantItems.map((item) => (
                  <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          item.type === 'raw' ? 'default' : 
                          item.type === 'packaging' ? 'secondary' :
                          item.type === 'semi' ? 'outline' : 'success'
                        }
                      >
                        {item.typeName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.lastMovement 
                        ? new Date(item.lastMovement).toLocaleDateString('ar-EG')
                        : 'لا يوجد حركات'
                      }
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {item.daysSinceLastMovement !== null 
                        ? `${item.daysSinceLastMovement} يوم`
                        : 'غير معروف'
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(item.daysSinceLastMovement)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => viewItemDetails(item)}>
                        <Eye size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Clock className="mx-auto h-12 w-12 text-amber-500 opacity-50 mb-4" />
            <h3 className="mt-2 text-lg font-semibold">لا توجد عناصر راكدة</h3>
            <p className="text-muted-foreground mt-1">
              لم يتم العثور على عناصر بدون حركة لأكثر من {timeThreshold} يوم
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StagnantItemsReport;
