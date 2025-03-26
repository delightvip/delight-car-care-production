
import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { ReturnFormValues } from './ReturnFormTypes';

export interface ReturnItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ReturnItemsSectionProps {
  items?: ReturnItem[];
  onQuantityChange?: (itemId: string, quantity: number) => void;
  form?: UseFormReturn<ReturnFormValues>; 
  selectedInvoice?: string | null;
  selectedItemType?: string;
  loadingInvoiceItems?: boolean;
  isLoadingInventoryItems?: boolean;
  inventoryItems?: any[];
  setSelectedItemType?: (type: string) => void;
  addItem?: () => void;
  removeItem?: (index: number) => void;
  toggleItemSelection?: (index: number, checked: boolean) => void;
  handleQuantityChange?: (index: number, value: string) => void;
}

const ReturnItemsSection: React.FC<ReturnItemsSectionProps> = ({
  items = [],
  onQuantityChange = () => {},
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

  useEffect(() => {
    // Initialize selectedItems with all item IDs when the component mounts
    setSelectedItems(items.map(item => item.id));
  }, [items]);

  const isItemSelected = (itemId: string) => selectedItems.includes(itemId);

  const toggleItemSelectionInternal = (itemId: string, checked: boolean) => {
    setSelectedItems(prevSelectedItems => {
      if (checked) {
        return [...prevSelectedItems, itemId];
      } else {
        return prevSelectedItems.filter(id => id !== itemId);
      }
    });
  };

  const handleQuantityChangeInternal = (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(event.target.value, 10);
    if (!isNaN(newQuantity)) {
      onQuantityChange(itemId, newQuantity);
    }
  };

  return (
    <div className="grid gap-4">
      <Label htmlFor="items">Return Items</Label>
      <ScrollArea className="h-[200px] w-full rounded-md border">
        <div className="p-4">
          {items.map((item) => (
            <div key={item.id} className="mb-4 flex items-center space-x-4">
              <Checkbox 
                checked={isItemSelected(item.id)} 
                onCheckedChange={(checked) => toggleItemSelectionInternal(item.id, Boolean(checked))}
                aria-label="Select row"
              />
              <div className="grid gap-1.5">
                <Label htmlFor={`item-${item.id}`}>{item.name}</Label>
                <Input
                  type="number"
                  id={`item-${item.id}`}
                  defaultValue={item.quantity}
                  className="w-24"
                  onChange={(e) => handleQuantityChangeInternal(item.id, e)}
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ReturnItemsSection;
