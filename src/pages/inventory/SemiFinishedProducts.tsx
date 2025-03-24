
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

// Mock data for semi-finished products
const initialSemiFinishedProducts = [
  {
    id: 1,
    code: 'SEMI-00001',
    name: 'ملمع تابلوه سائل',
    unit: 'لتر',
    ingredients: [
      { id: 1, name: 'زيت سيليكون', percentage: 30, code: 'RAW-00005' },
      { id: 5, name: 'عطر ليمون', percentage: 5, code: 'RAW-00002' },
      { id: 3, name: 'كحول إيثيلي', percentage: 15, code: 'RAW-00001' },
      { id: 2, name: 'ماء', percentage: 50, code: 'WATER' }
    ],
    quantity: 200,
    ingredientCount: 4,
    unitCost: 40,
    minStock: 50,
    totalValue: 8000
  },
  {
    id: 2,
    code: 'SEMI-00002',
    name: 'منظف زجاج سائل',
    unit: 'لتر',
    ingredients: [
      { id: 3, name: 'كحول إيثيلي', percentage: 20, code: 'RAW-00001' },
      { id: 4, name: 'صبغة زرقاء', percentage: 1, code: 'RAW-00004' },
      { id: 2, name: 'ماء', percentage: 79, code: 'WATER' }
    ],
    quantity: 350,
    ingredientCount: 3,
    unitCost: 30,
    minStock: 100,
    totalValue: 10500
  }
];

// Mock data for raw materials
const rawMaterials = [
  { id: 1, code: 'RAW-00001', name: 'كحول إيثيلي', unit: 'لتر', price: 25 },
  { id: 2, code: 'RAW-00002', name: 'عطر ليمون', unit: 'لتر', price: 150 },
  { id: 3, code: 'RAW-00003', name: 'جليسرين', unit: 'كجم', price: 35 },
  { id: 4, code: 'RAW-00004', name: 'صبغة زرقاء', unit: 'كجم', price: 80 },
  { id: 5, code: 'RAW-00005', name: 'زيت سيليكون', unit: 'لتر', price: 70 }
];

const units = ['كجم', 'لتر', 'مللى', 'جم'];

