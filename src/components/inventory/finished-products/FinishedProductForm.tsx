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
import { Badge } from '@/components/ui/badge';
import { PlusCircle, X, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Define form schema
const finishedProductSchema = z.object({
  name: z.string().min(2, { message: "يجب أن يحتوي الاسم على حرفين على الأقل" }),
  unit: z.string().min(1, { message: "يرجى اختيار وحدة القياس" }),
  quantity: z.coerce.number().min(0, { message: "الكمية يجب أن تكون 0 أو أكثر" }),
  min_stock: z.coerce.number().min(0, { message: "الحد الأدنى يجب أن يكون 0 أو أكثر" }),
  unit_cost: z.coerce.number().min(0, { message: "التكلفة يجب أن تكون 0 أو أكثر" }),
  sales_price: z.coerce.number().min(0, { message: "سعر البيع يجب أن يكون 0 أو أكثر" }),
  semi_finished_id: z.coerce.number().min(1, { message: "يجب اختيار منتج نصف مصنع" }),
  semi_finished_quantity: z.coerce.number().min(0.1, { message: "كمية المنتج النصف مصنع يجب أن تكون أكبر من 0" })
});

const units = ['كجم', 'لتر', 'مللى', 'جم', 'علبة', 'قطعة', 'كرتونة'];

interface PackagingItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
}

interface FinishedProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  title: string;
  submitText: string;
}

