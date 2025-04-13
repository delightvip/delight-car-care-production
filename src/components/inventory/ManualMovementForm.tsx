
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import InventoryMovementService, { ManualMovementData } from '@/services/InventoryMovementService';

interface ManualMovementFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ManualMovementForm: React.FC<ManualMovementFormProps> = ({ onSuccess, onCancel }) => {
  const [type, setType] = useState<'in' | 'out'>('in');
  const [category, setCategory] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const inventoryMovementService = InventoryMovementService.getInstance();
  
  // Fetch inventory items based on category
  const { data: inventoryItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['inventoryItems', category],
    queryFn: async () => {
      if (!category) return [];
      
      let tableName = '';
      switch (category) {
        case 'raw_materials': tableName = 'raw_materials'; break;
        case 'semi_finished': tableName = 'semi_finished_products'; break;
        case 'finished_products': tableName = 'finished_products'; break;
        case 'packaging': tableName = 'packaging_materials'; break;
        default: return [];
      }
      
      const { data, error } = await supabase
        .from(tableName)
        .select('id, code, name, unit, quantity')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!category
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !itemId || quantity <= 0) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const selectedItem = inventoryItems.find(item => item.id.toString() === itemId);
      
      if (!selectedItem) {
        toast.error('لم يتم العثور على العنصر المحدد');
        return;
      }
      
      const movementData: ManualMovementData = {
        type,
        category,
        item_id: Number(itemId),
        item_name: selectedItem.name,
        quantity,
        unit: selectedItem.unit,
        note,
        date: new Date()
      };
      
      const result = await inventoryMovementService.createManualInventoryMovement(movementData);
      
      if (result) {
        toast.success(
          type === 'in'
            ? `تمت إضافة ${quantity} ${selectedItem.unit} من ${selectedItem.name} بنجاح`
            : `تم خصم ${quantity} ${selectedItem.unit} من ${selectedItem.name} بنجاح`
        );
        onSuccess();
      } else {
        toast.error('فشل في إنشاء حركة المخزون');
      }
    } catch (error) {
      console.error('Error creating inventory movement:', error);
      toast.error('حدث خطأ أثناء إنشاء حركة المخزون');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getSelectedItemQuantity = () => {
    if (!itemId) return null;
    const selectedItem = inventoryItems.find(item => item.id.toString() === itemId);
    return selectedItem?.quantity;
  };
  
  const currentQuantity = getSelectedItemQuantity();
  const isInsufficientQuantity = type === 'out' && currentQuantity !== null && quantity > currentQuantity;
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">نوع الحركة</Label>
          <Select
            value={type}
            onValueChange={(value) => setType(value as 'in' | 'out')}
            disabled={isSubmitting}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="اختر نوع الحركة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in">وارد (إضافة للمخزون)</SelectItem>
              <SelectItem value="out">صادر (خصم من المخزون)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category">الفئة</Label>
          <Select
            value={category}
            onValueChange={setCategory}
            disabled={isSubmitting}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="اختر الفئة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="raw_materials">المواد الأولية</SelectItem>
              <SelectItem value="semi_finished">المنتجات النصف مصنعة</SelectItem>
              <SelectItem value="packaging">مستلزمات التعبئة</SelectItem>
              <SelectItem value="finished_products">المنتجات النهائية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="item">الصنف</Label>
        <Select
          value={itemId}
          onValueChange={setItemId}
          disabled={!category || isLoadingItems || isSubmitting}
        >
          <SelectTrigger id="item">
            <SelectValue placeholder={isLoadingItems ? 'جاري التحميل...' : 'اختر الصنف'} />
          </SelectTrigger>
          <SelectContent>
            {inventoryItems.map(item => (
              <SelectItem key={item.id} value={item.id.toString()}>
                {item.name} ({item.code}) - المتاح: {item.quantity} {item.unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="quantity">الكمية</Label>
        <Input
          id="quantity"
          type="number"
          min={type === 'out' ? '0.01' : '0.01'}
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(parseFloat(e.target.value))}
          disabled={isSubmitting}
        />
      </div>
      
      {isInsufficientQuantity && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>تحذير: الكمية المتاحة غير كافية</AlertTitle>
          <AlertDescription>
            الكمية المتاحة ({currentQuantity}) أقل من الكمية المطلوبة للخصم ({quantity})
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="note">ملاحظات</Label>
        <Textarea
          id="note"
          placeholder="أدخل ملاحظات إضافية (اختياري)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isSubmitting}
          rows={3}
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          إلغاء
        </Button>
        <Button type="submit" disabled={isSubmitting || !category || !itemId || quantity <= 0}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            'حفظ'
          )}
        </Button>
      </div>
    </form>
  );
};

export default ManualMovementForm;
