
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash, Eye, PlusCircle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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

interface PackagingMaterialsListProps {
  onAddClick: () => void;
  onEditClick: (material: PackagingMaterial) => void;
  onDeleteClick: (material: PackagingMaterial) => void;
  onViewClick: (material: PackagingMaterial) => void;
  onQuantityUpdate: (id: number, change: number) => void;
}

const PackagingMaterialsList: React.FC<PackagingMaterialsListProps> = ({
  onAddClick,
  onEditClick,
  onDeleteClick,
  onViewClick,
  onQuantityUpdate
}) => {
  const navigate = useNavigate();

  const { data: packagingMaterials, isLoading } = useQuery({
    queryKey: ['packagingMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        toast.error(`حدث خطأ أثناء تحميل البيانات: ${error.message}`);
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
      render: (value: number, record: any) => (
        <div className="flex items-center">
          <div className="flex items-center gap-2 min-w-[120px]">
            <div 
              className={`w-3 h-3 rounded-full ${
                value <= record.minStock ? 'bg-red-500' : 
                value <= record.minStock * 1.5 ? 'bg-amber-500' : 
                'bg-green-500'
              }`} 
            />
            <div className="relative w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full ${
                  value <= record.minStock ? 'bg-red-500' : 
                  value <= record.minStock * 1.5 ? 'bg-amber-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, Math.round((value / (record.minStock * 2)) * 100))}%` }}
              ></div>
            </div>
            <span className={`font-medium ${
              value <= record.minStock ? 'text-red-700' : 
              value <= record.minStock * 1.5 ? 'text-amber-700' : 
              'text-green-700'
            }`}>{value} {record.unit}</span>
          </div>
        </div>
      )
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
  
  const renderActions = (record: PackagingMaterial) => (
    <div className="flex space-x-2 rtl:space-x-reverse">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewClick(record)}
      >
        <Eye size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEditClick(record)}
      >
        <Edit size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDeleteClick(record)}
      >
        <Trash size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="زيادة الكمية"
        onClick={() => onQuantityUpdate(record.id, 1)}
      >
        <PlusCircle size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="نقص الكمية"
        onClick={() => onQuantityUpdate(record.id, -1)}
      >
        <MinusCircle size={16} />
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">مستلزمات التعبئة</h1>
        <Button onClick={onAddClick}>
          <Plus size={16} className="mr-2" />
          إضافة مستلزم
        </Button>
      </div>
      
      <DataTableWithLoading
        columns={columns}
        data={packagingMaterials || []}
        isLoading={isLoading}
        loadingRowCount={5}
        searchable
        searchKeys={['code', 'name']}
        pagination={{ pageSize: 10 }}
        actions={renderActions}
      />
    </div>
  );
};

export default PackagingMaterialsList;
