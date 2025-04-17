import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCommonTableColumns, renderInventoryActions } from '../common/InventoryTableColumns';
import { formatInventoryData } from '../common/InventoryDataFormatter';

interface SemiFinishedListProps {
  filterType: 'all' | 'low-stock' | 'high-value';
  searchQuery: string;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onView: (item: any) => void;
}

const SemiFinishedList: React.FC<SemiFinishedListProps> = ({ 
  filterType, 
  searchQuery, 
  onEdit, 
  onDelete, 
  onView 
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const queryClient = useQueryClient();

  // Fetch semi-finished products data with ingredients
  const { data: semiFinishedProducts = [], isLoading, error } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: async () => {
      // 1. Get the semi-finished products
      const { data: products, error: productsError } = await supabase
        .from('semi_finished_products')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (productsError) throw new Error(productsError.message);

      // 2. Get ingredients for each product
      const productsWithIngredients = await Promise.all(products.map(async (product) => {
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('semi_finished_ingredients')
          .select(`
            id,
            percentage,
            raw_materials:raw_material_id(id, code, name)
          `)
          .eq('semi_finished_id', product.id);
          
        if (ingredientsError) throw new Error(ingredientsError.message);
        
        // Format ingredients
        const formattedIngredients = ingredients?.map((ingredient) => ({
          id: ingredient.raw_materials?.id,
          code: ingredient.raw_materials?.code,
          name: ingredient.raw_materials?.name,
          percentage: ingredient.percentage
        })) || [];
        
        // Ensure numeric values
        const quantity = Number(product.quantity);
        const unitCost = Number(product.unit_cost);
        const totalValue = quantity * unitCost;
        
        return {
          ...product,
          quantity,
          unit_cost: unitCost,
          totalValue,
          ingredients: formattedIngredients
        };
      }));
      
      return productsWithIngredients;
    }
  });
  
  // Quick update quantity mutation
  const quickUpdateQuantityMutation = useMutation({
    mutationFn: async ({ id, change }: { id: number, change: number }) => {
      const { data: product, error: fetchError } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      const newQuantity = Math.max(0, Number(product.quantity) + change);
      
      const { data, error } = await supabase
        .from('semi_finished_products')
        .update({ quantity: newQuantity })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semiFinishedProducts'] });
      toast.success('تم تحديث الكمية بنجاح');
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });

  // Filter and sort the data
  const filteredProducts = useMemo(() => {
    let filtered = [...semiFinishedProducts];
    
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
        filtered = filtered.filter(item => item.quantity <= item.min_stock * 1.2);
        break;
      case 'high-value':
        filtered = [...filtered].sort((a, b) => b.totalValue - a.totalValue);
        break;
      default:
        // No additional filtering needed for 'all'
        break;
    }
    
    return filtered;
  }, [semiFinishedProducts, filterType, searchQuery]);
  
  // Apply sorting
  const sortedProducts = useMemo(() => {
    if (!sortConfig) return filteredProducts;
    
    return [...filteredProducts].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredProducts, sortConfig]);
  
  // Handle row actions
  const handleIncrement = (record: any) => {
    quickUpdateQuantityMutation.mutate({ id: record.id, change: 1 });
  };
  
  const handleDecrement = (record: any) => {
    quickUpdateQuantityMutation.mutate({ id: record.id, change: -1 });
  };
  
  // Define table columns
  const columns = [
    ...getCommonTableColumns().map((col) => {
      // معالجة مشكلة التداخل: تقليل minWidth لبعض الأعمدة وتوحيد maxWidth
      if (col.key === 'name') {
        return {
          ...col,
          minWidth: '110px',
          maxWidth: '140px',
          className: (col.className || '') + ' text-center',
          headerClassName: (col.headerClassName || '') + ' text-center',
        };
      }
      if (col.key === 'totalValue') {
        return {
          ...col,
          minWidth: '90px',
          maxWidth: '110px',
        };
      }
      return col;
    }),
    {
      key: 'ingredients',
      title: 'عدد المكونات',
      render: (value: any[] | undefined) => (
        <span className="block w-full text-center font-bold text-xs leading-tight">
          {(value && Array.isArray(value)) ? value.length : 0}
        </span>
      ),
      sortable: true,
      className: 'px-1 text-xs text-center py-1.5 md:py-2 align-middle',
      headerClassName: 'px-1 text-xs font-bold bg-gray-50 dark:bg-neutral-900 text-center py-1.5 md:py-2 align-middle',
      minWidth: '70px',
      maxWidth: '90px',
    }
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
      data={sortedProducts}
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
      className="raw-materials-table"
    />
  );
};

export default SemiFinishedList;
