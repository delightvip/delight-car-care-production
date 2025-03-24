
import React, { useState } from 'react';
import PageTransition from '@/components/ui/PageTransition';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Trash, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateCode } from '@/utils/generateCode';

// Mock data for finished products
const initialFinishedProducts = [
  {
    id: 1,
    code: 'FIN-00001',
    name: 'ملمع تابلوه 250مل',
    unit: 'قطعة',
    components: [
      { id: 1, type: 'semi', code: 'SEMI-00001', name: 'ملمع تابلوه سائل', quantity: 0.25, unit: 'لتر' },
      { id: 2, type: 'packaging', code: 'PKG-00001', name: 'عبوة بلاستيكية 250مل', quantity: 1, unit: 'قطعة' },
      { id: 3, type: 'packaging', code: 'PKG-00003', name: 'ملصق منتج ملمع تابلوه', quantity: 1, unit: 'قطعة' }
    ],
    unitCost: 20,
    quantity: 200,
    minStock: 50,
    totalValue: 4000
  },
  {
    id: 2,
    code: 'FIN-00002',
    name: 'منظف زجاج 500مل',
    unit: 'قطعة',
    components: [
      { id: 1, type: 'semi', code: 'SEMI-00002', name: 'منظف زجاج سائل', quantity: 0.5, unit: 'لتر' },
      { id: 2, type: 'packaging', code: 'PKG-00002', name: 'عبوة بلاستيكية 500مل', quantity: 1, unit: 'قطعة' },
      { id: 3, type: 'packaging', code: 'PKG-00004', name: 'ملصق منتج منظف زجاج', quantity: 1, unit: 'قطعة' }
    ],
    unitCost: 25,
    quantity: 150,
    minStock: 40,
    totalValue: 3750
  }
];

// Mock data for semi-finished products
const semiFinishedProducts = [
  {
    id: 1,
    code: 'SEMI-00001',
    name: 'ملمع تابلوه سائل',
    unit: 'لتر',
    unitCost: 40
  },
  {
    id: 2,
    code: 'SEMI-00002',
    name: 'منظف زجاج سائل',
    unit: 'لتر',
    unitCost: 30
  }
];

// Mock data for packaging materials
const packagingMaterials = [
  { id: 1, code: 'PKG-00001', name: 'عبوة بلاستيكية 250مل', unit: 'قطعة', price: 5 },
  { id: 2, code: 'PKG-00002', name: 'عبوة بلاستيكية 500مل', unit: 'قطعة', price: 8 },
  { id: 3, code: 'PKG-00003', name: 'ملصق منتج ملمع تابلوه', unit: 'قطعة', price: 1.5 },
  { id: 4, code: 'PKG-00004', name: 'ملصق منتج منظف زجاج', unit: 'قطعة', price: 1.5 },
  { id: 5, code: 'PKG-00005', name: 'كرتونة تعبئة (24 قطعة)', unit: 'قطعة', price: 10 }
];

const units = ['قطعة', 'علبة', 'كرتونة', 'طقم'];

