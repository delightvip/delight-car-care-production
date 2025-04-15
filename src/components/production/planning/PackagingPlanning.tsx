import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { ar } from 'date-fns/locale';

import { useToast } from '@/components/ui/use-toast';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, CheckCheck, Package2Icon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/hooks/use-debounce';
import { useSearchParams } from 'react-router-dom';
import { packagingPlanningSchema } from '@/lib/validations/packaging';
import { PackagingPlanningData } from '@/types/packaging';
import ProductionService from '@/services/ProductionService';
import { useDrawer } from '@/components/ui/drawer';
import { PackagingOrder } from '@/types/production';
import { InventoryItem } from '@/types/inventory';
import InventoryService from '@/services/InventoryService';
import { MultiSelect } from '@/components/ui/multi-select';
import { calculatePackagingMaterialsNeeded } from '@/lib/utils';

interface PackagingPlanningFormProps {
  onSubmit: (data: PackagingPlanningData) => Promise<void>;
  onCancel: () => void;
  initialValues?: PackagingPlanningData;
  items?: InventoryItem[];
}

const PackagingPlanningForm: React.FC<PackagingPlanningFormProps> = ({ onSubmit, onCancel, initialValues, items }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [isCalculating, setIsCalculating] = useState(false);
  const [materialsNeeded, setMaterialsNeeded] = useState<{ id: string; name: string; quantity: number; }[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderQuantity, setOrderQuantity] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialValues?.date ? new Date(initialValues.date) : undefined);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isItemValid, setIsItemValid] = useState(true);
  const [isQuantityValid, setIsQuantityValid] = useState(true);
  const [isDateValid, setIsDateValid] = useState(true);
  const [isMaterialsValid, setIsMaterialsValid] = useState(true);
  const [isOrderNumberValid, setIsOrderNumberValid] = useState(true);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isFormDisabled, setIsFormDisabled] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isFormTouched, setIsFormTouched] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isFormResetting, setIsFormResetting] = useState(false);
  const [isFormSubmittedSuccessfully, setIsFormSubmittedSuccessfully] = useState(false);
  const [isFormSubmittedWithError, setIsFormSubmittedWithError] = useState(false);
  const [isFormSubmissionLoading, setIsFormSubmissionLoading] = useState(false);

  const form = useForm<PackagingPlanningData>({
    resolver: initialValues ? undefined : zodResolver(packagingPlanningSchema),
    defaultValues: {
      productName: initialValues?.productName || '',
      quantity: initialValues?.quantity || 0,
      date: initialValues?.date || new Date(),
      notes: initialValues?.notes || '',
      itemIds: initialValues?.itemIds || [],
      orderNumber: initialValues?.orderNumber || '',
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (initialValues) {
      setOrderNumber(initialValues.orderNumber.toString());
      setOrderQuantity(initialValues.quantity.toString());
      setSelectedDate(initialValues.date ? new Date(initialValues.date) : undefined);
      setSelectedItems(initialValues.itemIds || []);
      setSelectedItem(items?.find(item => item.id === initialValues.itemId) || null);
      setMaterialsNeeded(calculatePackagingMaterialsNeeded(items, initialValues.itemIds, initialValues.quantity));
    }
  }, [initialValues, items]);

  useEffect(() => {
    const isValid =
      isItemValid &&
      isQuantityValid &&
      isDateValid &&
      isMaterialsValid &&
      isOrderNumberValid;
    setIsFormValid(isValid);
  }, [isItemValid, isQuantityValid, isDateValid, isMaterialsValid, isOrderNumberValid]);

  const handleItemChange = useCallback((item: InventoryItem | null) => {
    setSelectedItem(item);
    setIsItemValid(!!item);
  }, []);

  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOrderQuantity(value);
    const isValid = !isNaN(Number(value)) && Number(value) > 0;
    setIsQuantityValid(isValid);
  }, []);

  const handleDateChange = useCallback((date: Date | undefined) => {
    setSelectedDate(date);
    setIsDateValid(!!date);
  }, []);

  const handleMaterialsChange = useCallback((values: string[]) => {
    setSelectedItems(values);
    const isValid = values.length > 0;
    setIsMaterialsValid(isValid);
  }, []);

  const handleOrderNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOrderNumber(value);
    const isValid = value.trim() !== '';
    setIsOrderNumberValid(isValid);
  }, []);

  const calculateMaterialsNeededHandler = useCallback(() => {
    if (!selectedItem) {
      toast({
        title: t('production.packaging.form.error.no_item_selected'),
        description: t('production.packaging.form.error.select_item'),
        variant: 'destructive',
      });
      return;
    }

    if (!orderQuantity) {
      toast({
        title: t('production.packaging.form.error.no_quantity'),
        description: t('production.packaging.form.error.enter_quantity'),
        variant: 'destructive',
      });
      return;
    }

    if (!selectedItems) {
      toast({
        title: t('production.packaging.form.error.no_materials'),
        description: t('production.packaging.form.error.select_materials'),
        variant: 'destructive',
      });
      return;
    }

    setIsCalculating(true);
    try {
      const quantity = Number(orderQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        toast({
          title: t('production.packaging.form.error.invalid_quantity'),
          description: t('production.packaging.form.error.enter_valid_quantity'),
          variant: 'destructive',
        });
        return;
      }
      const materials = calculatePackagingMaterialsNeeded(items, selectedItems, Number(orderQuantity));
      setMaterialsNeeded(materials);
      toast({
        title: t('production.packaging.form.success.materials_calculated'),
        description: t('production.packaging.form.success.materials_calculated_desc'),
      });
    } catch (error) {
      console.error('Error calculating materials needed:', error);
      toast({
        title: t('production.packaging.form.error.calculation_failed'),
        description: t('production.packaging.form.error.calculation_failed_desc'),
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  }, [selectedItem, orderQuantity, selectedItems, items, t, toast]);

  const onSubmitHandler = form.handleSubmit(async (data) => {
    setIsFormSubmitting(true);
    try {
      const quantity = Number(orderQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        toast({
          title: t('production.packaging.form.error.invalid_quantity'),
          description: t('production.packaging.form.error.enter_valid_quantity'),
          variant: 'destructive',
        });
        return;
      }

      if (!selectedDate) {
        toast({
          title: t('production.packaging.form.error.no_date'),
          description: t('production.packaging.form.error.select_date'),
          variant: 'destructive',
        });
        return;
      }

      if (!selectedItems || selectedItems.length === 0) {
        toast({
          title: t('production.packaging.form.error.no_materials'),
          description: t('production.packaging.form.error.select_materials'),
          variant: 'destructive',
        });
        return;
      }

      const orderNumberValue = orderNumber;
      if (!orderNumberValue || orderNumberValue.trim() === '') {
        toast({
          title: t('production.packaging.form.error.no_order_number'),
          description: t('production.packaging.form.error.enter_order_number'),
          variant: 'destructive',
        });
        return;
      }

      const packagingData: PackagingPlanningData = {
        productName: selectedItem?.name || '',
        quantity: Number(orderQuantity),
        date: selectedDate,
        notes: data.notes,
        itemId: selectedItem?.id || '',
        itemType: selectedItem?.item_type || '',
        itemIds: selectedItems,
        orderNumber: orderNumberValue,
      };

      await onSubmit(packagingData);
      toast({
        title: t('production.packaging.form.success.packaging_planned'),
        description: t('production.packaging.form.success.packaging_planned_desc'),
      });
    } catch (error) {
      console.error('Error submitting packaging planning form:', error);
      toast({
        title: t('production.packaging.form.error.submission_failed'),
        description: t('production.packaging.form.error.submission_failed_desc'),
        variant: 'destructive',
      });
    } finally {
      setIsFormSubmitting(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmitHandler} className="space-y-4">
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FormItem>
                <FormLabel>{t('production.packaging.form.product_name')}</FormLabel>
                <Select onValueChange={(value) => {
                  const item = items?.find(item => item.id === value);
                  handleItemChange(item || null);
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('production.packaging.form.select_product')} defaultValue={initialValues?.itemId} />
                  </SelectTrigger>
                  <SelectContent>
                    {items?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isItemValid && (
                  <p className="text-sm text-red-500">{t('production.packaging.form.error.select_item')}</p>
                )}
              </FormItem>
            </div>
            <div>
              <FormItem>
                <FormLabel>{t('production.packaging.form.quantity')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={orderQuantity}
                    onChange={handleQuantityChange}
                    placeholder={t('production.packaging.form.enter_quantity')}
                  />
                </FormControl>
                {!isQuantityValid && (
                  <p className="text-sm text-red-500">{t('production.packaging.form.error.enter_valid_quantity')}</p>
                )}
              </FormItem>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FormItem>
                <FormLabel>{t('production.packaging.form.date')}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={
                        "w-full justify-start text-left font-normal" +
                        (selectedDate ? " text-black dark:text-white" : " text-muted-foreground")
                      }
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, "PPP", { locale: ar })
                      ) : (
                        <span>{t('production.packaging.form.pick_date')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {!isDateValid && (
                  <p className="text-sm text-red-500">{t('production.packaging.form.error.select_date')}</p>
                )}
              </FormItem>
            </div>
            <div>
              <FormItem>
                <FormLabel>{t('production.packaging.form.order_number')}</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    value={orderNumber}
                    onChange={handleOrderNumberChange}
                    placeholder={t('production.packaging.form.enter_order_number')}
                  />
                </FormControl>
                {!isOrderNumberValid && (
                  <p className="text-sm text-red-500">{t('production.packaging.form.error.enter_order_number')}</p>
                )}
              </FormItem>
            </div>
          </div>

          <div>
            <FormItem>
              <FormLabel>{t('production.packaging.form.packaging_materials')}</FormLabel>
              <MultiSelect
                options={items?.map(item => ({ label: item.name, value: item.id })) || []}
                value={selectedItems}
                onChange={handleMaterialsChange}
                placeholder={t('production.packaging.form.select_materials')}
              />
              {!isMaterialsValid && (
                <p className="text-sm text-red-500">{t('production.packaging.form.error.select_materials')}</p>
              )}
            </FormItem>
          </div>

          <div>
            <Button type="button" variant="secondary" onClick={calculateMaterialsNeededHandler} disabled={isCalculating}>
              {isCalculating ? (
                <>
                  <Package2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {t('production.packaging.form.calculating')}
                </>
              ) : (
                <>
                  <Package2Icon className="mr-2 h-4 w-4" />
                  {t('production.packaging.form.calculate_materials')}
                </>
              )}
            </Button>
          </div>

          {materialsNeeded.length > 0 && (
            <div>
              <Label>{t('production.packaging.form.materials_needed')}</Label>
              <Separator className="my-2" />
              <div className="flex flex-col gap-2">
                {materialsNeeded.map((material) => (
                  <Badge key={material.id} variant="outline">
                    {material.name} - {material.quantity}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('production.packaging.form.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('production.packaging.form.enter_notes')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('production.packaging.form.notes_desc')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={!isFormValid || isFormSubmitting}>
            {isFormSubmitting ? (
              <>
                <CheckCheck className="mr-2 h-4 w-4 animate-spin" />
                {t('submitting')}
              </>
            ) : (
              <>
                <CheckCheck className="mr-2 h-4 w-4" />
                {t('submit')}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PackagingPlanningForm;