const FinishedProductForm: React.FC<FinishedProductFormProps> = ({
  isOpen,
  onClose,
  initialData,
  title,
  submitText
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;  const [selectedPackaging, setSelectedPackaging] = useState<string>('');
  const [packagingQuantity, setPackagingQuantity] = useState<number>(1);
  const [packaging, setPackaging] = useState<PackagingItem[]>([]);
  const [semiFinishedUnitCost, setSemiFinishedUnitCost] = useState<number>(0);
  const [packagingCost, setPackagingCost] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  
  // حالات البحث
  const [semiFinishedSearchTerm, setSemiFinishedSearchTerm] = useState<string>('');
  const [packagingSearchTerm, setPackagingSearchTerm] = useState<string>('');
  
  // Fetch semi-finished products
  const { data: semiFinishedProducts = [], isLoading: isSemiFinishedLoading } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('id, name, code, unit_cost')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }  });
  
  // ترشيح المنتجات النصف مصنعة حسب البحث
  const filteredSemiFinishedProducts = semiFinishedProducts.filter(product => 
    product.name.toLowerCase().includes(semiFinishedSearchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(semiFinishedSearchTerm.toLowerCase())
  );
  
  // Fetch packaging materials
  const { data: packagingMaterials = [], isLoading: isPackagingLoading } = useQuery({
    queryKey: ['packagingMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('id, name, code, unit_cost')
        .order('name', { ascending: true });
        if (error) throw error;
      return data;
    }
  });
  
  // ترشيح مواد التعبئة حسب البحث
  const filteredPackagingMaterials = packagingMaterials.filter(material => 
    material.name.toLowerCase().includes(packagingSearchTerm.toLowerCase()) ||
    material.code.toLowerCase().includes(packagingSearchTerm.toLowerCase())
  );
  
  const form = useForm<z.infer<typeof finishedProductSchema>>({
    resolver: zodResolver(finishedProductSchema),
    defaultValues: {
      name: initialData?.name || "",
      unit: initialData?.unit || units[0],
      quantity: initialData?.quantity || 0,
      min_stock: initialData?.min_stock || 0,
      unit_cost: initialData?.unit_cost || 0,
      sales_price: initialData?.sales_price || 0,
      semi_finished_id: initialData?.semi_finished_id || 0,
      semi_finished_quantity: initialData?.semi_finished_quantity || 1
    }
  });
  
  // Load existing packaging materials if editing
  useEffect(() => {
    if (isEditing && initialData) {
      // Fetch packaging for this product
      const fetchPackaging = async () => {
        const { data, error } = await supabase
          .from('finished_product_packaging')
          .select(`
            id,
            quantity,
            packaging_material:packaging_material_id(id, name, code, unit_cost)
          `)
          .eq('finished_product_id', initialData.id);
          
        if (error) {
          toast.error('خطأ في جلب مواد التعبئة');
          return;
        }
        
        // Format packaging materials for our state
        const formattedPackaging = data?.map((pkg) => ({
          id: pkg.packaging_material?.id,
          code: pkg.packaging_material?.code,
          name: pkg.packaging_material?.name,
          quantity: pkg.quantity
        })) || [];
        
        setPackaging(formattedPackaging);
        
        // احتساب تكلفة مواد التعبئة
        calculatePackagingCost(formattedPackaging);
      };
      
      fetchPackaging();
      
      // جلب تكلفة المنتج النصف مصنع
      const semiFinished = semiFinishedProducts.find(p => p.id === initialData.semi_finished_id);
      if (semiFinished) {
        setSemiFinishedUnitCost(Number(semiFinished.unit_cost));
        calculateTotalCost(Number(semiFinished.unit_cost), Number(initialData.semi_finished_quantity), packagingCost);
      }
    }
  }, [isEditing, initialData, semiFinishedProducts]);
  
  // تحديث التكلفة عند تغيير المنتج النصف مصنع
  useEffect(() => {
    const semiFinishedId = form.watch('semi_finished_id');
    const semiFinishedQty = form.watch('semi_finished_quantity');
    
    if (semiFinishedId) {
      const semiFinished = semiFinishedProducts.find(p => p.id === semiFinishedId);
      if (semiFinished) {
        setSemiFinishedUnitCost(Number(semiFinished.unit_cost));
        calculateTotalCost(Number(semiFinished.unit_cost), Number(semiFinishedQty), packagingCost);
      }
    }
  }, [form.watch('semi_finished_id'), form.watch('semi_finished_quantity'), semiFinishedProducts, packagingCost]);
  
  // تحديث التكلفة الإجمالية
  const calculateTotalCost = (unitCost: number, quantity: number, packagingTotal: number) => {
    const semiFinishedTotal = unitCost * quantity;
    const newTotalCost = semiFinishedTotal + packagingTotal;
    setTotalCost(newTotalCost);
    form.setValue('unit_cost', newTotalCost);
  };
  
  // حساب تكلفة مواد التعبئة
  const calculatePackagingCost = (packagingItems: PackagingItem[]) => {
    let total = 0;
    
    packagingItems.forEach((item) => {
      const material = packagingMaterials.find(m => m.id === item.id);
      if (material) {
        total += Number(material.unit_cost) * Number(item.quantity);
      }
    });
    
    setPackagingCost(total);
    
    // تحديث التكلفة الإجمالية بعد تحديث تكلفة مواد التعبئة
    const semiFinishedQty = form.watch('semi_finished_quantity');
    calculateTotalCost(semiFinishedUnitCost, Number(semiFinishedQty), total);
  };
  
  const handleAddPackaging = () => {
    if (!selectedPackaging) {
      toast.error('يرجى اختيار مادة تعبئة');
      return;
    }
    
    if (packagingQuantity <= 0) {
      toast.error('يجب أن تكون الكمية أكبر من 0');
      return;
    }
    
    // Check if already exists
    if (packaging.some(pkg => pkg.id === parseInt(selectedPackaging))) {
      toast.error('تم إضافة هذه المادة بالفعل');
      return;
    }
    
    const packageMaterial = packagingMaterials.find(m => m.id === parseInt(selectedPackaging));
    if (!packageMaterial) return;
    
    const newPackaging = [
      ...packaging,
      {
        id: packageMaterial.id,
        code: packageMaterial.code,
        name: packageMaterial.name,
        quantity: packagingQuantity
      }
    ];
    
    setPackaging(newPackaging);
    calculatePackagingCost(newPackaging);
    
    setSelectedPackaging('');
    setPackagingQuantity(1);
  };
  
  const handleRemovePackaging = (id: number) => {
    const updatedPackaging = packaging.filter(pkg => pkg.id !== id);
    setPackaging(updatedPackaging);
    calculatePackagingCost(updatedPackaging);
  };
  
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof finishedProductSchema>) => {
      if (isEditing) {
        // Update existing product
        const { data, error } = await supabase
          .from('finished_products')
          .update({
            name: values.name,
            unit: values.unit,
            quantity: values.quantity,
            min_stock: values.min_stock,
            unit_cost: totalCost, // استخدام التكلفة المحسوبة
            sales_price: values.sales_price,
            semi_finished_id: values.semi_finished_id,
            semi_finished_quantity: values.semi_finished_quantity
          })
          .eq('id', initialData.id)
          .select();
          
        if (error) throw error;
        
        // Handle packaging materials - first delete existing
        await supabase
          .from('finished_product_packaging')
          .delete()
          .eq('finished_product_id', initialData.id);
        
        // Then insert new packaging materials
        if (packaging.length > 0) {
          const packagingData = packaging.map(pkg => ({
            finished_product_id: initialData.id,
            packaging_material_id: pkg.id,
            quantity: pkg.quantity
          }));
          
          const { error: packagingError } = await supabase
            .from('finished_product_packaging')
            .insert(packagingData);
            
          if (packagingError) throw packagingError;
        }
        
        return data;
      } else {
        // Generate a code for new record
        const { data: maxCode } = await supabase
          .from('finished_products')
          .select('code')
          .order('code', { ascending: false })
          .limit(1);
          
        let newCode = 'FIN-00001';
        if (maxCode && maxCode.length > 0) {
          const lastCode = maxCode[0].code;
          const lastNum = parseInt(lastCode.split('-')[1]);
          newCode = `FIN-${String(lastNum + 1).padStart(5, '0')}`;
        }
        
        // Insert new product
        const { data, error } = await supabase
          .from('finished_products')
          .insert({
            code: newCode,
            name: values.name,
            unit: values.unit,
            quantity: values.quantity,
            min_stock: values.min_stock,
            unit_cost: totalCost, // استخدام التكلفة المحسوبة
            sales_price: values.sales_price,
            semi_finished_id: values.semi_finished_id,
            semi_finished_quantity: values.semi_finished_quantity
          })
          .select();
          
        if (error) throw error;
        
        // Insert packaging materials
        if (packaging.length > 0 && data && data.length > 0) {
          const packagingData = packaging.map(pkg => ({
            finished_product_id: data[0].id,
            packaging_material_id: pkg.id,
            quantity: pkg.quantity
          }));
          
          const { error: packagingError } = await supabase
            .from('finished_product_packaging')
            .insert(packagingData);
            
          if (packagingError) throw packagingError;
        }
        
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      toast.success(isEditing ? 'تم تعديل المنتج النهائي بنجاح' : 'تمت إضافة المنتج النهائي بنجاح');
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  const onSubmit = (values: z.infer<typeof finishedProductSchema>) => {
    if (packaging.length === 0) {
      toast.error('يجب إضافة مادة تعبئة واحدة على الأقل');
      return;
    }
    
    // Ensure unit_cost is the calculated totalCost value
    const submissionValues = {
      ...values,
      unit_cost: totalCost
    };
    
    mutation.mutate(submissionValues);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            أدخل بيانات المنتج النهائي مع مكوناته ومواد التعبئة
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* بيانات المنتج الأساسية */}
            <div className="bg-secondary/20 p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">البيانات الأساسية</h3>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">اسم المنتج</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="أدخل اسم المنتج النهائي" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">وحدة القياس</FormLabel>
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
                        <FormLabel className="font-medium">الكمية</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="min_stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">الحد الأدنى للمخزون</FormLabel>
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
                        <FormLabel className="font-medium">تكلفة الوحدة (محسوبة)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            {...field} 
                            value={totalCost}
                            disabled
                            className="bg-muted"
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground mt-1">
                          * يتم حساب هذه القيمة تلقائياً بناءً على المكونات
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
                        <FormLabel className="font-medium">سعر البيع</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
              {/* قسم المنتج النصف مصنع */}
            <div className="bg-primary/10 p-4 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">المنتج النصف مصنع</h3>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="semi_finished_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">المنتج النصف مصنع</FormLabel>
                      <div className="relative">
                        <div className="flex items-center relative">
                          <Input
                            placeholder="ابحث عن منتج نصف مصنع..."
                            value={semiFinishedSearchTerm}
                            onChange={(e) => setSemiFinishedSearchTerm(e.target.value)}
                            className="pr-8" // توفير مساحة للأيقونة
                          />
                          <div className="absolute left-2 opacity-70">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                          </div>
                        </div>                        
                        {/* عرض نتائج البحث مباشرة أسفل حقل البحث */}
                        {semiFinishedSearchTerm.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-popover border rounded-md shadow-lg">
                            {filteredSemiFinishedProducts.length > 0 ? (
                              filteredSemiFinishedProducts.map(product => (
                                <div 
                                  key={product.id} 
                                  className={`px-3 py-2 cursor-pointer hover:bg-accent transition-colors duration-150 ${
                                    field.value === product.id ? 'bg-accent/50' : ''
                                  }`}                                  onClick={() => {
                                    field.onChange(product.id);
                                    // اختيار المنتج وإغلاق قائمة البحث
                                    const selectedProduct = semiFinishedProducts.find(p => p.id === product.id);
                                    if (selectedProduct) {
                                      setSemiFinishedUnitCost(Number(selectedProduct.unit_cost));
                                      // مسح مصطلح البحث لإغلاق القائمة
                                      setSemiFinishedSearchTerm('');
                                    }
                                  }}
                                >
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-muted-foreground flex items-center justify-between">
                                    <span>الكود: {product.code}</span>
                                    <span className="font-semibold">التكلفة: {product.unit_cost} ج.م</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-muted-foreground">لا توجد نتائج مطابقة</div>
                            )}
                          </div>
                        )}
                        
                        {/* عرض المنتج المختار */}
                        {field.value && !semiFinishedSearchTerm && (
                          <div className="p-3 border rounded-md mt-2 bg-secondary/10">
                            {(() => {
                              const selected = semiFinishedProducts.find(p => p.id === field.value);
                              return selected ? (
                                <div className="flex flex-col">
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-base">{selected.name}</span>
                                    <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-xs font-bold">
                                      {selected.code}
                                    </span>
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1 flex justify-between">
                                    <span>تكلفة الوحدة:</span>
                                    <span className="font-semibold">{selected.unit_cost} ج.م</span>
                                  </div>
                                </div>
                              ) : 'اختر منتج نصف مصنع';
                            })()}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <FormField
                    control={form.control}
                    name="semi_finished_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">كمية المنتج النصف مصنع</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input type="number" min="0.1" step="0.01" {...field} className="pr-20" />
                          </FormControl>
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium px-2 py-1 bg-secondary/30 rounded">
                            لكل وحدة
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex items-end h-full">
                    <div className="border rounded p-3 w-full bg-secondary/10 h-10 flex items-center justify-between">
                      <span className="text-sm">تكلفة المكون:</span>
                      <span className="font-bold text-primary">
                        {(semiFinishedUnitCost * form.watch('semi_finished_quantity')).toFixed(2)} ج.م
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-accent/10 p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">مواد التعبئة</h3>
                <div className="font-medium text-sm bg-secondary/20 px-3 py-1 rounded-full">
                  <span>إجمالي التكلفة: </span>
                  <span className="font-bold text-primary">{packagingCost.toFixed(2)} ج.م</span>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div className="col-span-2">
                  <FormLabel className="font-medium">مادة التعبئة</FormLabel>
                  <div className="relative">
                    <div className="flex items-center relative">
                      <Input
                        placeholder="ابحث عن مادة تعبئة..."
                        value={packagingSearchTerm}
                        onChange={(e) => setPackagingSearchTerm(e.target.value)}
                        className="pr-8"
                      />
                      <div className="absolute left-2 opacity-70">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      </div>
                    </div>                    
                    {/* عرض نتائج البحث */}
                    {packagingSearchTerm.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-popover border rounded-md shadow-lg">
                        {filteredPackagingMaterials.length > 0 ? (
                          filteredPackagingMaterials.map(material => (
                            <div 
                              key={material.id} 
                              className={`px-3 py-2 cursor-pointer hover:bg-accent transition-colors duration-150 ${
                                selectedPackaging === String(material.id) ? 'bg-accent/50' : ''
                              }`}                              onClick={() => {
                                setSelectedPackaging(String(material.id));
                                // مسح مصطلح البحث لإغلاق القائمة
                                setPackagingSearchTerm('');
                              }}
                            >
                              <div className="font-medium">{material.name}</div>
                              <div className="text-sm text-muted-foreground flex items-center justify-between">
                                <span>الكود: {material.code}</span>
                                <span className="font-semibold">التكلفة: {material.unit_cost} ج.م</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-muted-foreground">لا توجد نتائج مطابقة</div>
                        )}
                      </div>
                    )}
                    
                    {/* عرض المادة المختارة */}
                    {selectedPackaging && !packagingSearchTerm && (
                      <div className="p-3 border rounded-md mt-2 bg-secondary/10">
                        {(() => {
                          const selected = packagingMaterials.find(m => String(m.id) === selectedPackaging);
                          return selected ? (
                            <div className="flex flex-col">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-base">{selected.name}</span>
                                <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-xs font-bold">
                                  {selected.code}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1 flex justify-between">
                                <span>تكلفة الوحدة:</span>
                                <span className="font-semibold">{selected.unit_cost} ج.م</span>
                              </div>
                            </div>
                          ) : 'اختر مادة تعبئة';
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="col-span-1">
                  <FormLabel className="font-medium">الكمية</FormLabel>
                  <Input 
                    type="number" 
                    min="1"
                    value={packagingQuantity}
                    onChange={e => setPackagingQuantity(Number(e.target.value))}
                    className="h-10"
                  />
                </div>
                
                <div className="col-span-1 flex items-end">
                  <Button 
                    type="button" 
                    onClick={handleAddPackaging} 
                    className="w-full h-10 bg-primary hover:bg-primary/90"
                  >
                    <PlusCircle size={16} className="ml-1" />
                    <span>إضافة</span>
                  </Button>
                </div>
              </div>
              
              {/* قائمة مواد التعبئة المضافة */}
              <div className="mt-4 border rounded-md divide-y">
                {packaging.length > 0 ? (
                  packaging.map(pkg => {
                    const material = packagingMaterials.find(m => m.id === pkg.id);
                    const cost = material ? material.unit_cost * pkg.quantity : 0;
                    
                    return (
                      <div key={pkg.id} className="flex justify-between items-center p-3 hover:bg-secondary/10 transition-colors">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                          </div>
                          <div>
                            <div className="font-medium">{pkg.name}</div>
                            <div className="text-xs text-muted-foreground">
                              الكود: {pkg.code}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6 rtl:space-x-reverse">
                          <div className="text-sm text-right">
                            <div>الكمية: <span className="font-medium">{pkg.quantity}</span></div>
                            <div>التكلفة: <span className="font-medium">{cost.toFixed(2)} ج.م</span></div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemovePackaging(pkg.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package mb-2 opacity-30"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                    <div className="text-center">
                      <p>لم يتم إضافة مواد تعبئة بعد</p>
                      <p className="text-xs mt-1">يجب إضافة مادة تعبئة واحدة على الأقل</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-md mt-4">
              <div className="flex justify-between items-center">
                <div className="font-medium">التكلفة الإجمالية:</div>
                <div className="font-bold text-lg">{totalCost.toFixed(2)}</div>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                تكلفة المنتج النصف مصنع: {(semiFinishedUnitCost * form.watch('semi_finished_quantity')).toFixed(2)} + تكلفة مواد التعبئة: {packagingCost.toFixed(2)}
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

export default FinishedProductForm;
