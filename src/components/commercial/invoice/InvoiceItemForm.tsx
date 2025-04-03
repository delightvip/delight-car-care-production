
import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { InvoiceItem } from '@/services/CommercialTypes';
import InventoryService from '@/services/InventoryService';

interface InvoiceItemFormProps {
  invoiceType: 'sale' | 'purchase';
  onAddItem: (item: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>) => void;
  items: Array<{
    id: number;
    name: string;
    type: 'raw_materials' | 'packaging_materials' | 'semi_finished_products' | 'finished_products';
    quantity: number;
    unit_cost: number;
    sales_price?: number;
  }>;
  categorizedItems: {
    raw_materials: Array<any>;
    packaging_materials: Array<any>;
    semi_finished_products: Array<any>;
    finished_products: Array<any>;
  };
}

const InvoiceItemForm: React.FC<InvoiceItemFormProps> = ({
  invoiceType,
  onAddItem,
  categorizedItems
}) => {
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [selectedItemType, setSelectedItemType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('finished_products');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [availableQuantity, setAvailableQuantity] = useState<number | null>(null);
  const [itemUnit, setItemUnit] = useState<string>('');
  const [itemName, setItemName] = useState<string>('');
  
  const inventoryService = InventoryService.getInstance();

  useEffect(() => {
    async function fetchProductDetails() {
      if (selectedItemId) {
        const productDetails = await inventoryService.getProductDetails(
          selectedCategory, 
          Number(selectedItemId)
        );

        if (productDetails) {
          setAvailableQuantity(productDetails.availableQuantity);
          setItemUnit(productDetails.unit);
          setItemName(productDetails.name);
          
          // Use sales price for sales invoices, unit_cost for purchases
          if (invoiceType === 'sale') {
            setItemPrice(productDetails.sales_price);
          } else {
            // For purchase invoices, get the selected item and use its unit_cost
            const selectedItem = categorizedItems[selectedCategory as keyof typeof categorizedItems]
              .find(item => item.id === Number(selectedItemId));
              
            if (selectedItem) {
              setItemPrice(selectedItem.unit_cost);
            }
          }
        }
      } else {
        setAvailableQuantity(null);
        setItemUnit('');
      }
    }
    
    fetchProductDetails();
  }, [selectedItemId, selectedCategory, invoiceType, categorizedItems]);

  const addItemToInvoice = () => {
    if (selectedItemId && itemQuantity > 0 && itemPrice > 0) {
      const newItem: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'> = {
        item_id: Number(selectedItemId),
        item_type: selectedCategory,
        item_name: itemName,
        quantity: itemQuantity,
        unit_price: itemPrice,
        total: itemQuantity * itemPrice
      };
      
      onAddItem(newItem);
      
      setSelectedItemId('');
      setItemQuantity(1);
      setItemPrice(0);
      setAvailableQuantity(null);
      setItemUnit('');
    }
  };

  const getCategoryTranslation = (category: string) => {
    switch (category) {
      case 'raw_materials':
        return 'المواد الخام';
      case 'packaging_materials':
        return 'مواد التعبئة';
      case 'semi_finished_products':
        return 'المنتجات نصف المصنعة';
      case 'finished_products':
        return 'المنتجات النهائية';
      default:
        return '';
    }
  };

  // Show warning if quantity exceeds available (for sales only)
  const quantityWarning = invoiceType === 'sale' && availableQuantity !== null && itemQuantity > availableQuantity;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 mb-4 items-end">
      <div className="lg:col-span-1">
        <label className="text-sm font-medium block mb-2">فئة المنتج</label>
        <Select 
          value={selectedCategory}
          onValueChange={setSelectedCategory}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر فئة المنتج" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="finished_products">المنتجات النهائية</SelectItem>
            <SelectItem value="semi_finished_products">المنتجات نصف المصنعة</SelectItem>
            <SelectItem value="raw_materials">المواد الخام</SelectItem>
            <SelectItem value="packaging_materials">مواد التعبئة</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="lg:col-span-2">
        <label className="text-sm font-medium block mb-2">المنتج</label>
        <Select 
          value={selectedItemId.toString() || undefined}
          onValueChange={(value) => setSelectedItemId(Number(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر المنتج" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="" disabled>اختر المنتج</SelectItem>
              {categorizedItems[selectedCategory as keyof typeof categorizedItems].map(item => (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      
      <div className="lg:col-span-1 relative">
        <label className="text-sm font-medium block mb-2">الكمية {itemUnit ? `(${itemUnit})` : ''}</label>
        <Input 
          type="number" 
          min="0.01"
          step="0.01"
          value={itemQuantity} 
          onChange={(e) => setItemQuantity(Number(e.target.value))} 
          className={quantityWarning ? "border-red-500" : ""}
        />
        {availableQuantity !== null && invoiceType === 'sale' && (
          <div className="text-xs mt-1">
            <span className={quantityWarning ? "text-red-500 font-bold" : "text-gray-500"}>
              متاح: {availableQuantity} {itemUnit}
            </span>
          </div>
        )}
      </div>
      
      <div className="lg:col-span-1">
        <label className="text-sm font-medium block mb-2">السعر</label>
        <Input 
          type="number"
          step="0.01"
          min="0"
          value={itemPrice} 
          onChange={(e) => setItemPrice(Number(e.target.value))} 
        />
      </div>
      
      <div className="lg:col-span-1">
        <label className="text-sm font-medium block mb-2">الإجمالي</label>
        <Input 
          type="number"
          value={(itemQuantity * itemPrice).toFixed(2)}
          readOnly
          className="bg-gray-50"
        />
      </div>
      
      <div className="lg:col-span-1">
        <Button 
          type="button" 
          onClick={addItemToInvoice}
          disabled={!selectedItemId || itemQuantity <= 0 || itemPrice <= 0}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" /> إضافة
        </Button>
      </div>
    </div>
  );
};

export default InvoiceItemForm;
