
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCommonTableColumns, getImportanceColumn, renderInventoryActions } from '../common/InventoryTableColumns';
import { formatInventoryData, ensureNumericValue } from '../common/InventoryDataFormatter';

interface RawMaterialsListProps {
  filterType: 'all' | 'low-stock' | 'high-value';
  searchQuery: string;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onView: (item: any) => void;
}

const RawMaterialsList: React.FC<RawMaterialsListProps> = ({ 
  filterType, 
  searchQuery, 
  onEdit, 
  onDelete, 
  onView 
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const queryClient = useQueryClient();

  // Fetch raw materials data
  const { data: rawMaterials = [], isLoading, error } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Ensure all numeric values are properly formatted
      return data.map(item => ({
        ...item,
        quantity: ensureNumericValue(item.quantity),
        unit_cost: ensureNumericValue(item.unit_cost),
        min_stock: ensureNumericValue(item.min_stock),
        importance: ensureNumericValue(item.importance),
        sales_price: ensureNumericValue(item.sales_price),
        totalValue: ensureNumericValue(item.quantity) * ensureNumericValue(item.unit_cost)
      }));
    }
  });
  
  // Quick update quantity mutation
  const quickUpdateQuantityMutation = useMutation({
    mutationFn: async ({ id, change }: { id: number, change: number }) => {
      const { data: material, error: fetchError } = await supabase
        .from('raw_materials')
        .select('quantity')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      const newQuantity = Math.max(0, Number(material.quantity) + change);
      
      const { data, error } = await supabase
        .from('raw_materials')
        .update({ quantity: newQuantity })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      toast.success('تم تحديث الكمية بنجاح');
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });

  // Filter and sort the data
  const filteredMaterials = useMemo(() => {
    let filtered = [...rawMaterials];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply type filter
    switch (filterType) {
      case 'low-stock':
        filtered = filtered.filter(item => ensureNumericValue(item.quantity) <= ensureNumericValue(item.min_stock) * 1.2);
        break;
      case 'high-value':
        filtered = [...filtered].sort((a, b) => ensureNumericValue(b.totalValue) - ensureNumericValue(a.totalValue));
        break;
      default:
        // No additional filtering needed for 'all'
        break;
    }
    
    return filtered;
  }, [rawMaterials, filterType, searchQuery]);
  
  // Apply sorting
  const sortedMaterials = useMemo(() => {
    if (!sortConfig) return filteredMaterials;
    
    return [...filteredMaterials].sort((a, b) => {
      const aValue = ensureNumericValue(a[sortConfig.key]);
      const bValue = ensureNumericValue(b[sortConfig.key]);
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredMaterials, sortConfig]);
  
  // Handle row actions
  const handleIncrement = (record: any) => {
    quickUpdateQuantityMutation.mutate({ id: record.id, change: 1 });
  };
  
  const handleDecrement = (record: any) => {
    quickUpdateQuantityMutation.mutate({ id: record.id, change: -1 });
  };
  
  // Define table columns
  const columns = [
    ...getCommonTableColumns(),
    getImportanceColumn()
  ];

  // Render row actions
  const renderActions = (record: any) => renderInventoryActions(
    record, 
    onEdit, 
    onDelete, 
    onView, 
    handleIncrement, 
    handleDecrement
  );

  if (error) {
    return <div className="p-4 text-red-500">خطأ في تحميل البيانات: {(error as Error).message}</div>;
  }

  return (
    <DataTableWithLoading
      columns={columns}
      data={sortedMaterials}
      isLoading={isLoading}
      actions={renderActions}
      onSort={(key) => {
        if (sortConfig && sortConfig.key === key) {
          if (sortConfig.direction === 'asc') {
            setSortConfig({ key, direction: 'desc' });
          } else {
            setSortConfig(null);
          }
        } else {
          setSortConfig({ key, direction: 'asc' });
        }
      }}
      sortConfig={sortConfig}
    />
  );
};

export default RawMaterialsList;
