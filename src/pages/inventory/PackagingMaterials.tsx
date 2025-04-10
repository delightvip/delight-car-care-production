
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUp, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import PackagingMaterialsList from '@/components/inventory/packaging-materials/PackagingMaterialsList';
import PackagingMaterialDetails from '@/components/inventory/packaging-materials/PackagingMaterialDetails';
import ImportPackagingMaterialsDialog from '@/components/inventory/packaging-materials/ImportPackagingMaterialsDialog';
import InventoryService from '@/services/InventoryService';

const units = ['قطعة', 'علبة', 'كرتونة', 'رول', 'متر'];

interface PackagingMaterial {
  id: number;
  code: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  minStock: number;
  importance: number;
  totalValue: number;
}

const PackagingMaterials = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false); // حالة نافذة الجرد
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [currentMaterial, setCurrentMaterial] = useState<PackagingMaterial | null>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: '',
    price: 0,
    quantity: 0,
    minStock: 0
  });
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value' | 'high-importance'>('all');
  
  const queryClient = useQueryClient();
  
  const { data: packagingMaterials, isLoading } = useQuery({
    queryKey: ['packagingMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw new Error(error.message);
      }
      
      return data.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        price: item.unit_cost,
        quantity: item.quantity,
        minStock: item.min_stock,
        importance: item.importance || 0,
        totalValue: item.quantity * item.unit_cost
      }));
    }
  });
  
  // Update inventory mutation
  const updateInventoryMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const updates = items.map(async (item) => {
        if (item.actualQuantity !== undefined) {
          const { error } = await supabase
            .from('packaging_materials')
            .update({ quantity: item.actualQuantity })
            .eq('id', item.id);
            
          if (error) throw new Error(error.message);
        }
      });
      
      await Promise.all(updates);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      toast.success('تم تحديث الجرد بنجاح');
      setIsInventoryDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ أثناء تحديث الجرد: ${error.message}`);
    }
  });
  
  // Open inventory dialog
  const openInventoryDialog = () => {
    if (packagingMaterials) {
      const initialItems = packagingMaterials.map(item => ({
        ...item,
        actualQuantity: item.quantity,
        difference: 0
      }));
      setInventoryItems(initialItems);
      setIsInventoryDialogOpen(true);
    }
  };
  
  // Update actual quantity
  const updateActualQuantity = (id: number, quantity: number) => {
    setInventoryItems(prevItems => 
      prevItems.map(item => 
        item.id === id 
          ? { 
              ...item, 
              actualQuantity: quantity, 
              difference: quantity - item.quantity 
            } 
          : item
      )
    );
  };
  
  // Save inventory
  const saveInventory = () => {
    updateInventoryMutation.mutate(inventoryItems);
  };
  
  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (newItem: any) => {
      const { data: maxCode } = await supabase
        .from('packaging_materials')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);
        
      let newCode = 'PKG-00001';
      if (maxCode && maxCode.length > 0) {
        const lastNum = parseInt(maxCode[0].code.split('-')[1]);
        newCode = `PKG-${String(lastNum + 1).padStart(5, '0')}`;
      }
      
      const { data, error } = await supabase
        .from('packaging_materials')
        .insert([{
          code: newCode,
          name: newItem.name,
          unit: newItem.unit,
          unit_cost: newItem.price,
          quantity: newItem.quantity,
          min_stock: newItem.minStock,
          importance: 0
        }])
        .select();
        
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      toast.success('تمت إضافة مستلزم التعبئة بنجاح');
      setIsAddDialogOpen(false);
      setNewMaterial({
        name: '',
        unit: '',
        price: 0,
        quantity: 0,
        minStock: 0
      });
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (material: any) => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .update({
          name: material.name,
          unit: material.unit,
          unit_cost: material.price,
          quantity: material.quantity,
          min_stock: material.minStock
        })
        .eq('id', material.id)
        .select();
        
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      toast.success('تم تعديل مستلزم التعبئة بنجاح');
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('packaging_materials')
        .delete()
        .eq('id', id);
        
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      toast.success('تم حذف مستلزم التعبئة بنجاح');
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });

  // Quick update quantity
  const quickUpdateQuantityMutation = useMutation({
    mutationFn: async ({ id, change }: { id: number, change: number }) => {
      // Get current material
      const { data: material, error: fetchError } = await supabase
        .from('packaging_materials')
        .select('quantity')
        .eq('id', id)
        .single();
        
      if (fetchError) throw new Error(fetchError.message);
      
      // Calculate new quantity (ensure it's not negative)
      const newQuantity = Math.max(0, material.quantity + change);
      
      // Update quantity
      const { data, error } = await supabase
        .from('packaging_materials')
        .update({ quantity: newQuantity })
        .eq('id', id)
        .select();
        
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      toast.success('تم تحديث الكمية بنجاح');
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });
  
  const handleAddMaterial = () => {
    if (!newMaterial.name || !newMaterial.unit) {
      toast.error('يجب ملء جميع الحقول المطلوبة');
      return;
    }
    
    addMutation.mutate(newMaterial);
  };
  
  const handleEditMaterial = () => {
    if (!currentMaterial) return;
    
    updateMutation.mutate({
      id: currentMaterial.id,
      name: currentMaterial.name,
      unit: currentMaterial.unit,
      price: currentMaterial.price,
      quantity: currentMaterial.quantity,
      minStock: currentMaterial.minStock
    });
  };
  
  const handleDeleteMaterial = () => {
    if (!currentMaterial) return;
    
    const inventoryService = InventoryService.getInstance();
    inventoryService.deletePackagingMaterial(currentMaterial.id).then((success) => {
      if (success) {
        setIsDeleteDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
      }
    });
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">مستلزمات التعبئة</h1>
            <p className="text-muted-foreground mt-1">إدارة مستلزمات التعبئة والتغليف</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openInventoryDialog}>
              <ClipboardCheck size={18} className="mr-2" />
              جرد المخزون
            </Button>
            
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="تصفية المستلزمات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المستلزمات</SelectItem>
                <SelectItem value="low-stock">المخزون المنخفض</SelectItem>
                <SelectItem value="high-value">الأعلى قيمة</SelectItem>
                <SelectItem value="high-importance">الأكثر أهمية</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <FileUp size={18} className="mr-2" />
              استيراد
            </Button>
          </div>
        </div>

        {selectedMaterialId ? (
          <PackagingMaterialDetails
            materialId={selectedMaterialId}
            onEditClick={() => {
              setIsEditDialogOpen(true);
            }}
            onQuantityUpdate={(id, change) => {
              quickUpdateQuantityMutation.mutate({ id, change });
            }}
            onBackClick={() => setSelectedMaterialId(null)}
          />
        ) : (
          <PackagingMaterialsList
            onAddClick={() => setIsAddDialogOpen(true)}
            onEditClick={(material) => {
              setCurrentMaterial(material);
              setIsEditDialogOpen(true);
            }}
            onDeleteClick={(material) => {
              setCurrentMaterial(material);
              setIsDeleteDialogOpen(true);
            }}
            onViewClick={(material) => {
              setSelectedMaterialId(material.id);
            }}
            onQuantityUpdate={(id, change) => {
              quickUpdateQuantityMutation.mutate({ id, change });
            }}
          />
        )}
        
        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مستلزم تعبئة جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات مستلزم التعبئة الجديد. سيتم إنشاء كود فريد للمستلزم تلقائيًا.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">اسم المستلزم</Label>
                <Input
                  id="name"
                  value={newMaterial.name}
                  onChange={e => setNewMaterial({...newMaterial, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">وحدة القياس</Label>
                <Select 
                  value={newMaterial.unit} 
                  onValueChange={value => setNewMaterial({...newMaterial, unit: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر وحدة القياس" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(unit => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">سعر الوحدة</Label>
                <Input
                  id="price"
                  type="number"
                  value={newMaterial.price}
                  onChange={e => setNewMaterial({...newMaterial, price: Number(e.target.value)})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">الكمية</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={newMaterial.quantity}
                  onChange={e => setNewMaterial({...newMaterial, quantity: Number(e.target.value)})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minStock">الحد الأدنى للمخزون</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={newMaterial.minStock}
                  onChange={e => setNewMaterial({...newMaterial, minStock: Number(e.target.value)})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAddMaterial} disabled={addMutation.isPending}>
                {addMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل مستلزم تعبئة</DialogTitle>
              <DialogDescription>
                تعديل بيانات مستلزم التعبئة.
              </DialogDescription>
            </DialogHeader>
            {currentMaterial && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-code">الكود</Label>
                  <Input
                    id="edit-code"
                    value={currentMaterial.code}
                    disabled
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">اسم المستلزم</Label>
                  <Input
                    id="edit-name"
                    value={currentMaterial.name}
                    onChange={e => setCurrentMaterial({...currentMaterial, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-unit">وحدة القياس</Label>
                  <Select 
                    value={currentMaterial.unit} 
                    onValueChange={value => setCurrentMaterial({...currentMaterial, unit: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر وحدة القياس" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-price">سعر الوحدة</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={currentMaterial.price}
                    onChange={e => setCurrentMaterial({...currentMaterial, price: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-quantity">الكمية</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={currentMaterial.quantity}
                    onChange={e => setCurrentMaterial({...currentMaterial, quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-minStock">الحد الأدنى للمخزون</Label>
                  <Input
                    id="edit-minStock"
                    type="number"
                    value={currentMaterial.minStock}
                    onChange={e => setCurrentMaterial({...currentMaterial, minStock: Number(e.target.value)})}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleEditMaterial} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف مستلزم تعبئة</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذا المستلزم؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>
            </DialogHeader>
            {currentMaterial && (
              <div className="py-4">
                <p className="font-medium">{currentMaterial.name}</p>
                <p className="text-sm text-muted-foreground">{currentMaterial.code}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                إلغاء
              </Button>
              <Button variant="destructive" onClick={handleDeleteMaterial}>
                حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <ImportPackagingMaterialsDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
        />

        {/* Inventory Dialog */}
        <Dialog open={isInventoryDialogOpen} onOpenChange={setIsInventoryDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-xl">جرد مستلزمات التعبئة</DialogTitle>
              <DialogDescription>
                قم بتحديث الكميات الفعلية للمستلزمات بناءً على الجرد الفعلي.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="border rounded-md">
                <div className="grid grid-cols-12 bg-muted/50 p-3 font-medium text-sm border-b">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">الكود</div>
                  <div className="col-span-3">اسم المستلزم</div>
                  <div className="col-span-1">الوحدة</div>
                  <div className="col-span-2 text-center">الكمية في النظام</div>
                  <div className="col-span-2 text-center">الكمية الفعلية</div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {inventoryItems.map((item, index) => (
                    <div key={item.id} className={`grid grid-cols-12 p-3 items-center ${index % 2 === 1 ? 'bg-muted/20' : ''}`}>
                      <div className="col-span-1 text-muted-foreground">{index + 1}</div>
                      <div className="col-span-3 text-sm">{item.code}</div>
                      <div className="col-span-3 font-medium">{item.name}</div>
                      <div className="col-span-1">{item.unit}</div>
                      <div className="col-span-2 text-center font-medium">{item.quantity}</div>
                      <div className="col-span-2">
                        <Input 
                          type="number" 
                          min="0"
                          className="text-center"
                          value={item.actualQuantity}
                          onChange={(e) => updateActualQuantity(item.id, Number(e.target.value))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {inventoryItems.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    لا توجد مستلزمات متاحة للجرد
                  </div>
                )}
              </div>
              
              <div className="mt-6 bg-muted/20 border rounded-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">إجمالي المستلزمات</h4>
                    <p className="text-2xl font-bold">{inventoryItems.length}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">المستلزمات المعدلة</h4>
                    <p className="text-2xl font-bold">
                      {inventoryItems.filter(item => item.quantity !== item.actualQuantity).length}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">الفرق الكلي</h4>
                    <p className={`text-2xl font-bold ${
                      inventoryItems.reduce((acc, item) => acc + (item.actualQuantity - item.quantity), 0) < 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {inventoryItems.reduce((acc, item) => acc + (item.actualQuantity - item.quantity), 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <div className="w-full flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    سيتم تحديث الكميات في النظام وفقًا للكميات الفعلية
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsInventoryDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button 
                    onClick={saveInventory} 
                    disabled={updateInventoryMutation.isPending}
                    className="min-w-[100px]"
                  >
                    {updateInventoryMutation.isPending ? 'جاري الحفظ...' : 'حفظ الجرد'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default PackagingMaterials;
