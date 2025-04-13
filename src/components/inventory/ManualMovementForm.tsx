import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import InventoryMovementService, { ManualMovementData } from '@/services/InventoryMovementService';
import InventoryService from '@/services/InventoryService';

interface ManualMovementFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormState {
  type: 'in' | 'out';
  category: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  note: string;
  date: Date;
}

const ManualMovementForm: React.FC<ManualMovementFormProps> = ({ onSuccess, onCancel }) => {
  const [formState, setFormState] = useState<FormState>({
    type: 'in',
    category: 'raw_materials',
    itemId: '',
    itemName: '',
    quantity: 0,
    unit: 'كجم',
    note: '',
    date: new Date()
  });

  const inventoryService = InventoryService.getInstance();
  const inventoryMovementService = InventoryMovementService.getInstance();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // استعلام عن المواد الخام
  const { data: rawMaterials = [] } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: () => inventoryService.getRawMaterials(),
    enabled: formState.category === 'raw_materials'
  });
  
  // استعلام عن مواد التعبئة
  const { data: packagingMaterials = [] } = useQuery({
    queryKey: ['packagingMaterials'],
    queryFn: () => inventoryService.getPackagingMaterials(),
    enabled: formState.category === 'packaging'
  });
  
  // استعلام عن المنتجات نصف مصنعة
  const { data: semiFinishedProducts = [] } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: () => inventoryService.getSemiFinishedProducts(),
    enabled: formState.category === 'semi_finished'
  });
  
  // استعلام عن المنتجات النهائية
  const { data: finishedProducts = [] } = useQuery({
    queryKey: ['finishedProducts'],
    queryFn: () => inventoryService.getFinishedProducts(),
    enabled: formState.category === 'finished_products'
  });
  
  // الحصول على قائمة الأصناف حسب الفئة المحددة
  const getItemsList = () => {
    switch (formState.category) {
      case 'raw_materials':
        return rawMaterials;
      case 'packaging':
        return packagingMaterials;
      case 'semi_finished':
        return semiFinishedProducts;
      case 'finished_products':
        return finishedProducts;
      default:
        return [];
    }
  };
  
  // تحديد الوحدة تلقائيًا عند اختيار الصنف
  const handleItemChange = (id: string) => {
    const items = getItemsList();
    const selectedItem = items.find((item: any) => item.id.toString() === id || item.code === id);
    
    if (selectedItem) {
      const itemNameField = selectedItem.name || '';
      const unitField = selectedItem.unit || getDefaultUnit(formState.category);
      
      setFormState({
        ...formState,
        itemId: id,
        itemName: itemNameField,
        unit: unitField
      });
    }
  };
  
  // الحصول على الوحدة الافتراضية حسب الفئة
  const getDefaultUnit = (category: string) => {
    switch (category) {
      case 'raw_materials':
        return 'كجم';
      case 'packaging':
        return 'قطعة';
      case 'semi_finished':
        return 'لتر';
      case 'finished_products':
        return 'عبوة';
      default:
        return 'وحدة';
    }
  };
  
  // تغيير الفئة وإعادة ضبط الصنف والوحدة
  const handleCategoryChange = (category: string) => {
    setFormState({
      ...formState,
      category,
      itemId: '',
      itemName: '',
      unit: getDefaultUnit(category)
    });
  };
  
  // التحقق من صحة النموذج
  const isFormValid = () => {
    if (!formState.itemId || !formState.itemName) {
      toast.error('يرجى اختيار الصنف');
      return false;
    }
    
    if (!formState.quantity || formState.quantity <= 0) {
      toast.error('يرجى إدخال كمية صحيحة');
      return false;
    }
    
    if (!formState.note.trim()) {
      toast.error('يرجى إدخال ملاحظات للحركة');
      return false;
    }
    
    return true;
  };
  
  // إرسال النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) return;
    
    setIsSubmitting(true);
    
    try {
      const movementData: ManualMovementData = {
        type: formState.type,
        category: formState.category,
        item_name: formState.itemName,
        item_id: parseInt(formState.itemId),
        quantity: formState.quantity,
        unit: formState.unit,
        note: formState.note,
        date: formState.date
      };
    
      const success = await inventoryMovementService.createManualInventoryMovement(movementData);
      
      if (success) {
        toast.success('تم تسجيل حركة المخزون بنجاح');
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="movement-type">نوع الحركة</Label>
          <Select 
            value={formState.type} 
            onValueChange={(value) => setFormState({ ...formState, type: value as 'in' | 'out' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع الحركة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in">وارد</SelectItem>
              <SelectItem value="out">صادر</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category">التصنيف</Label>
          <Select 
            value={formState.category} 
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر التصنيف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="raw_materials">المواد الخام</SelectItem>
              <SelectItem value="packaging">مواد التعبئة</SelectItem>
              <SelectItem value="semi_finished">منتجات نصف مصنعة</SelectItem>
              <SelectItem value="finished_products">منتجات نهائية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="item">الصنف</Label>
        <Select 
          value={formState.itemId} 
          onValueChange={handleItemChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر الصنف" />
          </SelectTrigger>
          <SelectContent>
            {getItemsList().map((item: any) => (
              <SelectItem 
                key={item.id || item.code} 
                value={(item.id || item.code).toString()}
              >
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">الكمية</Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            value={formState.quantity || ''}
            onChange={(e) => setFormState({ ...formState, quantity: parseFloat(e.target.value) || 0 })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="unit">الوحدة</Label>
          <Input
            id="unit"
            type="text"
            value={formState.unit}
            onChange={(e) => setFormState({ ...formState, unit: e.target.value })}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="date">التاريخ</Label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="ml-2 h-4 w-4" />
              {format(formState.date, 'yyyy/MM/dd')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formState.date}
              onSelect={(date) => {
                if (date) {
                  setFormState({ ...formState, date });
                  setIsCalendarOpen(false);
                }
              }}
              locale={ar}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea
          id="notes"
          placeholder="أدخل ملاحظات حول سبب الحركة"
          value={formState.note}
          onChange={(e) => setFormState({ ...formState, note: e.target.value })}
          rows={3}
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          إلغاء
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            'حفظ الحركة'
          )}
        </Button>
      </div>
    </form>
  );
};

export default ManualMovementForm;
