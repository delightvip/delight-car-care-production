
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { UseFormReturn } from "react-hook-form";
import { ReturnFormValues } from "./ReturnFormTypes";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReturnItemsSectionProps {
  form: UseFormReturn<ReturnFormValues>;
  selectedInvoice: string | null;
  selectedItemType: string;
  loadingInvoiceItems: boolean;
  isLoadingInventoryItems: boolean;
  inventoryItems: any[];
  setSelectedItemType: (type: string) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  toggleItemSelection: (index: number, selected: boolean) => void;
  handleQuantityChange: (index: number, value: string) => void;
}

export const ReturnItemsSection: React.FC<ReturnItemsSectionProps> = ({ 
  form, 
  selectedInvoice, 
  selectedItemType, 
  loadingInvoiceItems, 
  isLoadingInventoryItems, 
  inventoryItems, 
  setSelectedItemType, 
  addItem, 
  removeItem,
  toggleItemSelection, 
  handleQuantityChange 
}) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const items = form.watch('items') || [];

  useEffect(() => {
    // Initialize selectedItems with all item IDs when the component mounts
    // Using item_id instead of id since that's what our type has
    setSelectedItems(items.map(item => item.item_id?.toString() || ''));
  }, [items]);

  const isItemSelected = (itemId: string) => selectedItems.includes(itemId);

  const handleToggleItemSelection = (itemId: string, checked: boolean, index: number) => {
    setSelectedItems(prevSelectedItems => {
      if (checked) {
        return [...prevSelectedItems, itemId];
      } else {
        return prevSelectedItems.filter(id => id !== itemId);
      }
    });
    
    toggleItemSelection(index, checked);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end mb-2">
        <div className="flex-1">
          <Label htmlFor="items-type">نوع الأصناف</Label>
          <Select 
            value={selectedItemType} 
            onValueChange={setSelectedItemType}
          >
            <SelectTrigger id="items-type">
              <SelectValue placeholder="اختر نوع الأصناف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="finished_products">منتجات نهائية</SelectItem>
              <SelectItem value="semi_finished_products">منتجات نصف مصنعة</SelectItem>
              <SelectItem value="raw_materials">مواد خام</SelectItem>
              <SelectItem value="packaging_materials">مواد تعبئة</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {!selectedInvoice && (
          <Button 
            onClick={addItem} 
            type="button" 
            className="flex items-center"
            disabled={isLoadingInventoryItems}
          >
            {isLoadingInventoryItems ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="mr-2 h-4 w-4" />
            )}
            إضافة صنف
          </Button>
        )}
      </div>

      <Label htmlFor="items">أصناف المرتجع</Label>
      <ScrollArea className="h-[200px] w-full rounded-md border">
        <div className="p-4">
          {items.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              لا توجد أصناف. يرجى إضافة أصناف للمرتجع.
            </div>
          ) : (
            items.map((item, index) => (
              <div key={index} className="mb-4 flex items-center space-x-4">
                <Checkbox 
                  checked={item.selected} 
                  onCheckedChange={(checked) => handleToggleItemSelection(item.item_id?.toString() || '', Boolean(checked), index)}
                  aria-label="Select row"
                />
                <div className="grid gap-1.5 grow">
                  <Label htmlFor={`item-${index}`}>
                    {item.item_name}
                    {item.invoice_quantity && ` (الكمية الأصلية: ${item.invoice_quantity})`}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      id={`item-${index}`}
                      value={item.quantity}
                      className="w-24"
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      disabled={!item.selected}
                      min={0}
                      max={item.max_quantity}
                      step="0.1"
                    />
                    {!selectedInvoice && (
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => removeItem(index)}
                      >
                        حذف
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {loadingInvoiceItems && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ReturnItemsSection;
