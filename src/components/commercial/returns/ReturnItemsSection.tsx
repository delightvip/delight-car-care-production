
import React, { useEffect } from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Trash } from 'lucide-react';
import { ReturnFormValues } from './ReturnFormTypes';

export interface ReturnItemsSectionProps {
  form: UseFormReturn<ReturnFormValues>;
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
  form,
  selectedInvoice,
  selectedItemType = 'finished_products',
  loadingInvoiceItems = false,
  isLoadingInventoryItems = false,
  inventoryItems = [],
  setSelectedItemType,
  addItem,
  removeItem,
  toggleItemSelection,
  handleQuantityChange
}) => {
  const { fields } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Ensure we have at least one item
  useEffect(() => {
    const items = form.getValues('items');
    if (!items || items.length === 0) {
      if (addItem) addItem();
    }
  }, [form, addItem]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col">
        <Label htmlFor="itemsSection">الأصناف المرتجعة</Label>
      
        {!selectedInvoice && (
          <div className="flex items-center justify-between my-2">
            <div className="flex items-center space-x-2 w-full max-w-xs">
              <Select
                value={selectedItemType}
                onValueChange={(value) => setSelectedItemType && setSelectedItemType(value)}
                disabled={isLoadingInventoryItems}
              >
                <SelectTrigger>
                  <SelectValue placeholder="نوع الصنف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw_materials">مواد خام</SelectItem>
                  <SelectItem value="packaging_materials">مواد تعبئة</SelectItem>
                  <SelectItem value="semi_finished_products">منتجات نصف مصنعة</SelectItem>
                  <SelectItem value="finished_products">منتجات نهائية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              disabled={isLoadingInventoryItems}
              className="ml-2"
            >
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة صنف
            </Button>
          </div>
        )}
        
        {loadingInvoiceItems ? (
          <div className="flex items-center justify-center p-10 border rounded-md">
            <Loader2 className="h-6 w-6 animate-spin ml-2" />
            <span>جاري تحميل أصناف الفاتورة...</span>
          </div>
        ) : (
          <ScrollArea className="h-[300px] w-full rounded-md border">
            <div className="p-4">
              {fields && fields.length > 0 ? (
                fields.map((item, index) => (
                  <div key={item.id} className="mb-4 p-3 border rounded-md relative">
                    <div className="flex items-center space-x-4">
                      <Checkbox 
                        checked={form.watch(`items.${index}.selected`)} 
                        onCheckedChange={(checked) => toggleItemSelection && toggleItemSelection(index, Boolean(checked))}
                        aria-label="Select item"
                      />
                      
                      {!selectedInvoice ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="flex flex-col space-y-1">
                            <Label htmlFor={`item-${index}-name`}>اسم الصنف</Label>
                            <Select
                              value={String(form.watch(`items.${index}.item_id`))}
                              onValueChange={(value) => {
                                const selectedItem = inventoryItems.find(invItem => invItem.id === parseInt(value));
                                if (selectedItem) {
                                  form.setValue(`items.${index}.item_id`, selectedItem.id);
                                  form.setValue(`items.${index}.item_name`, selectedItem.name);
                                  form.setValue(`items.${index}.item_type`, selectedItemType as any);
                                  form.setValue(`items.${index}.unit_price`, selectedItem.unit_cost || 0);
                                }
                              }}
                              disabled={isLoadingInventoryItems}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الصنف" />
                              </SelectTrigger>
                              <SelectContent>
                                {inventoryItems && inventoryItems.map((invItem) => (
                                  <SelectItem key={invItem.id} value={String(invItem.id)}>
                                    {invItem.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex flex-col space-y-1">
                            <Label htmlFor={`item-${index}-quantity`}>الكمية</Label>
                            <Input
                              id={`item-${index}-quantity`}
                              type="number"
                              value={form.watch(`items.${index}.quantity`)}
                              onChange={(e) => handleQuantityChange && handleQuantityChange(index, e.target.value)}
                              min="0.1"
                              step="0.1"
                              disabled={!form.watch(`items.${index}.selected`)}
                            />
                          </div>
                          
                          <div className="flex flex-col space-y-1">
                            <Label htmlFor={`item-${index}-price`}>سعر الوحدة</Label>
                            <Input
                              id={`item-${index}-price`}
                              type="number"
                              {...form.register(`items.${index}.unit_price`)}
                              min="0"
                              step="0.01"
                              disabled={!form.watch(`items.${index}.selected`)}
                            />
                          </div>
                          
                          <div className="flex flex-col space-y-1">
                            <Label htmlFor={`item-${index}-total`}>الإجمالي</Label>
                            <Input
                              id={`item-${index}-total`}
                              type="text"
                              value={(form.watch(`items.${index}.quantity`) * form.watch(`items.${index}.unit_price`)).toFixed(2)}
                              disabled
                              className="bg-muted"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex flex-col space-y-1">
                            <Label htmlFor={`item-${index}-name`}>اسم الصنف</Label>
                            <Input
                              id={`item-${index}-name`}
                              type="text"
                              {...form.register(`items.${index}.item_name`)}
                              disabled
                              className="bg-muted"
                            />
                          </div>
                          
                          <div className="flex flex-col space-y-1">
                            <Label htmlFor={`item-${index}-quantity`}>الكمية</Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                id={`item-${index}-quantity`}
                                type="number"
                                value={form.watch(`items.${index}.quantity`)}
                                onChange={(e) => handleQuantityChange && handleQuantityChange(index, e.target.value)}
                                min="0.1"
                                max={form.watch(`items.${index}.max_quantity`)}
                                step="0.1"
                                disabled={!form.watch(`items.${index}.selected`)}
                              />
                              {form.watch(`items.${index}.max_quantity`) && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  الكمية المتاحة: {form.watch(`items.${index}.invoice_quantity`)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-1">
                            <Label htmlFor={`item-${index}-total`}>الإجمالي</Label>
                            <Input
                              id={`item-${index}-total`}
                              type="text"
                              value={(form.watch(`items.${index}.quantity`) * form.watch(`items.${index}.unit_price`)).toFixed(2)}
                              disabled
                              className="bg-muted"
                            />
                          </div>
                        </div>
                      )}
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-8 w-8"
                        onClick={() => removeItem && removeItem(index)}
                      >
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">حذف</span>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  {selectedInvoice ? 
                    "لا توجد أصناف في الفاتورة المحددة" : 
                    "قم بإضافة الأصناف المرتجعة"}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
        
        {form.formState.errors.items && (
          <p className="text-sm font-medium text-destructive mt-2">
            {form.formState.errors.items.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default ReturnItemsSection;
