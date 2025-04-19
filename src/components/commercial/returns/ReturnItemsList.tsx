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
import { Button } from '@/components/ui/button';

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

  // تحديد/إلغاء كل العناصر دفعة واحدة
  const allSelected = items.length > 0 && items.every(item => item.selected);
  const toggleAll = (checked: boolean) => {
    items.forEach((item, idx) => toggleItemSelection(idx, checked));
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <CardTitle className="text-lg">أصناف المرتجع</CardTitle>
        {items.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => toggleAll(true)} disabled={allSelected} className="text-xs px-2 py-1">
              تحديد الكل
            </Button>
            <Button size="sm" variant="outline" onClick={() => toggleAll(false)} disabled={!allSelected} className="text-xs px-2 py-1">
              إلغاء الكل
            </Button>
          </div>
        )}
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
                <div key={index} className="flex flex-col md:flex-row md:items-center md:space-x-4 rtl:space-x-reverse border-b pb-3 gap-2 md:gap-0">
                  <Checkbox 
                    id={`select-item-${index}`}
                    checked={item.selected} 
                    onCheckedChange={(checked) => toggleItemSelection(index, !!checked)}
                  />
                  <div className="grid gap-1 flex-1 grid-cols-1 md:grid-cols-2">
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
        {/* ملخص الإجمالي بشكل أوضح */}
        <div className="flex justify-between items-center pt-4 mt-4 border-t bg-gray-50 dark:bg-zinc-900">
          <span className="font-semibold text-base dark:text-gray-100">الإجمالي الكلي</span>
          <span className="font-bold text-lg text-green-700 dark:text-green-300">{total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
