import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Box, ArrowRight, Package, Info } from 'lucide-react';

interface InventoryUsageMatrixProps {
  inventoryType?: string;
}

const InventoryUsageMatrix: React.FC<InventoryUsageMatrixProps> = ({
  inventoryType = 'all'
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-usage-matrix', inventoryType],
    queryFn: async () => {
      try {
        let materialUsageMap: Record<string, {
          id: number | string,
          code: string,
          name: string,
          type: string,
          isUsed: boolean,
          usedInProducts: {
            id: number | string,
            code: string,
            name: string,
            type: string
          }[]
        }> = {};
        
        // جلب مكونات المنتجات نصف المصنعة
        if (inventoryType === 'all' || inventoryType === 'raw') {
          // تعديل استعلام Supabase لتفادي مشكلة العلاقات المتعددة
          const { data: ingredients } = await supabase
            .from('semi_finished_ingredients')
            .select(`
              id,
              raw_material_id,
              semi_finished_id,
              raw_material:raw_material_id(id, code, name)
            `);
          
          if (ingredients) {
            // للحصول على معلومات المنتجات نصف المصنعة عن طريق استعلام منفصل
            const semiFinishedIds = ingredients
              .filter(i => i.semi_finished_id)
              .map(i => i.semi_finished_id);
            
            const { data: semiProducts } = await supabase
              .from('semi_finished_products')
              .select('id, code, name')
              .in('id', semiFinishedIds);
            
            const semiProductsMap = new Map(
              (semiProducts || []).map(product => [product.id, product])
            );
            
            // إنشاء خريطة استخدام للمواد الخام
            ingredients.forEach(ingredient => {
              const rawMaterialId = ingredient.raw_material_id;
              const rawMaterial = ingredient.raw_material;
              const semiFinishedId = ingredient.semi_finished_id;
              const semiFinished = semiProductsMap.get(semiFinishedId);
              
              if (rawMaterial && semiFinished) {
                const key = `raw-${rawMaterialId}`;
                
                if (!materialUsageMap[key]) {
                  materialUsageMap[key] = {
                    id: rawMaterialId,
                    code: rawMaterial.code,
                    name: rawMaterial.name,
                    type: 'raw',
                    isUsed: true,
                    usedInProducts: []
                  };
                }
                
                // إضافة المنتج نصف المصنع إلى قائمة المنتجات التي تستخدم هذه المادة الخام
                materialUsageMap[key].usedInProducts.push({
                  id: semiFinished.id,
                  code: semiFinished.code,
                  name: semiFinished.name,
                  type: 'semi'
                });
              }
            });
          }
          
          // إضافة جميع المواد الخام إلى الخريطة (حتى غير المستخدمة)
          const { data: allRawMaterials } = await supabase
            .from('raw_materials')
            .select('id, code, name');
          
          if (allRawMaterials) {
            allRawMaterials.forEach(material => {
              const key = `raw-${material.id}`;
              
              if (!materialUsageMap[key]) {
                materialUsageMap[key] = {
                  id: material.id,
                  code: material.code,
                  name: material.name,
                  type: 'raw',
                  isUsed: false,
                  usedInProducts: []
                };
              }
            });
          }
        }
        
        // جلب استخدام مواد التعبئة
        if (inventoryType === 'all' || inventoryType === 'packaging') {
          const { data: packagingUsage } = await supabase
            .from('finished_product_packaging')
            .select(`
              id,
              packaging_material_id,
              finished_product_id,
              finished_product:finished_product_id(id, code, name)
            `);
          
          if (packagingUsage) {
            // إنشاء خريطة استخدام لمواد التعبئة
            packagingUsage.forEach(usage => {
              const packagingId = usage.packaging_material_id;
              const finishedProduct = usage.finished_product;
              
              if (finishedProduct) {
                const key = `packaging-${packagingId}`;
                
                if (!materialUsageMap[key]) {
                  // الحصول على معلومات مادة التعبئة
                  supabase
                    .from('packaging_materials')
                    .select('code, name')
                    .eq('id', packagingId)
                    .single()
                    .then(({ data: packaging }) => {
                      if (packaging) {
                        materialUsageMap[key] = {
                          id: packagingId,
                          code: packaging.code,
                          name: packaging.name,
                          type: 'packaging',
                          isUsed: true,
                          usedInProducts: [{
                            id: finishedProduct.id,
                            code: finishedProduct.code,
                            name: finishedProduct.name,
                            type: 'finished'
                          }]
                        };
                      }
                    });
                } else {
                  // إضافة المنتج النهائي إلى قائمة المنتجات التي تستخدم مادة التعبئة هذه
                  materialUsageMap[key].usedInProducts.push({
                    id: finishedProduct.id,
                    code: finishedProduct.code,
                    name: finishedProduct.name,
                    type: 'finished'
                  });
                }
              }
            });
          }
          
          // إضافة جميع مواد التعبئة إلى الخريطة (حتى غير المستخدمة)
          const { data: allPackagingMaterials } = await supabase
            .from('packaging_materials')
            .select('id, code, name');
          
          if (allPackagingMaterials) {
            allPackagingMaterials.forEach(material => {
              const key = `packaging-${material.id}`;
              
              if (!materialUsageMap[key]) {
                materialUsageMap[key] = {
                  id: material.id,
                  code: material.code,
                  name: material.name,
                  type: 'packaging',
                  isUsed: false,
                  usedInProducts: []
                };
              }
            });
          }
        }
        
        // جلب استخدام المنتجات نصف المصنعة
        if (inventoryType === 'all' || inventoryType === 'semi') {
          const { data: finishedProducts } = await supabase
            .from('finished_products')
            .select(`
              id, 
              code, 
              name, 
              semi_finished_id
            `);
          
          if (finishedProducts) {
            // إنشاء خريطة استخدام للمنتجات نصف المصنعة
            finishedProducts.forEach(product => {
              const semiFinishedId = product.semi_finished_id;
              
              if (semiFinishedId) {
                const key = `semi-${semiFinishedId}`;
                
                if (!materialUsageMap[key]) {
                  // الحصول على معلومات المنتج نصف المصن��
                  supabase
                    .from('semi_finished_products')
                    .select('code, name')
                    .eq('id', semiFinishedId)
                    .single()
                    .then(({ data: semiFinished }) => {
                      if (semiFinished) {
                        materialUsageMap[key] = {
                          id: semiFinishedId,
                          code: semiFinished.code,
                          name: semiFinished.name,
                          type: 'semi',
                          isUsed: true,
                          usedInProducts: [{
                            id: product.id,
                            code: product.code,
                            name: product.name,
                            type: 'finished'
                          }]
                        };
                      }
                    });
                } else {
                  // إضافة المنتج النهائي إلى قائمة المنتجات التي تستخدم المنتج نصف المصنع هذا
                  materialUsageMap[key].usedInProducts.push({
                    id: product.id,
                    code: product.code,
                    name: product.name,
                    type: 'finished'
                  });
                }
              }
            });
          }
          
          // إضافة جميع المنتجات نصف المصنعة إلى الخريطة (حتى غير المستخدمة)
          const { data: allSemiFinishedProducts } = await supabase
            .from('semi_finished_products')
            .select('id, code, name');
          
          if (allSemiFinishedProducts) {
            allSemiFinishedProducts.forEach(product => {
              const key = `semi-${product.id}`;
              
              if (!materialUsageMap[key]) {
                materialUsageMap[key] = {
                  id: product.id,
                  code: product.code,
                  name: product.name,
                  type: 'semi',
                  isUsed: false,
                  usedInProducts: []
                };
              }
            });
          }
        }
        
        // تحويل خريطة الاستخدام إلى مصفوفة
        const materialUsageArray = Object.values(materialUsageMap);
        
        // فرز المصفوفة حسب نوع المادة ثم حسب الاستخدام ثم حسب الاسم
        materialUsageArray.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type.localeCompare(b.type);
          }
          if (a.isUsed !== b.isUsed) {
            return a.isUsed ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        
        // إحصائيات ملخصة
        const totalMaterials = materialUsageArray.length;
        const usedMaterials = materialUsageArray.filter(m => m.isUsed).length;
        const unusedMaterials = totalMaterials - usedMaterials;
        
        const rawMaterialsCount = materialUsageArray.filter(m => m.type === 'raw').length;
        const usedRawMaterials = materialUsageArray.filter(m => m.type === 'raw' && m.isUsed).length;
        
        const packagingMaterialsCount = materialUsageArray.filter(m => m.type === 'packaging').length;
        const usedPackagingMaterials = materialUsageArray.filter(m => m.type === 'packaging' && m.isUsed).length;
        
        const semiFinishedCount = materialUsageArray.filter(m => m.type === 'semi').length;
        const usedSemiFinished = materialUsageArray.filter(m => m.type === 'semi' && m.isUsed).length;
        
        // تحديد المواد الأكثر استخدامًا (عدد المنتجات التي تستخدمها)
        const mostUsedMaterials = [...materialUsageArray]
          .filter(m => m.isUsed)
          .sort((a, b) => b.usedInProducts.length - a.usedInProducts.length)
          .slice(0, 5);
        
        return {
          materials: materialUsageArray,
          unusedMaterials: materialUsageArray.filter(m => !m.isUsed),
          mostUsedMaterials,
          summary: {
            totalMaterials,
            usedMaterials,
            unusedMaterials,
            rawMaterials: {
              total: rawMaterialsCount,
              used: usedRawMaterials,
              unused: rawMaterialsCount - usedRawMaterials
            },
            packagingMaterials: {
              total: packagingMaterialsCount,
              used: usedPackagingMaterials,
              unused: packagingMaterialsCount - usedPackagingMaterials
            },
            semiFinishedProducts: {
              total: semiFinishedCount,
              used: usedSemiFinished,
              unused: semiFinishedCount - usedSemiFinished
            }
          }
        };
      } catch (error) {
        console.error("Error analyzing inventory usage:", error);
        return null;
      }
    },
    refetchInterval: 600000 // إعادة الاستعلام كل 10 دقائق
  });
  
  const chartData = useMemo(() => {
    if (!data) return [];
    
    const summary = data.summary;
    
    return [
      { name: 'مواد خام مستخدمة', value: summary.rawMaterials.used },
      { name: 'مواد خام غير مستخدمة', value: summary.rawMaterials.unused },
      { name: 'مواد تعبئة مستخدمة', value: summary.packagingMaterials.used },
      { name: 'مواد تعبئة غير مستخدمة', value: summary.packagingMaterials.unused },
      { name: 'منتجات نصف مصنعة مستخدمة', value: summary.semiFinishedProducts.used },
      { name: 'منتجات نصف مصنعة غير مستخدمة', value: summary.semiFinishedProducts.unused }
    ];
  }, [data]);
  
  const COLORS = ['#0088FE', '#AAAAAA', '#00C49F', '#AAAAAA', '#FFBB28', '#AAAAAA'];
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>مصفوفة استخدام المخزون</CardTitle>
          <CardDescription>تحليل استخدام عناصر المخزون في المنتجات</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>مصفوفة استخدام المخزون</CardTitle>
          <CardDescription>تحليل استخدام عناصر المخزون في المنتجات</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6">
            تعذر تحليل استخدام المخزون. يرجى المحاولة مرة أخرى لاحقًا.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Box className="h-5 w-5 text-primary" />
          <span>مصفوفة استخدام المخزون</span>
        </CardTitle>
        <CardDescription>
          تحليل استخدام عناصر المخزون في المنتجات وتحديد العناصر غير المستخدمة
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-base font-medium mb-4">توزيع استخدام عناصر المخزون</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'عدد العناصر']}
                    labelFormatter={(name) => `${name}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <h3 className="text-base font-medium mb-4">ملخص استخدام المخزون</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">إجمالي عناصر المخزون</div>
                  <div className="text-2xl font-bold">{data.summary.totalMaterials}</div>
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-sm text-muted-foreground">العناصر غير المستخدمة</div>
                  <div className="text-2xl font-bold text-amber-600">{data.summary.unusedMaterials}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="border rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">المواد الخام</div>
                    <div className="text-sm">{data.summary.rawMaterials.total} عنصر</div>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-sm">
                    <div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        مستخدمة: {data.summary.rawMaterials.used}
                      </Badge>
                    </div>
                    <div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        غير مستخدمة: {data.summary.rawMaterials.unused}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">مواد التعبئة</div>
                    <div className="text-sm">{data.summary.packagingMaterials.total} عنصر</div>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-sm">
                    <div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        مستخدمة: {data.summary.packagingMaterials.used}
                      </Badge>
                    </div>
                    <div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        غير مستخدمة: {data.summary.packagingMaterials.unused}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">المنتجات نصف المصنعة</div>
                    <div className="text-sm">{data.summary.semiFinishedProducts.total} عنصر</div>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-sm">
                    <div>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        مستخدمة: {data.summary.semiFinishedProducts.used}
                      </Badge>
                    </div>
                    <div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        غير مستخدمة: {data.summary.semiFinishedProducts.unused}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="text-base font-medium mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <span>العناصر الأكثر استخدامًا</span>
            </h3>
            {data.mostUsedMaterials.length > 0 ? (
              <div className="space-y-3">
                {data.mostUsedMaterials.map((material) => (
                  <div 
                    key={`${material.type}-${material.id}`}
                    className="border rounded-md p-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="font-medium">{material.name}</span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{material.code}</span>
                          <Badge variant="outline" className="text-xs">
                            {material.type === 'raw' ? 'مواد خام' :
                            material.type === 'packaging' ? 'تعبئة' : 'نصف مصنع'}
                          </Badge>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        {material.usedInProducts.length} منتج
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <div className="text-sm font-medium mb-1">يستخدم في:</div>
                      <div className="flex flex-wrap gap-2">
                        {material.usedInProducts.slice(0, 3).map((product, idx) => (
                          <Badge key={idx} variant="outline" className="flex items-center gap-1">
                            {product.type === 'finished' ? (
                              <Package className="h-3 w-3" />
                            ) : (
                              <Box className="h-3 w-3" />
                            )}
                            {product.name}
                          </Badge>
                        ))}
                        {material.usedInProducts.length > 3 && (
                          <Badge variant="outline" className="text-muted-foreground">
                            +{material.usedInProducts.length - 3} أخرى
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4 border rounded-md">
                لا توجد بيانات كافية
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-base font-medium mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-500" />
              <span>العناصر غير المستخدمة</span>
            </h3>
            {data.unusedMaterials.length > 0 ? (
              <div className="space-y-3">
                {data.unusedMaterials.slice(0, 5).map((material) => (
                  <div 
                    key={`${material.type}-${material.id}`}
                    className="border rounded-md p-3 border-amber-200 bg-amber-50/30"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="font-medium">{material.name}</span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{material.code}</span>
                          <Badge variant="outline" className="text-xs">
                            {material.type === 'raw' ? 'مواد خام' :
                            material.type === 'packaging' ? 'تعبئة' : 'نصف مصنع'}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-200">
                        غير مستخدم
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground italic">
                      هذا العنصر غير مستخدم في أي منتج حاليًا.
                    </div>
                  </div>
                ))}
                
                {data.unusedMaterials.length > 5 && (
                  <div className="text-center text-muted-foreground mt-2">
                    +{data.unusedMaterials.length - 5} عناصر أخرى غير مستخدمة
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4 border rounded-md">
                لا توجد عناصر غير مستخدمة
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryUsageMatrix;
