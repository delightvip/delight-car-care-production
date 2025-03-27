
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl } from '@/components/ui/form';
import { ReturnFormValues } from './ReturnFormTypes';

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
  const items = form.watch('items') || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
        <h3 className="text-lg font-semibold">أصناف المرتجع</h3>
        
        {!selectedInvoice && (
          <div className="flex gap-2 items-center">
            <Select 
              value={selectedItemType}
              onValueChange={setSelectedItemType}
              disabled={loadingInvoiceItems}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="نوع الصنف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="finished_products">منتجات نهائية</SelectItem>
                <SelectItem value="semi_finished_products">منتجات نصف مصنعة</SelectItem>
                <SelectItem value="raw_materials">مواد خام</SelectItem>
                <SelectItem value="packaging_materials">مواد تعبئة</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              disabled={loadingInvoiceItems}
            >
              <PlusCircle className="h-4 w-4 ml-2" />
              إضافة صنف
            </Button>
          </div>
        )}
      </div>
      
      <ScrollArea className="h-[300px] rounded-md border p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <p className="text-muted-foreground mb-2">لا توجد أصناف مضافة</p>
            {!selectedInvoice && (
              <Button
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addItem}
                disabled={loadingInvoiceItems}
              >
                <PlusCircle className="h-4 w-4 ml-2" />
                إضافة صنف
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border rounded-md p-4 relative">
                <div className="flex items-center mb-3">
                  <Checkbox
                    id={`item-selected-${index}`}
                    checked={item.selected}
                    onCheckedChange={(checked) => toggleItemSelection(index, Boolean(checked))}
                    className="mr-2"
                  />
                  <Label htmlFor={`item-selected-${index}`} className="flex-1 font-medium">
                    {item.item_name || `صنف ${index + 1}`}
                    {item.max_quantity ? ` (الكمية المتاحة: ${item.max_quantity})` : ''}
                  </Label>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {!selectedInvoice && (
                    <div className="space-y-2">
                      <Label htmlFor={`item-id-${index}`}>الصنف</Label>
                      <Select
                        value={item.item_id.toString() || ""}
                        onValueChange={(value) => {
                          const selected = inventoryItems.find(inv => inv.id.toString() === value);
                          if (selected) {
                            form.setValue(`items.${index}.item_id`, Number(selected.id));
                            form.setValue(`items.${index}.item_name`, selected.name);
                            form.setValue(`items.${index}.item_type`, selectedItemType as any);
                          }
                        }}
                        disabled={isLoadingInventoryItems || !item.selected}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الصنف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {inventoryItems.map((invItem) => (
                            <SelectItem key={invItem.id} value={invItem.id.toString()}>
                              {invItem.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor={`item-quantity-${index}`}>الكمية</Label>
                    <Input
                      id={`item-quantity-${index}`}
                      type="number"
                      value={item.quantity || ""}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      min="0"
                      step="0.01"
                      disabled={!item.selected}
                      className={cn(
                        item.max_quantity && item.quantity > item.max_quantity
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      )}
                    />
                    {item.max_quantity && item.quantity > item.max_quantity && (
                      <p className="text-destructive text-xs">
                        الكمية تتجاوز الحد المسموح ({item.max_quantity})
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`item-price-${index}`}>سعر الوحدة</Label>
                    <Input
                      id={`item-price-${index}`}
                      type="number"
                      value={item.unit_price || ""}
                      onChange={(e) => {
                        form.setValue(`items.${index}.unit_price`, parseFloat(e.target.value) || 0);
                      }}
                      min="0"
                      step="0.01"
                      disabled={!item.selected}
                    />
                  </div>
                </div>
                
                {item.selected && (
                  <div className="mt-2 text-right text-sm font-medium">
                    الإجمالي: {(item.quantity * item.unit_price).toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
