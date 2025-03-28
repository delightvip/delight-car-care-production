
import React from 'react';
import { UseFormReturn } from "react-hook-form";
import { ReturnFormValues } from "@/types/returns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ReturnItemsListProps {
  form: UseFormReturn<ReturnFormValues>;
  selectedInvoice: string | null;
  selectedItemType: string;
  setSelectedItemType: (type: string) => void;
  loadingInvoiceItems: boolean;
  isLoadingInventoryItems: boolean;
  inventoryItems: any[];
  addItem: () => void;
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
  isLoadingInventoryItems,
  inventoryItems,
  addItem,
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
        <div className="flex flex-wrap gap-4 items-end mt-2">
          <div className="flex-1">
            <Label htmlFor="items-type">نوع الأصناف</Label>
            <Select 
              value={selectedItemType} 
              onValueChange={setSelectedItemType}
              disabled={!!selectedInvoice}
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
                'لا توجد أصناف. يرجى إضافة أصناف للمرتجع أو اختيار فاتورة.'
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
                      {!selectedInvoice && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeItem(index)}
                          className="h-8 px-2 text-destructive hover:text-destructive/90"
                        >
                          حذف
                        </Button>
                      )}
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
