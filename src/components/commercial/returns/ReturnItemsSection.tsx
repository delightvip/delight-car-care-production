
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface ReturnItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface ReturnItemsSectionProps {
  items: ReturnItem[];
  onQuantityChange: (itemId: string, quantity: number) => void;
}

export const ReturnItemsSection: React.FC<ReturnItemsSectionProps> = ({ items, onQuantityChange }) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    // Initialize selectedItems with all item IDs when the component mounts
    setSelectedItems(items.map(item => item.id));
  }, [items]);

  const isItemSelected = (itemId: string) => selectedItems.includes(itemId);

  const toggleItemSelection = (itemId: string, checked: boolean) => {
    setSelectedItems(prevSelectedItems => {
      if (checked) {
        return [...prevSelectedItems, itemId];
      } else {
        return prevSelectedItems.filter(id => id !== itemId);
      }
    });
  };

  const handleQuantityChange = (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
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
                onCheckedChange={(checked) => toggleItemSelection(item.id, Boolean(checked))}
                aria-label="Select row"
              />
              <div className="grid gap-1.5">
                <Label htmlFor={`item-${item.id}`}>{item.name}</Label>
                <Input
                  type="number"
                  id={`item-${item.id}`}
                  defaultValue={item.quantity}
                  className="w-24"
                  onChange={(e) => handleQuantityChange(item.id, e)}
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