const SemiFinishedProducts = () => {
  const [products, setProducts] = useState(initialSemiFinishedProducts);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    unit: '',
    ingredients: [] as any[],
    quantity: 0,
    minStock: 0
  });
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientPercentage, setIngredientPercentage] = useState(0);
  
  const { toast } = useToast();
  
  // Columns for the data table
  const columns = [
    { key: 'code', title: 'الكود' },
    { key: 'name', title: 'اسم المنتج' },
    { key: 'unit', title: 'وحدة القياس' },
    { 
      key: 'quantity', 
      title: 'الكمية',
      render: (value: number, record: any) => `${value} ${record.unit}`
    },
    { key: 'ingredientCount', title: 'عدد المكونات' },
    { 
      key: 'unitCost', 
      title: 'تكلفة الوحدة',
      render: (value: number) => `${value} ج.م`
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
  
  // Calculate the total percentage of ingredients
  const calculateTotalPercentage = (ingredients: any[]) => {
    return ingredients.reduce((sum, item) => sum + item.percentage, 0);
  };
  
  // Calculate the unit cost based on ingredients
  const calculateUnitCost = (ingredients: any[]) => {
    return ingredients.reduce((sum, item) => {
      if (item.code === 'WATER') return sum; // Water is free
      
      const rawMaterial = rawMaterials.find(rm => rm.code === item.code);
      if (!rawMaterial) return sum;
      
      return sum + (rawMaterial.price * (item.percentage / 100));
    }, 0);
  };
  
  // Handle adding an ingredient to the new product
  const handleAddIngredient = () => {
    if (!selectedIngredient || ingredientPercentage <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار مكون وتحديد النسبة المئوية",
        variant: "destructive"
      });
      return;
    }
    
    const existingIngredient = newProduct.ingredients.find(
      i => i.code === selectedIngredient
    );
    
    if (existingIngredient) {
      toast({
        title: "خطأ",
        description: "هذا المكون موجود بالفعل في القائمة",
        variant: "destructive"
      });
      return;
    }
    
    // Get raw material details
    let ingredientDetails;
    if (selectedIngredient === 'WATER') {
      ingredientDetails = { 
        id: new Date().getTime(), 
        code: 'WATER', 
        name: 'ماء' 
      };
    } else {
      ingredientDetails = rawMaterials.find(rm => rm.code === selectedIngredient);
      if (!ingredientDetails) {
        toast({
          title: "خطأ",
          description: "المكون غير موجود",
          variant: "destructive"
        });
        return;
      }
    }
    
    const newIngredient = {
      id: ingredientDetails.id,
      code: ingredientDetails.code,
      name: ingredientDetails.name,
      percentage: ingredientPercentage
    };
    
    const updatedIngredients = [...newProduct.ingredients, newIngredient];
    const totalPercentage = calculateTotalPercentage(updatedIngredients);
    
    if (totalPercentage > 100) {
      toast({
        title: "خطأ",
        description: "إجمالي النسب المئوية يتجاوز 100%",
        variant: "destructive"
      });
      return;
    }
    
    setNewProduct({
      ...newProduct,
      ingredients: updatedIngredients
    });
    
    setSelectedIngredient('');
    setIngredientPercentage(0);
  };
  
  // Handle removing an ingredient from the new product
  const handleRemoveIngredient = (code: string) => {
    setNewProduct({
      ...newProduct,
      ingredients: newProduct.ingredients.filter(i => i.code !== code)
    });
  };
  
  // Handle adding a new product
  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.unit || newProduct.ingredients.length === 0) {
      toast({
        title: "خطأ",
        description: "يجب ملء جميع الحقول المطلوبة وإضافة مكون واحد على الأقل",
        variant: "destructive"
      });
      return;
    }
    
    const totalPercentage = calculateTotalPercentage(newProduct.ingredients);
    
    // Automatically add water to reach 100% if not already at 100%
    let updatedIngredients = [...newProduct.ingredients];
    if (totalPercentage < 100) {
      const waterPercentage = 100 - totalPercentage;
      const existingWaterIndex = updatedIngredients.findIndex(i => i.code === 'WATER');
      
      if (existingWaterIndex >= 0) {
        // Update existing water
        updatedIngredients[existingWaterIndex].percentage += waterPercentage;
      } else {
        // Add water as new ingredient
        updatedIngredients.push({
          id: new Date().getTime(),
          code: 'WATER',
          name: 'ماء',
          percentage: waterPercentage
        });
      }
    }
    
    const unitCost = calculateUnitCost(updatedIngredients);
    const totalValue = newProduct.quantity * unitCost;
    
    const newItem = {
      id: products.length + 1,
      code: generateCode('semi', products.length),
      name: newProduct.name,
      unit: newProduct.unit,
      ingredients: updatedIngredients,
      quantity: newProduct.quantity,
      ingredientCount: updatedIngredients.length,
      unitCost: Math.round(unitCost),
      minStock: newProduct.minStock,
      totalValue: Math.round(totalValue)
    };
    
    setProducts([...products, newItem]);
    setNewProduct({
      name: '',
      unit: '',
      ingredients: [],
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
    
    const totalPercentage = calculateTotalPercentage(currentProduct.ingredients);
    
    if (totalPercentage !== 100) {
      toast({
        title: "خطأ",
        description: "يجب أن يكون مجموع النسب المئوية للمكونات 100%",
        variant: "destructive"
      });
      return;
    }
    
    const unitCost = calculateUnitCost(currentProduct.ingredients);
    const totalValue = currentProduct.quantity * unitCost;
    
    const updatedProduct = {
      ...currentProduct,
      ingredientCount: currentProduct.ingredients.length,
      unitCost: Math.round(unitCost),
      totalValue: Math.round(totalValue)
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
            <h1 className="text-3xl font-bold tracking-tight">المنتجات النصف مصنعة</h1>
            <p className="text-muted-foreground mt-1">إدارة المنتجات السائلة النصف مصنعة</p>
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
                <DialogTitle>إضافة منتج نصف مصنع جديد</DialogTitle>
                <DialogDescription>
                  أدخل بيانات المنتج النصف مصنع الجديد. سيتم إنشاء كود فريد للمنتج تلقائيًا.
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
                  <Label className="mb-2 block">مكونات المنتج</Label>
                  <div className="flex gap-2 mb-4">
                    <Select 
                      value={selectedIngredient} 
                      onValueChange={setSelectedIngredient}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="اختر مكون" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WATER">ماء</SelectItem>
                        {rawMaterials.map(material => (
                          <SelectItem key={material.code} value={material.code}>
                            {material.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="w-24 flex">
                      <Input
                        type="number"
                        value={ingredientPercentage}
                        onChange={e => setIngredientPercentage(Number(e.target.value))}
                        min={1}
                        max={100}
                      />
                      <span className="ml-1 flex items-center">%</span>
                    </div>
                    <Button type="button" onClick={handleAddIngredient}>
                      إضافة
                    </Button>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-2">
                      المكونات المضافة{' '}
                      <span className="text-muted-foreground">
                        (إجمالي {calculateTotalPercentage(newProduct.ingredients)}%)
                      </span>
                      {calculateTotalPercentage(newProduct.ingredients) < 100 && (
                        <span className="text-amber-600 text-xs mr-2">
                          سيتم إضافة الماء تلقائيًا لإكمال النسبة إلى 100%
                        </span>
                      )}
                    </div>
                    
                    {newProduct.ingredients.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {newProduct.ingredients.map(ingredient => (
                          <Badge 
                            key={ingredient.code} 
                            variant="outline" 
                            className="py-1 px-2 flex items-center gap-1"
                          >
                            {ingredient.name} ({ingredient.percentage}%)
                            <button 
                              type="button" 
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveIngredient(ingredient.code)}
                            >
                              <X size={14} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        لم تتم إضافة مكونات بعد
                      </div>
                    )}
                  </div>
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
              <DialogTitle>تعديل منتج نصف مصنع</DialogTitle>
              <DialogDescription>
                تعديل بيانات المنتج النصف مصنع.
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
                  <Label className="mb-2 block">مكونات المنتج</Label>
                  <div className="text-sm font-medium mb-2">
                    المكونات المضافة{' '}
                    <span className="text-muted-foreground">
                      (إجمالي {calculateTotalPercentage(currentProduct.ingredients)}%)
                    </span>
                  </div>
                  
                  {currentProduct.ingredients.length > 0 ? (
                    <div className="space-y-2">
                      {currentProduct.ingredients.map((ingredient, index) => (
                        <div key={ingredient.code} className="flex items-center gap-2">
                          <div className="flex-1">{ingredient.name}</div>
                          <div className="w-24 flex">
                            <Input
                              type="number"
                              value={ingredient.percentage}
                              onChange={e => {
                                const updatedIngredients = [...currentProduct.ingredients];
                                updatedIngredients[index].percentage = Number(e.target.value);
                                setCurrentProduct({
                                  ...currentProduct,
                                  ingredients: updatedIngredients
                                });
                              }}
                              min={1}
                              max={100}
                            />
                            <span className="ml-1 flex items-center">%</span>
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
              <DialogTitle>حذف منتج نصف مصنع</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذا المنتج النصف مصنع؟ لا يمكن التراجع عن هذا الإجراء.
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

export default SemiFinishedProducts;
