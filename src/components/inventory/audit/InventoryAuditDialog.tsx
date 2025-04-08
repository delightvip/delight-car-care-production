
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AuditItem {
  id: number;
  name: string;
  code: string;
  currentQuantity: number;
  actualQuantity: number;
  unit: string;
}

interface InventoryAuditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryType: 'raw_materials' | 'semi_finished_products' | 'packaging_materials' | 'finished_products';
  title: string;
}

const InventoryAuditDialog: React.FC<InventoryAuditDialogProps> = ({
  isOpen,
  onClose,
  inventoryType,
  title
}) => {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch inventory items
  useEffect(() => {
    if (isOpen) {
      fetchInventoryItems();
    }
  }, [isOpen, inventoryType]);

  const fetchInventoryItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(inventoryType)
        .select('id, name, code, quantity, unit')
        .order('name', { ascending: true });

      if (error) throw error;

      const formattedItems = data.map(item => ({
        id: item.id,
        name: item.name,
        code: item.code,
        currentQuantity: Number(item.quantity),
        actualQuantity: Number(item.quantity), // Initialize with current quantity
        unit: item.unit
      }));

      setItems(formattedItems);
    } catch (error) {
      console.error(`Error fetching ${inventoryType}:`, error);
      toast.error(`حدث خطأ أثناء جلب بيانات المخزون`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (id: number, value: string) => {
    const newValue = value === '' ? 0 : Number(value);
    
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, actualQuantity: newValue } : item
      )
    );
  };

  const handleSaveAudit = async () => {
    setIsSaving(true);
    try {
      // Filter only items where quantities changed
      const changedItems = items.filter(item => item.actualQuantity !== item.currentQuantity);
      
      if (changedItems.length === 0) {
        toast.info('لم يتم تغيير أي كميات');
        onClose();
        return;
      }

      // Update each item in the database
      for (const item of changedItems) {
        // Update quantity in the appropriate table
        const { error: updateError } = await supabase
          .from(inventoryType)
          .update({ quantity: item.actualQuantity })
          .eq('id', item.id);

        if (updateError) throw updateError;

        // Record the inventory movement
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert({
            item_id: item.id.toString(),
            item_type: inventoryType === 'raw_materials' ? 'raw' : 
                      inventoryType === 'semi_finished_products' ? 'semi' : 
                      inventoryType === 'packaging_materials' ? 'packaging' : 'finished',
            movement_type: item.actualQuantity > item.currentQuantity ? 'in' : 'out',
            quantity: item.actualQuantity > item.currentQuantity ? 
                      item.actualQuantity - item.currentQuantity : 
                      -(item.currentQuantity - item.actualQuantity),
            balance_after: item.actualQuantity,
            reason: 'جرد مخزون'
          });

        if (movementError) throw movementError;
      }

      toast.success('تم حفظ الجرد بنجاح');
      onClose();
    } catch (error) {
      console.error('Error saving inventory audit:', error);
      toast.error('حدث خطأ أثناء حفظ الجرد');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter items based on search query
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <Input
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="mr-2">جاري تحميل البيانات...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-muted/50">
                <tr>
                  <th className="border p-2 text-right">الكود</th>
                  <th className="border p-2 text-right">الاسم</th>
                  <th className="border p-2 text-right">الكمية الحالية</th>
                  <th className="border p-2 text-right">الكمية الفعلية</th>
                  <th className="border p-2 text-right">وحدة القياس</th>
                  <th className="border p-2 text-right">الفرق</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const difference = item.actualQuantity - item.currentQuantity;
                  const differenceClass = difference === 0 
                    ? "" 
                    : difference > 0 
                      ? "text-green-600" 
                      : "text-red-600";
                  
                  return (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="border p-2">{item.code}</td>
                      <td className="border p-2">{item.name}</td>
                      <td className="border p-2">{item.currentQuantity}</td>
                      <td className="border p-2">
                        <Input
                          type="number"
                          min={0}
                          value={item.actualQuantity}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          className="w-24"
                        />
                      </td>
                      <td className="border p-2">{item.unit}</td>
                      <td className={`border p-2 ${differenceClass}`}>
                        {difference > 0 ? `+${difference}` : difference}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSaving}
          >
            إلغاء
          </Button>
          <Button 
            onClick={handleSaveAudit} 
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : 'حفظ الجرد'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryAuditDialog;