const FinishedProducts = () => {
  const [products, setProducts] = useState(initialFinishedProducts);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    unit: '',
    components: [] as any[],
    quantity: 0,
    minStock: 0
  });
  const [selectedSemiFinished, setSelectedSemiFinished] = useState('');
  const [semiFinishedQuantity, setSemiFinishedQuantity] = useState(0);
  const [selectedPackaging, setSelectedPackaging] = useState('');
  const [packagingQuantity, setPackagingQuantity] = useState(0);
  
  const { toast } = useToast();
  
  // Columns for the data table
  const columns = [
    { key: 'code', title: 'الكود' },
    { key: 'name', title: 'اسم المنتج' },
    { key: 'unit', title: 'وحدة القياس' },
    { 
      key: 'components', 
      title: 'عدد المكونات',
      render: (value: any[]) => value.length
    },
    { 
      key: 'unitCost', 
      title: 'تكلفة الوحدة',
      render: (value: number) => `${value} ج.م`
    },
    { 
      key: 'quantity', 
      title: 'الكمية',
      render: (value: number, record: any) => `${value} ${record.unit}`
    },
    { 
      key: 'minStock', 
      title: 'الحد الأدنى',
      render: (value: number, record: any) => `${value} ${record.unit}`
    },
    { 
      key: 'totalValue', 
      title: 'إجمالي القيمة',
      render: (value: number) => `${value} ج.م`
    }
  ];
  
  // Calculate the unit cost based on components
  const calculateUnitCost = (components: any[]) => {
    return components.reduce((sum, component) => {
      if (component.type === 'semi') {
        const semiProduct = semiFinishedProducts.find(item => item.code === component.code);
        return sum + (semiProduct ? semiProduct.unitCost * component.quantity : 0);
      } else {
        const packagingMaterial = packagingMaterials.find(item => item.code === component.code);
        return sum + (packagingMaterial ? packagingMaterial.price * component.quantity : 0);
      }
    }, 0);
  };
  
  // Handle adding a semi-finished component
  const handleAddSemiFinished = () => {
    if (!selectedSemiFinished || semiFinishedQuantity <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار منتج نصف مصنع وتحديد الكمية",
        variant: "destructive"
      });
      return;
    }
    
    // Check if a semi-finished product already exists
    const hasSemiFinished = newProduct.components.some(c => c.type === 'semi');
    if (hasSemiFinished) {
      toast({
        title: "خطأ",
        description: "لا يمكن إضافة أكثر من منتج نصف مصنع واحد",
        variant: "destructive"
      });
      return;
    }
    
    const semiProduct = semiFinishedProducts.find(item => item.code === selectedSemiFinished);
    if (!semiProduct) return;
    
    const newComponent = {
      id: semiProduct.id,
      type: 'semi',
      code: semiProduct.code,
      name: semiProduct.name,
      quantity: semiFinishedQuantity,
      unit: semiProduct.unit
    };
    
    setNewProduct({
      ...newProduct,
      components: [...newProduct.components, newComponent]
    });
    
    setSelectedSemiFinished('');
    setSemiFinishedQuantity(0);
  };
  
  // Handle adding a packaging component
  const handleAddPackaging = () => {
    if (!selectedPackaging || packagingQuantity <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار مستلزم تعبئة وتحديد الكمية",
        variant: "destructive"
      });
      return;
    }
    
    // Check if this packaging material already exists
    const existingIndex = newProduct.components.findIndex(
      c => c.type === 'packaging' && c.code === selectedPackaging
    );
    
    if (existingIndex >= 0) {
      // Update existing component quantity
      const updatedComponents = [...newProduct.components];
      updatedComponents[existingIndex].quantity += packagingQuantity;
      
      setNewProduct({
        ...newProduct,
        components: updatedComponents
      });
    } else {
      // Add new component
      const packagingMaterial = packagingMaterials.find(item => item.code === selectedPackaging);
      if (!packagingMaterial) return;
      
      const newComponent = {
        id: packagingMaterial.id,
        type: 'packaging',
        code: packagingMaterial.code,
        name: packagingMaterial.name,
        quantity: packagingQuantity,
        unit: packagingMaterial.unit
      };
      
      setNewProduct({
        ...newProduct,
        components: [...newProduct.components, newComponent]
      });
    }
    
    setSelectedPackaging('');
    setPackagingQuantity(0);
  };
  
  // Handle removing a component
  const handleRemoveComponent = (componentIndex: number) => {
    const updatedComponents = newProduct.components.filter((_, index) => index !== componentIndex);
    setNewProduct({
      ...newProduct,
      components: updatedComponents
    });
  };
  
  // Handle adding a new product
  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.unit || newProduct.components.length === 0) {
      toast({
        title: "خطأ",
        description: "يجب ملء جميع الحقول المطلوبة وإضافة مكون واحد على الأقل",
        variant: "destructive"
      });
      return;
    }
    
    // Check if at least one semi-finished product is included
    const hasSemiFinished = newProduct.components.some(c => c.type === 'semi');
    if (!hasSemiFinished) {
      toast({
        title: "خطأ",
        description: "يجب إضافة منتج نصف مصنع واحد على الأقل",
        variant: "destructive"
      });
      return;
    }
    
    const unitCost = calculateUnitCost(newProduct.components);
    const totalValue = newProduct.quantity * unitCost;
    
    const newItem = {
      id: products.length + 1,
      code: generateCode('finished', products.length),
      name: newProduct.name,
      unit: newProduct.unit,
      components: newProduct.components,
      unitCost: Math.round(unitCost * 100) / 100,
      quantity: newProduct.quantity,
      minStock: newProduct.minStock,
      totalValue: Math.round(totalValue * 100) / 100
    };
    
    setProducts([...products, newItem]);
    setNewProduct({
      name: '',
      unit: '',
      components: [],
      quantity: 0,
      minStock: 0
    });
    setIsAddDialogOpen(false);
    
    toast({
      title: "تمت الإضافة",
      description: `تمت إضافة ${newItem.name} بنجاح`
    });
  };
  
  // Handle editing a product
  const handleEditProduct = () => {
    if (!currentProduct) return;
    
    // Validation
    if (!currentProduct.name || !currentProduct.unit || currentProduct.components.length === 0) {
      toast({
        title: "خطأ",
        description: "يجب ملء جميع الحقول المطلوبة وإضافة مكون واحد على الأقل",
        variant: "destructive"
      });
      return;
    }
    
    // Check if at least one semi-finished product is included
    const hasSemiFinished = currentProduct.components.some(c => c.type === 'semi');
    if (!hasSemiFinished) {
      toast({
        title: "خطأ",
        description: "يجب إضافة منتج نصف مصنع واحد على الأقل",
        variant: "destructive"
      });
      return;
    }
    
    const unitCost = calculateUnitCost(currentProduct.components);
    const totalValue = currentProduct.quantity * unitCost;
    
    const updatedProduct = {
      ...currentProduct,
      unitCost: Math.round(unitCost * 100) / 100,
      totalValue: Math.round(totalValue * 100) / 100
    };
    
    const updatedProducts = products.map(product => 
      product.id === currentProduct.id ? updatedProduct : product
    );
    
    setProducts(updatedProducts);
    setIsEditDialogOpen(false);
    
    toast({
      title: "تم التعديل",
      description: `تم تعديل ${currentProduct.name} بنجاح`
    });
  };
  
  // Handle deleting a product
  const handleDeleteProduct = () => {
    if (!currentProduct) return;
    
    const updatedProducts = products.filter(
      product => product.id !== currentProduct.id
    );
    
    setProducts(updatedProducts);
    setIsDeleteDialogOpen(false);
    
    toast({
      title: "تم الحذف",
      description: `تم حذف ${currentProduct.name} بنجاح`
    });
  };
  
  // Render actions column
  const renderActions = (record: any) => (
    <div className="flex space-x-2 rtl:space-x-reverse">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCurrentProduct(record);
          setIsEditDialogOpen(true);
        }}
      >
        <Edit size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCurrentProduct(record);
          setIsDeleteDialogOpen(true);
        }}
      >
        <Trash size={16} />
      </Button>
    </div>
  );
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">المنتجات النهائية</h1>
            <p className="text-muted-foreground mt-1">إدارة المنتجات النهائية الجاهزة للبيع</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                إضافة منتج
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إضافة منتج نهائي جديد</DialogTitle>
                <DialogDescription>
                  أدخل بيانات المنتج النهائي الجديد. سيتم إنشاء كود فريد للمنتج تلقائيًا.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">اسم المنتج</Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">وحدة القياس</Label>
                  <Select 
                    value={newProduct.unit} 
                    onValueChange={value => setNewProduct({...newProduct, unit: value})}
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
                  <Label htmlFor="quantity">الكمية</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newProduct.quantity}
                    onChange={e => setNewProduct({...newProduct, quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minStock">الحد الأدنى للمخزون</Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={newProduct.minStock}
                    onChange={e => setNewProduct({...newProduct, minStock: Number(e.target.value)})}
                  />
                </div>
                
                <div className="border-t pt-4">
                  <Label className="mb-2 block">المنتج النصف مصنع</Label>
                  <div className="flex gap-2 mb-4">
                    <Select 
                      value={selectedSemiFinished} 
                      onValueChange={setSelectedSemiFinished}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر منتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {semiFinishedProducts.map(product => (
                          <SelectItem key={product.code} value={product.code}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="w-24 flex">
                      <Input
                        type="number"
                        value={semiFinishedQuantity}
                        onChange={e => setSemiFinishedQuantity(Number(e.target.value))}
                        min={0.01}
                        step={0.01}
                      />
                    </div>
                    <Button type="button" onClick={handleAddSemiFinished}>
                      إضافة
                    </Button>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <Label className="mb-2 block">مستلزمات التعبئة</Label>
                  <div className="flex gap-2 mb-4">
                    <Select 
                      value={selectedPackaging} 
                      onValueChange={setSelectedPackaging}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر مستلزم" />
                      </SelectTrigger>
                      <SelectContent>
                        {packagingMaterials.map(material => (
                          <SelectItem key={material.code} value={material.code}>
                            {material.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="w-24 flex">
                      <Input
                        type="number"
                        value={packagingQuantity}
                        onChange={e => setPackagingQuantity(Number(e.target.value))}
                        min={1}
                      />
                    </div>
                    <Button type="button" onClick={handleAddPackaging}>
                      إضافة
                    </Button>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-2">
                    المكونات المضافة
                    {newProduct.components.length > 0 && (
                      <span className="text-muted-foreground mr-2">
                        (التكلفة التقديرية: {Math.round(calculateUnitCost(newProduct.components) * 100) / 100} ج.م)
                      </span>
                    )}
                  </div>
                  
                  {newProduct.components.length > 0 ? (
                    <div className="space-y-2">
                      {newProduct.components.map((component, index) => (
                        <div key={`${component.code}-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                          <div>
                            <div className="font-medium">{component.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {component.quantity} {component.unit} | 
                              <Badge 
                                variant="outline" 
                                className="ml-2"
                              >
                                {component.type === 'semi' ? 'نصف مصنع' : 'مستلزم تعبئة'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveComponent(index)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      لم تتم إضافة مكونات بعد
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddProduct}>
                  إضافة
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <DataTable
          columns={columns}
          data={products}
          searchable
          searchKeys={['code', 'name']}
          actions={renderActions}
        />
        
        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تعديل منتج نهائي</DialogTitle>
              <DialogDescription>
                تعديل بيانات المنتج النهائي.
              </DialogDescription>
            </DialogHeader>
            {currentProduct && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-code">الكود</Label>
                  <Input
                    id="edit-code"
                    value={currentProduct.code}
                    disabled
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">اسم المنتج</Label>
                  <Input
                    id="edit-name"
                    value={currentProduct.name}
                    onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-unit">وحدة القياس</Label>
                  <Select 
                    value={currentProduct.unit} 
                    onValueChange={value => setCurrentProduct({...currentProduct, unit: value})}
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
                  <Label htmlFor="edit-quantity">الكمية</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={currentProduct.quantity}
                    onChange={e => setCurrentProduct({...currentProduct, quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-minStock">الحد الأدنى للمخزون</Label>
                  <Input
                    id="edit-minStock"
                    type="number"
                    value={currentProduct.minStock}
                    onChange={e => setCurrentProduct({...currentProduct, minStock: Number(e.target.value)})}
                  />
                </div>
                
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">
                    المكونات
                    {currentProduct.components.length > 0 && (
                      <span className="text-muted-foreground mr-2">
                        (التكلفة التقديرية: {Math.round(calculateUnitCost(currentProduct.components) * 100) / 100} ج.م)
                      </span>
                    )}
                  </div>
                  
                  {currentProduct.components.length > 0 ? (
                    <div className="space-y-2">
                      {currentProduct.components.map((component: any, index: number) => (
                        <div key={`${component.code}-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                          <div>
                            <div className="font-medium">{component.name}</div>
                            <div className="text-sm text-muted-foreground">
                              <Input
                                type="number"
                                value={component.quantity}
                                onChange={e => {
                                  const updatedComponents = [...currentProduct.components];
                                  updatedComponents[index].quantity = Number(e.target.value);
                                  setCurrentProduct({
                                    ...currentProduct,
                                    components: updatedComponents
                                  });
                                }}
                                min={component.type === 'semi' ? 0.01 : 1}
                                step={component.type === 'semi' ? 0.01 : 1}
                                className="w-20 h-7 mr-2"
                              />
                              {component.unit} | 
                              <Badge 
                                variant="outline" 
                                className="ml-2"
                              >
                                {component.type === 'semi' ? 'نصف مصنع' : 'مستلزم تعبئة'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      لم تتم إضافة مكونات بعد
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleEditProduct}>
                حفظ التعديلات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف منتج نهائي</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذا المنتج النهائي؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>
            </DialogHeader>
            {currentProduct && (
              <div className="py-4">
                <p className="font-medium">{currentProduct.name}</p>
                <p className="text-sm text-muted-foreground">{currentProduct.code}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                إلغاء
              </Button>
              <Button variant="destructive" onClick={handleDeleteProduct}>
                حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default FinishedProducts;
