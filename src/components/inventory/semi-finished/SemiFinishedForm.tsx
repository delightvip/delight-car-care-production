
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
import { PlusCircle, X, Loader2 } from 'lucide-react';

// Define form schema
const semiFinishedSchema = z.object({
  name: z.string().min(2, { message: "يجب أن يحتوي الاسم على حرفين على الأقل" }),
  unit: z.string().min(1, { message: "يرجى اختيار وحدة القياس" }),
  quantity: z.coerce.number().min(0, { message: "الكمية يجب أن تكون 0 أو أكثر" }),
  unit_cost: z.coerce.number().min(0, { message: "التكلفة يجب أن تكون 0 أو أكثر" }),
  sales_price: z.coerce.number().min(0, { message: "سعر البيع يجب أن يكون 0 أو أكثر" }),
  min_stock: z.coerce.number().min(0, { message: "الحد الأدنى يجب أن يكون 0 أو أكثر" })
});

const units = ['كجم', 'لتر', 'مللى', 'جم', 'علبة', 'قطعة', 'كرتونة'];

interface Ingredient {
  id: number;
  code: string;
  name: string;
  percentage: number;
  unit_cost: number;
}

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
  const [selectedRawMaterial, setSelectedRawMaterial] = useState<string>('');
  const [percentage, setPercentage] = useState<number>(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [calculatedCost, setCalculatedCost] = useState<number>(0);
  
  // Fetch raw materials
  const { data: rawMaterials = [], isLoading: isRawMaterialsLoading } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, name, code, unit_cost')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
  
  const form = useForm<z.infer<typeof semiFinishedSchema>>({
    resolver: zodResolver(semiFinishedSchema),
    defaultValues: {
      name: initialData?.name || "",
      unit: initialData?.unit || units[0],
      quantity: initialData?.quantity || 0,
      unit_cost: initialData?.unit_cost || 0,
      sales_price: initialData?.sales_price || 0,
      min_stock: initialData?.min_stock || 0
    }
  });
  
  // Load existing ingredients if editing
  useEffect(() => {
    if (isEditing && initialData) {
      // Fetch ingredients for this product
      const fetchIngredients = async () => {
        const { data, error } = await supabase
          .from('semi_finished_ingredients')
          .select(`
            id,
            percentage,
            raw_material:raw_material_id(id, code, name, unit_cost)
          `)
          .eq('semi_finished_id', initialData.id);
          
        if (error) {
          toast.error('خطأ في جلب المكونات');
          return;
        }
        
        // Format ingredients for our state
        const formattedIngredients = data?.map((ing) => ({
          id: ing.raw_material?.id,
          code: ing.raw_material?.code,
          name: ing.raw_material?.name,
          percentage: ing.percentage,
          unit_cost: ing.raw_material?.unit_cost || 0
        })) || [];
        
        setIngredients(formattedIngredients);
        calculateTotalCost(formattedIngredients);
      };
      
      fetchIngredients();
    }
  }, [isEditing, initialData]);
  
  // حساب التكلفة الإجمالية للمنتج النصف مصنع بناءً على المكونات ونسبها
  const calculateTotalCost = (ingredientsList: Ingredient[]) => {
    let totalCost = 0;
    
    ingredientsList.forEach(ingredient => {
      // حساب تكلفة كل مكون بناءً على نسبته المئوية
      const ingredientCost = ingredient.unit_cost * (ingredient.percentage / 100);
      totalCost += ingredientCost;
    });
    
    setCalculatedCost(totalCost);
    form.setValue('unit_cost', totalCost);
  };
  
  const handleAddIngredient = () => {
    if (!selectedRawMaterial) {
      toast.error('يرجى اختيار مادة خام');
      return;
    }
    
    if (percentage <= 0 || percentage > 100) {
      toast.error('يجب أن تكون النسبة بين 1 و 100');
      return;
    }
    
    // Check if already exists
    if (ingredients.some(ing => ing.id === parseInt(selectedRawMaterial))) {
      toast.error('تم إضافة هذه المادة بالفعل');
      return;
    }
    
    const rawMaterial = rawMaterials.find(m => m.id === parseInt(selectedRawMaterial));
    if (!rawMaterial) return;
    
    const newIngredients = [
      ...ingredients,
      {
        id: rawMaterial.id,
        code: rawMaterial.code,
        name: rawMaterial.name,
        percentage: percentage,
        unit_cost: rawMaterial.unit_cost
      }
    ];
    
    setIngredients(newIngredients);
    calculateTotalCost(newIngredients);
    
    setSelectedRawMaterial('');
    setPercentage(0);
  };
  
  const handleRemoveIngredient = (id: number) => {
    const updatedIngredients = ingredients.filter(ing => ing.id !== id);
    setIngredients(updatedIngredients);
    calculateTotalCost(updatedIngredients);
  };
  
  const validateTotalPercentage = (): boolean => {
    const total = ingredients.reduce((sum, ing) => sum + ing.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`مجموع النسب يجب أن يكون 100%، الإجمالي الحالي: ${total}%`);
      return false;
    }
    return true;
  };
  
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof semiFinishedSchema>) => {
      if (isEditing) {
        // Update existing product
        const { data, error } = await supabase
          .from('semi_finished_products')
          .update({
            name: values.name,
            unit: values.unit,
            quantity: values.quantity,
            min_stock: values.min_stock,
            unit_cost: calculatedCost, // استخدام التكلفة المحسوبة
            sales_price: values.sales_price
          })
          .eq('id', initialData.id)
          .select();
          
        if (error) throw error;
        
        // Handle ingredients - first delete existing
        await supabase
          .from('semi_finished_ingredients')
          .delete()
          .eq('semi_finished_id', initialData.id);
        
        // Then insert new ingredients
        if (ingredients.length > 0) {
          const ingredientData = ingredients.map(ing => ({
            semi_finished_id: initialData.id,
            raw_material_id: ing.id,
            percentage: ing.percentage
          }));
          
          const { error: ingredientError } = await supabase
            .from('semi_finished_ingredients')
            .insert(ingredientData);
            
          if (ingredientError) throw ingredientError;
        }
        
        return data;
      } else {
        // Generate a code for new record
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
        
        // Insert new product
        const { data, error } = await supabase
          .from('semi_finished_products')
          .insert({
            code: newCode,
            name: values.name,
            unit: values.unit,
            quantity: values.quantity,
            min_stock: values.min_stock,
            unit_cost: calculatedCost, // استخدام التكلفة المحسوبة
            sales_price: values.sales_price
          })
          .select();
          
        if (error) throw error;
        
        // Insert ingredients
        if (ingredients.length > 0 && data && data.length > 0) {
          const ingredientData = ingredients.map(ing => ({
            semi_finished_id: data[0].id,
            raw_material_id: ing.id,
            percentage: ing.percentage
          }));
          
          const { error: ingredientError } = await supabase
            .from('semi_finished_ingredients')
            .insert(ingredientData);
            
          if (ingredientError) throw ingredientError;
        }
        
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      toast.success(isEditing ? 'تم تعديل المنتج النصف مصنع بنجاح' : 'تمت إضافة المنتج النصف مصنع بنجاح');
      onClose();
      form.reset();
    },
    onError: (error: any) => {
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
                    <FormLabel>تكلفة الوحدة (محسوبة)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        {...field} 
                        value={calculatedCost}
                        disabled
                        className="bg-muted"
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
                      * يتم حساب هذه القيمة تلقائياً بناءً على المكونات ونسبها
                    </div>
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
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">مكونات المنتج (المواد الأولية)</h3>
                <div className="text-sm text-muted-foreground">
                  مجموع النسب: {ingredients.reduce((sum, ing) => sum + ing.percentage, 0)}%
                </div>
              </div>
              
              <div className="flex space-x-4 rtl:space-x-reverse">
                <div className="flex-1">
                  <FormLabel>المادة الأولية</FormLabel>
                  <Select
                    value={selectedRawMaterial}
                    onValueChange={setSelectedRawMaterial}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مادة أولية" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map(material => (
                        <SelectItem key={material.id} value={String(material.id)}>
                          {material.name} - تكلفة: {material.unit_cost}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-32">
                  <FormLabel>النسبة %</FormLabel>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={percentage}
                    onChange={e => setPercentage(Number(e.target.value))}
                  />
                </div>
                
                <div className="flex items-end">
                  <Button type="button" onClick={handleAddIngredient}>
                    <PlusCircle size={16} className="mr-2" />
                    إضافة
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {ingredients.length > 0 ? (
                  ingredients.map(ing => {
                    const contributionCost = ing.unit_cost * (ing.percentage / 100);
                    
                    return (
                      <div key={ing.id} className="flex justify-between items-center p-2 border rounded-md">
                        <div>
                          <div className="font-medium">{ing.name}</div>
                          <div className="text-sm text-muted-foreground">
                            النسبة: {ing.percentage}% | 
                            التكلفة: {ing.unit_cost} × {ing.percentage}% = {contributionCost.toFixed(2)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveIngredient(ing.id)}
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-muted-foreground text-center py-2">
                    لم يتم إضافة مكونات بعد
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-md mt-4">
              <div className="flex justify-between items-center">
                <div className="font-medium">التكلفة الإجمالية للوحدة:</div>
                <div className="font-bold text-lg">{calculatedCost.toFixed(2)}</div>
              </div>
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
