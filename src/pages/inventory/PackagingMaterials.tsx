
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
import { Edit, Plus, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateCode } from '@/utils/generateCode';

// Mock data for packaging materials
const initialPackagingMaterials = [
  { 
    id: 1,
    code: 'PKG-00001',
    name: 'عبوة بلاستيكية 250مل',
    unit: 'قطعة',
    price: 5,
    quantity: 500,
    minStock: 200,
    importance: 3,
    totalValue: 2500
  },
  { 
    id: 2,
    code: 'PKG-00002',
    name: 'عبوة بلاستيكية 500مل',
    unit: 'قطعة',
    price: 8,
    quantity: 400,
    minStock: 150,
    importance: 4,
    totalValue: 3200
  },
  { 
    id: 3,
    code: 'PKG-00003',
    name: 'ملصق منتج ملمع تابلوه',
    unit: 'قطعة',
    price: 1.5,
    quantity: 1000,
    minStock: 300,
    importance: 2,
    totalValue: 1500
  },
  { 
    id: 4,
    code: 'PKG-00004',
    name: 'ملصق منتج منظف زجاج',
    unit: 'قطعة',
    price: 1.5,
    quantity: 1000,
    minStock: 300,
    importance: 2,
    totalValue: 1500
  },
  { 
    id: 5,
    code: 'PKG-00005',
    name: 'كرتونة تعبئة (24 قطعة)',
    unit: 'قطعة',
    price: 10,
    quantity: 200,
    minStock: 50,
    importance: 5,
    totalValue: 2000
  }
];

const units = ['قطعة', 'علبة', 'كرتونة', 'رول', 'متر'];

const PackagingMaterials = () => {
  const [packagingMaterials, setPackagingMaterials] = useState(initialPackagingMaterials);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<any>(null);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: '',
    price: 0,
    quantity: 0,
    minStock: 0
  });
  
  const { toast } = useToast();
  
  // Columns for the data table
  const columns = [
    { key: 'code', title: 'الكود' },
    { key: 'name', title: 'اسم المنتج' },
    { key: 'unit', title: 'وحدة القياس' },
    { 
      key: 'price', 
      title: 'سعر الوحدة',
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
    { key: 'importance', title: 'الأهمية' },
    { 
      key: 'totalValue', 
      title: 'إجمالي القيمة',
      render: (value: number) => `${value} ج.م`
    }
  ];
  
  // Handle adding a new material
  const handleAddMaterial = () => {
    if (!newMaterial.name || !newMaterial.unit) {
      toast({
        title: "خطأ",
        description: "يجب ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }
    
    const totalValue = newMaterial.quantity * newMaterial.price;
    
    const newItem = {
      id: packagingMaterials.length + 1,
      code: generateCode('packaging', packagingMaterials.length),
      name: newMaterial.name,
      unit: newMaterial.unit,
      price: newMaterial.price,
      quantity: newMaterial.quantity,
      minStock: newMaterial.minStock,
      importance: 0, // Initially set to 0, to be calculated later
      totalValue
    };
    
    setPackagingMaterials([...packagingMaterials, newItem]);
    setNewMaterial({
      name: '',
      unit: '',
      price: 0,
      quantity: 0,
      minStock: 0
    });
    setIsAddDialogOpen(false);
    
    toast({
      title: "تمت الإضافة",
      description: `تمت إضافة ${newItem.name} بنجاح`
    });
  };
  
  // Handle editing a material
  const handleEditMaterial = () => {
    if (!currentMaterial) return;
    
    const totalValue = currentMaterial.quantity * currentMaterial.price;
    
    const updatedMaterials = packagingMaterials.map(material => 
      material.id === currentMaterial.id ? 
        { ...currentMaterial, totalValue } : 
        material
    );
    
    setPackagingMaterials(updatedMaterials);
    setIsEditDialogOpen(false);
    
    toast({
      title: "تم التعديل",
      description: `تم تعديل ${currentMaterial.name} بنجاح`
    });
  };
  
  // Handle deleting a material
  const handleDeleteMaterial = () => {
    if (!currentMaterial) return;
    
    const updatedMaterials = packagingMaterials.filter(
      material => material.id !== currentMaterial.id
    );
    
    setPackagingMaterials(updatedMaterials);
    setIsDeleteDialogOpen(false);
    
    toast({
      title: "تم الحذف",
      description: `تم حذف ${currentMaterial.name} بنجاح`
    });
  };
  
  // Render actions column
  const renderActions = (record: any) => (
    <div className="flex space-x-2 rtl:space-x-reverse">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCurrentMaterial(record);
          setIsEditDialogOpen(true);
        }}
      >
        <Edit size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCurrentMaterial(record);
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
            <h1 className="text-3xl font-bold tracking-tight">مستلزمات التعبئة</h1>
            <p className="text-muted-foreground mt-1">إدارة مستلزمات التعبئة والتغليف</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                إضافة مستلزم
              </Button>
            </DialogTrigger>
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
                <Button onClick={handleAddMaterial}>
                  إضافة
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <DataTable
          columns={columns}
          data={packagingMaterials}
          searchable
          searchKeys={['code', 'name']}
          actions={renderActions}
        />
        
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
              <Button onClick={handleEditMaterial}>
                حفظ التعديلات
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
      </div>
    </PageTransition>
  );
};

export default PackagingMaterials;
