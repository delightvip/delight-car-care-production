import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { FileUp, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import InventoryAuditButton from '@/components/inventory/audit/InventoryAuditButton';
import InventoryAuditDialog from '@/components/inventory/audit/InventoryAuditDialog';

// This is a placeholder component until a proper implementation is created
const PackagingMaterials = () => {
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'high-value'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const queryClient = useQueryClient();
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">مواد التعبئة والتغليف</h1>
            <p className="text-muted-foreground mt-1">إدارة مواد التعبئة والتغليف المستخدمة في عمليات الإنتاج</p>
          </div>
          <div className="flex gap-2">
            <InventoryAuditButton onClick={() => setIsAuditDialogOpen(true)} />
            <Button variant="outline">
              <FileUp size={18} className="mr-2" />
              استيراد من ملف
            </Button>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="تصفية المواد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المواد</SelectItem>
                <SelectItem value="low-stock">المخزون المنخفض</SelectItem>
                <SelectItem value="high-value">الأعلى قيمة</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="w-[220px]"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button>
              <Plus size={18} className="mr-2" />
              إضافة مادة
            </Button>
          </div>
        </div>
        
        <div className="p-4 border rounded-md text-center">
          <p className="text-muted-foreground">صفحة مواد التعبئة والتغليف</p>
        </div>
        
        {/* Inventory Audit Dialog */}
        <InventoryAuditDialog
          isOpen={isAuditDialogOpen}
          onClose={() => {
            setIsAuditDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['packagingMaterials'] });
          }}
          inventoryType="packaging_materials"
          title="جرد مواد التعبئة والتغليف"
        />
      </div>
    </PageTransition>
  );
};

export default PackagingMaterials;
