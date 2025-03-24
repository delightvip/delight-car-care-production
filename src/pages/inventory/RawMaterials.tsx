
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

// Mock data for raw materials
const initialRawMaterials = [
  { 
    id: 1,
    code: 'RAW-00001',
    name: 'كحول إيثيلي',
    unit: 'لتر',
    quantity: 100,
    price: 25,
    minStock: 50,
    importance: 8,
    totalValue: 2500
  },
  { 
    id: 2,
    code: 'RAW-00002',
    name: 'عطر ليمون',
    unit: 'لتر',
    quantity: 30,
    price: 150,
    minStock: 15,
    importance: 5,
    totalValue: 4500
  },
  { 
    id: 3,
    code: 'RAW-00003',
    name: 'جليسرين',
    unit: 'كجم',
    quantity: 50,
    price: 35,
    minStock: 20,
    importance: 6,
    totalValue: 1750
  },
  { 
    id: 4,
    code: 'RAW-00004',
    name: 'صبغة زرقاء',
    unit: 'كجم',
    quantity: 15,
    price: 80,
    minStock: 5,
    importance: 4,
    totalValue: 1200
  },
  { 
    id: 5,
    code: 'RAW-00005',
    name: 'زيت سيليكون',
    unit: 'لتر',
    quantity: 45,
    price: 70,
    minStock: 20,
    importance: 7,
    totalValue: 3150
  }
];

const units = ['كجم', 'لتر', 'مللى', 'جم', 'علبة', 'قطعة', 'كرتونة'];

const RawMaterials = () => {
  const [rawMaterials, setRawMaterials] = useState(initialRawMaterials);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<any>(null);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: '',
    quantity: 0,
    price: 0,
    minStock: 0
  });
  
  const { toast } = useToast();
  
  // Columns for the data table
  const columns = [
    { key: 'code', title: 'الكود' },
    { key: 'name', title: 'اسم المادة' },
    { key: 'unit', title: 'وحدة القياس' },
    { 
      key: 'quantity', 
      title: 'الكمية',
      render: (value: number, record: any) => `${value} ${record.unit}`
    },
    { 
      key: 'price', 
      title: 'السعر',
      render: (value: number) => `${value} ج.م`
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
      id: rawMaterials.length + 1,
      code: generateCode('raw', rawMaterials.length),
      name: newMaterial.name,
      unit: newMaterial.unit,
      quantity: newMaterial.quantity,
      price: newMaterial.price,
      minStock: newMaterial.minStock,
      importance: 0, // Initially set to 0, to be calculated later
      totalValue
    };
    
    setRawMaterials([...rawMaterials, newItem]);
    setNewMaterial({
      name: '',
      unit: '',
      quantity: 0,
      price: 0,
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
    
    const updatedMaterials = rawMaterials.map(material => 
      material.id === currentMaterial.id ? 
        { ...currentMaterial, totalValue } : 
        material
    );
    
    setRawMaterials(updatedMaterials);
    setIsEditDialogOpen(false);
    
    toast({
      title: "تم التعديل",
      description: `تم تعديل ${currentMaterial.name} بنجاح`
    });
  };
  
  // Handle deleting a material
  const handleDeleteMaterial = () => {
    if (!currentMaterial) return;
    
    const updatedMaterials = rawMaterials.filter(
      material => material.id !== currentMaterial.id
    );
    
    setRawMaterials(updatedMaterials);
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
            <h1 className="text-3xl font-bold tracking-tight">المواد الأولية</h1>
            <p className="text-muted-foreground mt-1">إدارة المواد الأولية المستخدمة في عمليات الإنتاج</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                إضافة مادة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة مادة أولية جديدة</DialogTitle>
                <DialogDescription>
                  أدخل بيانات المادة الأولية الجديدة. سيتم إنشاء كود فريد للمادة تلقائيًا.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">اسم المادة</Label>
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
                  <Label htmlFor="quantity">الكمية</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newMaterial.quantity}
                    onChange={e => setNewMaterial({...newMaterial, quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">السعر</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newMaterial.price}
                    onChange={e => setNewMaterial({...newMaterial, price: Number(e.target.value)})}
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
          data={rawMaterials}
          searchable
          searchKeys={['code', 'name']}
          actions={renderActions}
        />
        
        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل مادة أولية</DialogTitle>
              <DialogDescription>
                تعديل بيانات المادة الأولية.
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
                  <Label htmlFor="edit-name">اسم المادة</Label>
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
                  <Label htmlFor="edit-quantity">الكمية</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={currentMaterial.quantity}
                    onChange={e => setCurrentMaterial({...currentMaterial, quantity: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-price">السعر</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={currentMaterial.price}
                    onChange={e => setCurrentMaterial({...currentMaterial, price: Number(e.target.value)})}
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
              <DialogTitle>حذف مادة أولية</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذه المادة الأولية؟ لا يمكن التراجع عن هذا الإجراء.
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

export default RawMaterials;
