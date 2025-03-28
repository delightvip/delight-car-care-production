
import React from 'react';
import { UseFormReturn } from "react-hook-form";
import { ReturnFormValues } from "@/types/returns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ReturnItemsListProps {
  form: UseFormReturn<ReturnFormValues>;
  selectedInvoice: string | null;
  selectedItemType: string;
  setSelectedItemType: (type: string) => void;
  loadingInvoiceItems: boolean;
  isLoadingInventoryItems: boolean;
  inventoryItems: any[];
  removeItem: (index: number) => void;
  toggleItemSelection: (index: number, selected: boolean) => void;
  handleQuantityChange: (index: number, value: string) => void;
}

export default function ReturnItemsList({
  form,
  selectedInvoice,
  selectedItemType,
  setSelectedItemType,
  loadingInvoiceItems,
  inventoryItems,
  removeItem,
  toggleItemSelection,
  handleQuantityChange
}: ReturnItemsListProps) {
  const items = form.watch('items') || [];
  const total = items.reduce((sum, item) => sum + (item.selected ? (item.quantity * item.unit_price) : 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">أصناف المرتجع</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px] pr-4">
          {items.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {loadingInvoiceItems ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                'يرجى اختيار فاتورة لعرض الأصناف المتاحة للإرجاع.'
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 rtl:space-x-reverse border-b pb-3">
                  <Checkbox 
                    id={`select-item-${index}`}
                    checked={item.selected} 
                    onCheckedChange={(checked) => toggleItemSelection(index, !!checked)}
                  />
                  <div className="grid gap-1 flex-1">
                    <div className="flex justify-between items-center">
                      <Label htmlFor={`item-${index}`} className="font-medium">
                        {item.item_name}
                      </Label>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {item.invoice_quantity && (
                        <span>الكمية في الفاتورة: {item.invoice_quantity}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`item-qty-${index}`} className="text-xs mb-1 block">
                          الكمية
                        </Label>
                        <Input
                          id={`item-qty-${index}`}
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, e.target.value)}
                          disabled={!item.selected}
                          min={0}
                          max={item.max_quantity}
                          step="0.01"
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`item-price-${index}`} className="text-xs mb-1 block">
                          السعر
                        </Label>
                        <Input
                          id={`item-price-${index}`}
                          type="number"
                          value={item.unit_price}
                          disabled
                          className="h-8 bg-muted"
                        />
                      </div>
                    </div>
                    {item.selected && (
                      <div className="mt-2 text-sm font-medium text-right">
                        الإجمالي: {(item.quantity * item.unit_price).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="flex justify-between items-center pt-4 mt-4 border-t">
          <span className="font-semibold">الإجمالي</span>
          <span className="font-bold text-lg">{total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
