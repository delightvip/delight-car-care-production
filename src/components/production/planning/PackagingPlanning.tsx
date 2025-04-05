
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Calendar as CalendarIcon, Search, Printer, FileDown } from 'lucide-react';
import InventoryService from '@/services/InventoryService';

const PackagingPlanning = () => {
  const [packagingMaterials, setPackagingMaterials] = useState<any[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const inventoryService = InventoryService.getInstance();
        const materials = await inventoryService.getPackagingMaterials();
        setPackagingMaterials(materials);
      } catch (error) {
        console.error('Error fetching packaging materials', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const filteredMaterials = packagingMaterials.filter(
    material => material.name.includes(searchQuery) || material.code.includes(searchQuery)
  );
  
  const estimatedDaysLeft = (quantity: number, minStock: number) => {
    if (quantity <= minStock) return 0;
    // Assuming average daily consumption is 15% of min_stock
    const dailyConsumption = minStock * 0.15;
    if (dailyConsumption <= 0) return 999; // Effectively infinite if no consumption
    return Math.floor((quantity - minStock) / dailyConsumption);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="بحث..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex-1 flex justify-end">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal w-full md:w-auto",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: ar }) : <span>اختر تاريخ</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <FileDown size={16} />
            <span>تصدير</span>
          </Button>
          <Button variant="outline" className="gap-2">
            <Printer size={16} />
            <span>طباعة</span>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الكمية الحالية</TableHead>
                  <TableHead>الحد الأدنى</TableHead>
                  <TableHead>الأهمية</TableHead>
                  <TableHead>الأيام المتبقية (تقديرياً)</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">جاري التحميل...</TableCell>
                  </TableRow>
                ) : filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">لا توجد مواد تعبئة</TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map((material) => {
                    const daysLeft = estimatedDaysLeft(material.quantity, material.min_stock);
                    let statusClass = 'bg-green-100 text-green-800';
                    
                    if (daysLeft < 7) statusClass = 'bg-red-100 text-red-800';
                    else if (daysLeft < 14) statusClass = 'bg-yellow-100 text-yellow-800';
                    
                    return (
                      <TableRow key={material.id}>
                        <TableCell>{material.code}</TableCell>
                        <TableCell>{material.name}</TableCell>
                        <TableCell>{material.quantity} {material.unit}</TableCell>
                        <TableCell>{material.min_stock} {material.unit}</TableCell>
                        <TableCell>
                          {material.importance > 0 ? (
                            <div className="flex">
                              {Array.from({ length: Math.min(material.importance, 5) }).map((_, i) => (
                                <span key={i} className="text-amber-500">★</span>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{daysLeft} يوم</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>
                            {daysLeft < 7
                              ? 'يجب الشراء'
                              : daysLeft < 14
                              ? 'قريباً'
                              : 'متوفر'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PackagingPlanning;
