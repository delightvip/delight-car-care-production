
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { BadgeMinus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

// Define types for low stock items
interface BaseLowStockItem {
  id: number;
  name: string;
  quantity: number;
  min_stock: number;
}

interface RawMaterialLowStock extends BaseLowStockItem {
  type: 'raw_material';
}

interface SemiFinishedLowStock extends BaseLowStockItem {
  type: 'semi_finished';
}

interface PackagingLowStock extends BaseLowStockItem {
  type: 'packaging';
}

interface FinishedProductLowStock extends BaseLowStockItem {
  type: 'finished_product';
}

type LowStockItem = 
  | RawMaterialLowStock
  | SemiFinishedLowStock
  | PackagingLowStock
  | FinishedProductLowStock;

const fetchLowStockItems = async (): Promise<LowStockItem[]> => {
  const items: LowStockItem[] = [];
  
  // Fetch raw materials with low stock
  const { data: rawMaterials, error: rawError } = await supabase
    .from('raw_materials')
    .select('id, name, quantity, min_stock')
    .lt('quantity', 'min_stock');
  
  if (rawError) console.error('Error fetching raw materials:', rawError);
  if (rawMaterials) {
    items.push(...rawMaterials.map(item => ({ ...item, type: 'raw_material' as const })));
  }
  
  // Fetch semi-finished products with low stock
  const { data: semiFinished, error: semiError } = await supabase
    .from('semi_finished_products')
    .select('id, name, quantity, min_stock')
    .lt('quantity', 'min_stock');
  
  if (semiError) console.error('Error fetching semi-finished products:', semiError);
  if (semiFinished) {
    items.push(...semiFinished.map(item => ({ ...item, type: 'semi_finished' as const })));
  }
  
  // Fetch packaging materials with low stock
  const { data: packaging, error: packagingError } = await supabase
    .from('packaging_materials')
    .select('id, name, quantity, min_stock')
    .lt('quantity', 'min_stock');
  
  if (packagingError) console.error('Error fetching packaging materials:', packagingError);
  if (packaging) {
    items.push(...packaging.map(item => ({ ...item, type: 'packaging' as const })));
  }
  
  // Fetch finished products with low stock
  const { data: finished, error: finishedError } = await supabase
    .from('finished_products')
    .select('id, name, quantity, min_stock')
    .lt('quantity', 'min_stock');
  
  if (finishedError) console.error('Error fetching finished products:', finishedError);
  if (finished) {
    items.push(...finished.map(item => ({ ...item, type: 'finished_product' as const })));
  }
  
  return items;
};

const LowStockNotifier: React.FC = () => {
  const { toast } = useToast();
  const [notifiedItems, setNotifiedItems] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);
  
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: fetchLowStockItems,
    refetchInterval: 60000, // Refetch every minute
  });
  
  useEffect(() => {
    // Check for new low stock items and notify
    lowStockItems.forEach((item) => {
      const itemKey = `${item.type}-${item.id}`;
      if (!notifiedItems.has(item.id)) {
        toast({
          title: "المخزون منخفض",
          description: `${item.name} أصبح أقل من الحد الأدنى (${item.quantity}/${item.min_stock})`,
          variant: "destructive",
        });
        
        setNotifiedItems(prev => {
          const updated = new Set(prev);
          updated.add(item.id);
          return updated;
        });
      }
    });
  }, [lowStockItems, toast, notifiedItems]);
  
  if (lowStockItems.length === 0) return null;
  
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="fixed bottom-4 left-4 z-50 bg-white shadow-lg"
        >
          <BadgeMinus className="h-5 w-5 text-red-500" />
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
          >
            {lowStockItems.length}
          </Badge>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>المخزون المنخفض</DrawerTitle>
          <DrawerDescription>
            هناك {lowStockItems.length} من العناصر التي وصلت إلى حد المخزون المنخفض
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-2 max-h-96 overflow-auto">
          {lowStockItems.map((item) => (
            <div 
              key={`${item.type}-${item.id}`}
              className="border rounded-lg p-3 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  الكمية: <span className="text-red-500">{item.quantity}</span> / الحد الأدنى: {item.min_stock}
                </p>
              </div>
              <Badge variant="destructive">
                {item.type === 'raw_material' && 'مواد أولية'}
                {item.type === 'semi_finished' && 'نصف مصنعة'}
                {item.type === 'packaging' && 'تعبئة'}
                {item.type === 'finished_product' && 'منتج نهائي'}
              </Badge>
            </div>
          ))}
        </div>
        <DrawerFooter>
          <Link to="/inventory/low-stock">
            <Button className="w-full">عرض كل المخزون المنخفض</Button>
          </Link>
          <DrawerClose asChild>
            <Button variant="outline">إغلاق</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default LowStockNotifier;
