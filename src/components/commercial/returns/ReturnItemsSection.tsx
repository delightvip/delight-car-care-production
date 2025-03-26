
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Trash, CheckCircle, Loader2 } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
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

export function ReturnItemsSection({
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
}: ReturnItemsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">الأصناف</h3>
        {!selectedInvoice && (
          <div className="flex space-x-2">
            <Select value={selectedItemType} onValueChange={setSelectedItemType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="نوع الصنف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw_materials">مواد خام</SelectItem>
                <SelectItem value="packaging_materials">مواد تعبئة</SelectItem>
                <SelectItem value="semi_finished_products">منتجات نصف مصنعة</SelectItem>
                <SelectItem value="finished_products">منتجات تامة</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              type="button" 
              variant="outline" 
              onClick={addItem}
              disabled={loadingInvoiceItems || !!selectedInvoice}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              إضافة صنف
            </Button>
          </div>
        )}
      </div>

      <div className="border rounded-md p-4">
        {loadingInvoiceItems ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin ml-2" />
            <span>جاري جلب أصناف الفاتورة...</span>
          </div>
        ) : form.watch('items')?.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 border-b pb-2 font-semibold">
              {selectedInvoice && <div className="col-span-1">اختيار</div>}
              <div className={selectedInvoice ? "col-span-4" : "col-span-5"}>الصنف</div>
              <div className="col-span-2">الكمية</div>
              {selectedInvoice && <div className="col-span-1">الكمية الأصلية</div>}
              <div className="col-span-2">سعر الوحدة</div>
              <div className="col-span-1">الإجراءات</div>
              <div className="col-span-2">الإجمالي</div>
            </div>
            {form.watch('items').map((item, index) => (
              <div key={index} className={`grid grid-cols-12 gap-4 items-center ${!item.selected ? 'opacity-60' : ''}`}>
                {selectedInvoice && (
                  <div className="col-span-1">
                    <Checkbox
                      checked={!!item.selected}
                      onCheckedChange={(checked) => {
                        // The checked value can be true, false, or "indeterminate" (string)
                        // We need to explicitly cast it to boolean to avoid type errors
                        toggleItemSelection(index, checked === true);
                      }}
                    />
                  </div>
                )}
                <div className={selectedInvoice ? "col-span-4" : "col-span-5"}>
                  {selectedInvoice ? (
                    <div className="p-2 border rounded bg-muted">
                      {item.item_name} <span className="text-xs text-muted-foreground">({item.item_type})</span>
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name={`items.${index}.item_id`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="sr-only">الصنف</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              const item = inventoryItems?.find(i => i.id === parseInt(value));
                              if (item) {
                                form.setValue(`items.${index}.item_name`, item.name);
                                form.setValue(`items.${index}.item_type`, selectedItemType as any);
                              }
                            }}
                            value={field.value?.toString() || "0"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الصنف" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingInventoryItems ? (
                                <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                              ) : inventoryItems?.length ? (
                                inventoryItems.map((item) => (
                                  <SelectItem key={item.id} value={item.id.toString()}>
                                    {item.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>لا توجد أصناف</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">الكمية</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            max={item.max_quantity}
                            {...field}
                            disabled={!item.selected && selectedInvoice}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                          />
                        </FormControl>
                        {selectedInvoice && item.max_quantity && item.quantity > 0 && (
                          <FormDescription className="text-xs">
                            {`${((item.quantity / item.max_quantity!) * 100).toFixed(0)}% من الكمية الأصلية`}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {selectedInvoice && (
                  <div className="col-span-1 text-sm text-center">
                    {item.invoice_quantity}
                  </div>
                )}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.unit_price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">سعر الوحدة</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              field.onChange(value);
                              form.trigger("items");
                            }}
                            disabled={!!selectedInvoice || !item.selected}
                            className={selectedInvoice ? "bg-muted" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-1">
                  {!selectedInvoice && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                  {selectedInvoice && item.selected && item.quantity > 0 && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="col-span-2 text-left font-medium">
                  {item.selected ? (item.quantity * item.unit_price).toFixed(2) : "0.00"}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-12 gap-4 pt-2 border-t items-center">
              <div className="col-span-10 text-left font-bold">الإجمالي</div>
              <div className="col-span-2 text-left font-bold text-lg">
                {form.watch('amount').toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {selectedInvoice ? 
              "لا توجد أصناف في الفاتورة المختارة." : 
              "لا توجد أصناف. انقر على \"إضافة صنف\" لإضافة أصناف للمرتجع."
            }
          </div>
        )}
      </div>
    </div>
  );
}
