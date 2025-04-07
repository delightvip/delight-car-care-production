
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import IngredientSelector from './ingredients/IngredientSelector';
import IngredientsList from './ingredients/IngredientsList';
import { Ingredient, SemiFinishedProductFormData } from '@/types/inventoryTypes';
import { useSemiFinishedMaterialsData } from './hooks/useSemiFinishedMaterialsData';
import { useSemiFinishedForm } from './hooks/useSemiFinishedForm';

const semiFinishedSchema = z.object({
  name: z.string().min(2, { message: "يجب أن يحتوي الاسم على حرفين على الأقل" }),
  unit: z.string().min(1, { message: "يرجى اختيار وحدة القياس" }),
  quantity: z.coerce.number().min(0, { message: "الكمية يجب أن تكون 0 أو أكثر" }),
  unit_cost: z.coerce.number().min(0, { message: "التكلفة يجب أن تكون 0 أو أكثر" }),
  sales_price: z.coerce.number().min(0, { message: "سعر البيع يجب أن تكون 0 أو أكثر" }),
  min_stock: z.coerce.number().min(0, { message: "الحد الأدنى يجب أن يكون 0 أو أكثر" })
});

const units = ['كجم', 'لتر', 'مللى', 'جم', 'علبة', 'قطعة', 'كرتونة'];

interface SemiFinishedFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  title: string;
  submitText: string;
}

