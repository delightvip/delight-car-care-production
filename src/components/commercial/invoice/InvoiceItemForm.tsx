
import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import InventoryService from '@/services/InventoryService';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Define allowed item types as literals for the type system
const ItemTypes = ['raw_materials', 'packaging_materials', 'semi_finished_products', 'finished_products'] as const;
type ItemType = typeof ItemTypes[number];

// Validate that the item_type is one of the allowed values
const InvoiceItemSchema = z.object({
  item_id: z.number(),
  item_type: z.enum(['raw_materials', 'packaging_materials', 'semi_finished_products', 'finished_products']),
  item_name: z.string(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
});

export type InvoiceItemFormValues = z.infer<typeof InvoiceItemSchema>;

interface InvoiceItemFormProps {
  invoiceType: 'sale' | 'purchase';
  onAddItem: (data: InvoiceItemFormValues) => void;
  items: Array<{
    id: number;
    name: string;
    type: 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products';
    quantity: number;
    unit_cost: number;
    sales_price?: number;
  }>;
  categorizedItems: {
    raw_materials: any[],
    packaging_materials: any[],
    semi_finished_products: any[],
    finished_products: any[]
  };
  initialData?: InvoiceItemFormValues;
}

const InvoiceItemForm: React.FC<InvoiceItemFormProps> = ({
  onAddItem,
  initialData,
  invoiceType,
  items,
  categorizedItems
}) => {
  const [itemType, setItemType] = useState<ItemType>(initialData?.item_type || 'raw_materials');
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const inventoryService = InventoryService.getInstance();

  const form = useForm<InvoiceItemFormValues>({
    resolver: zodResolver(InvoiceItemSchema),
    defaultValues: initialData || {
      item_id: 0,
      item_type: 'raw_materials' as ItemType,
      item_name: '',
      quantity: 1,
      unit_price: 0,
    },
  });

  // Fetch items based on selected type
  useEffect(() => {
    const fetchItems = async () => {
      let fetchedItems: any[] = [];
      
      switch (itemType) {
        case 'raw_materials':
          fetchedItems = await inventoryService.getRawMaterials();
          break;
        case 'packaging_materials':
          fetchedItems = await inventoryService.getPackagingMaterials();
          break;
        case 'semi_finished_products':
          fetchedItems = await inventoryService.getSemiFinishedProducts();
          break;
        case 'finished_products':
          fetchedItems = await inventoryService.getFinishedProducts();
          break;
        default:
          fetchedItems = [];
      }
      
      setItems(fetchedItems);
    };
    
    fetchItems();
  }, [itemType, inventoryService]);

  // Update form when item type changes
  useEffect(() => {
    form.setValue('item_type', itemType);
    form.setValue('item_id', 0);
    form.setValue('item_name', '');
    form.setValue('unit_price', 0);
    setSelectedItem(null);
  }, [itemType, form]);

  const handleItemTypeChange = (value: ItemType) => {
    setItemType(value);
  };

  const handleItemChange = (value: string) => {
    const itemId = parseInt(value);
    const item = items.find(item => item.id === itemId);
    
    if (item) {
      setSelectedItem(item);
      form.setValue('item_id', itemId);
      form.setValue('item_name', item.name);
      
      // If it's a sales invoice, auto-fill with the sales price
      if (invoiceType === 'sale' && item.sales_price) {
        form.setValue('unit_price', item.sales_price);
      } else {
        // For purchase invoices, use the unit cost as default
        form.setValue('unit_price', item.unit_cost || 0);
      }
    }
  };

  // Function to format the item label with its quantity
  const formatItemLabel = (item: any): string => {
    return `${item.name} - المتاح: ${item.quantity} ${item.unit}`;
  };

  // Function to submit the form
  const handleFormSubmit = (data: InvoiceItemFormValues) => {
    // Validate that the selected item exists
    if (!selectedItem) {
      toast.error('يرجى اختيار صنف');
      return;
    }
    
    // For sales invoices, validate quantity against available stock
    if (invoiceType === 'sale' && data.quantity > selectedItem.quantity) {
      toast.error(`الكمية المتاحة (${selectedItem.quantity}) أقل من الكمية المطلوبة (${data.quantity})`);
      return;
    }
    
    onSubmit(data);
    
    // Reset form for next item
    form.reset({
      item_id: 0,
      item_type: itemType,
      item_name: '',
      quantity: 1,
      unit_price: 0,
    });
    setSelectedItem(null);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 p-2 border rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="item_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نوع الصنف</FormLabel>
                <Select
                  onValueChange={(value) => handleItemTypeChange(value as ItemType)}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الصنف" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="raw_materials">المواد الخام</SelectItem>
                    <SelectItem value="packaging_materials">مواد التعبئة</SelectItem>
                    <SelectItem value="semi_finished_products">المنتجات نصف المصنعة</SelectItem>
                    <SelectItem value="finished_products">المنتجات النهائية</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="item_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الصنف</FormLabel>
                <Select
                  onValueChange={handleItemChange}
                  value={field.value ? field.value.toString() : ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصنف" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {items.length > 0 ? (
                      items.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {formatItemLabel(item)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        لا توجد أصناف متاحة
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {selectedItem && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">
              السعر: {invoiceType === 'sale' ? selectedItem.sales_price : selectedItem.unit_cost} 
            </Badge>
            <Badge variant="outline">
              المتاح: {selectedItem.quantity} {selectedItem.unit}
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الكمية</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={1} 
                    step={1} 
                    {...field} 
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>السعر</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={0} 
                    step={0.01} 
                    {...field} 
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full">
          إضافة الصنف
        </Button>
      </form>
    </Form>
  );
};

export default InvoiceItemForm;