const SemiFinishedForm: React.FC<SemiFinishedFormProps> = ({
  isOpen,
  onClose,
  initialData,
  title,
  submitText
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  
  // Custom hooks for data fetching and form logic
  const { rawMaterials, isRawMaterialsLoading, semiFinishedProducts, isSemiFinishedLoading } = 
    useSemiFinishedMaterialsData(isEditing ? initialData?.id : undefined);
  
  const { 
    form, 
    ingredients, 
    hasWater, 
    totalCost, 
    handleAddIngredient, 
    handleRemoveIngredient, 
    setHasWater, 
    validateTotalPercentage 
  } = useSemiFinishedForm(initialData, semiFinishedProducts);
  
  // Handle form submission
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof semiFinishedSchema>) => {
      console.log("Starting mutation with ingredients:", ingredients);
      
      try {
        // Prepare ingredients data for database insertion
        const ingredientsData = ingredients.map(ing => {
          const ingredientType = ing.ingredient_type || 'raw';
          
          const baseData: any = {
            percentage: ing.percentage,
            ingredient_type: ingredientType
          };
          
          // Set the appropriate ID based on ingredient type
          if (ingredientType === 'raw') {
            baseData.raw_material_id = ing.id;
          } else if (ingredientType === 'semi') {
            baseData.semi_finished_id = ing.id;
          }
          
          return baseData;
        });
        
        if (isEditing) {
          console.log("Updating existing product:", initialData.id);
          
          // Update the existing semi-finished product
          const { data: updatedProduct, error: updateError } = await supabase
            .from('semi_finished_products')
            .update({
              name: values.name,
              unit: values.unit,
              quantity: values.quantity,
              min_stock: values.min_stock,
              unit_cost: values.unit_cost,
              sales_price: values.sales_price
            })
            .eq('id', initialData.id)
            .select();
            
          if (updateError) {
            console.error("Error updating product:", updateError);
            throw updateError;
          }
          
          console.log("Product updated successfully, now handling ingredients");
          
          // Delete existing ingredients
          const { error: deleteError } = await supabase
            .from('semi_finished_ingredients')
            .delete()
            .eq('semi_finished_product_id', initialData.id);
          
          if (deleteError) {
            console.error("Error deleting old ingredients:", deleteError);
            throw deleteError;
          }
          
          // Add ingredients with semi_finished_product_id
          if (ingredients.length > 0) {
            console.log("Adding new ingredients to product:", initialData.id);
            
            // Add product ID to each ingredient
            const finalIngredientData = ingredientsData.map(ing => ({
              ...ing,
              semi_finished_product_id: initialData.id
            }));
            
            // Insert all ingredients in one operation
            const { error: insertError } = await supabase
              .from('semi_finished_ingredients')
              .insert(finalIngredientData);
              
            if (insertError) {
              console.error("Error inserting new ingredients:", insertError);
              throw insertError;
            }
          }
          
          return updatedProduct;
        } else {
          console.log("Creating new product");
          
          // Get the latest code to create a new one
          const { data: maxCode } = await supabase
            .from('semi_finished_products')
            .select('code')
            .order('code', { ascending: false })
            .limit(1);
            
          let newCode = 'SFP-00001';
          if (maxCode && maxCode.length > 0) {
            const lastCode = maxCode[0].code;
            const lastNum = parseInt(lastCode.split('-')[1]);
            newCode = `SFP-${String(lastNum + 1).padStart(5, '0')}`;
          }
          
          // Create new semi-finished product
          const { data: newProduct, error: insertError } = await supabase
            .from('semi_finished_products')
            .insert({
              code: newCode,
              name: values.name,
              unit: values.unit,
              quantity: values.quantity,
              min_stock: values.min_stock,
              unit_cost: values.unit_cost,
              sales_price: values.sales_price
            })
            .select();
            
          if (insertError) {
            console.error("Error creating new product:", insertError);
            throw insertError;
          }
          
          // Add ingredients if there are any and the product was successfully created
          if (ingredients.length > 0 && newProduct && newProduct.length > 0) {
            // Add product ID to each ingredient
            const finalIngredientData = ingredientsData.map(ing => ({
              ...ing,
              semi_finished_product_id: newProduct[0].id
            }));
            
            // Insert all ingredients in one operation
            const { error: ingredientsError } = await supabase
              .from('semi_finished_ingredients')
              .insert(finalIngredientData);
              
            if (ingredientsError) {
              console.error("Error adding ingredients:", ingredientsError);
              throw ingredientsError;
            }
          }
          
          return newProduct;
        }
      } catch (error: any) {
        console.error("Error in mutation:", error);
        throw new Error(error.message || "Failed to save product");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      toast.success(isEditing ? 'تم تعديل المنتج النصف مصنع بنجاح' : 'تمت إضافة المنتج النصف مصنع بنجاح');
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  const onSubmit = (values: z.infer<typeof semiFinishedSchema>) => {
    if (ingredients.length === 0) {
      toast.error('يجب إضافة مكون واحد على الأقل');
      return;
    }
    
    if (!validateTotalPercentage()) {
      return;
    }
    
    mutation.mutate(values);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            أدخل بيانات المنتج النصف مصنع مع المكونات ونسبها
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المنتج</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="أدخل اسم المنتج النصف مصنع" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وحدة القياس</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر وحدة القياس" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الكمية</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تكلفة الوحدة</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        {...field}
                        value={totalCost > 0 ? totalCost.toFixed(2) : field.value}
                        className={totalCost > 0 ? "bg-green-50" : ""}
                        title={totalCost > 0 ? "تم حساب التكلفة تلقائيًا من المكونات" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sales_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر البيع</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="min_stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحد الأدنى للمخزون</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <h3 className="text-md font-medium">مكونات المنتج</h3>
              
              <IngredientSelector
                rawMaterials={rawMaterials}
                semiFinishedProducts={isEditing ? 
                  semiFinishedProducts.filter(p => p.id !== initialData.id) : 
                  semiFinishedProducts}
                onAddIngredient={handleAddIngredient}
                ingredients={ingredients}
                hasWater={hasWater}
                onToggleWater={setHasWater}
              />
              
              <IngredientsList
                ingredients={ingredients}
                onRemoveIngredient={handleRemoveIngredient}
                hasWater={hasWater}
                totalCost={totalCost}
              />
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : submitText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SemiFinishedForm;
