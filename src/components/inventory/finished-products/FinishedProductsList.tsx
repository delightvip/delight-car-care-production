import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTableWithLoading from '@/components/ui/DataTableWithLoading';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCommonTableColumns, renderInventoryActions } from '../common/InventoryTableColumns';
import { 
  formatInventoryData, 
  ensureNumericValue, 
  calculateFinishedProductCost 
} from '../common/InventoryDataFormatter';

interface FinishedProductsListProps {
  filterType: 'all' | 'low-stock' | 'high-value';
  searchQuery: string;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onView: (item: any) => void;
}

const FinishedProductsList: React.FC<FinishedProductsListProps> = ({ 
  filterType, 
  searchQuery, 
  onEdit, 
  onDelete, 
  onView 
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const queryClient = useQueryClient();

  // Fetch finished products with related data
  const { data: finishedProducts = [], isLoading, error } = useQuery({
    queryKey: ['finishedProducts'],
    queryFn: async () => {
      // Get the finished products
      const { data: products, error: productsError } = await supabase
        .from('finished_products')
        .select(`
          *,
          semi_finished:semi_finished_id(id, name, code, unit_cost)
        `)
        .order('created_at', { ascending: false });
        
      if (productsError) throw new Error(productsError.message);

      // Get packaging materials for each product
      const productsWithPackaging = await Promise.all(products.map(async (product) => {
        const { data: packaging, error: packagingError } = await supabase
          .from('finished_product_packaging')
          .select(`
            id,
            quantity,
            packaging_material:packaging_material_id(id, name, code, unit_cost)
          `)
          .eq('finished_product_id', product.id);
          
        if (packagingError) throw new Error(packagingError.message);
        
        // Format packaging materials
        const formattedPackaging = packaging?.map((pkg) => ({
          id: pkg.packaging_material?.id,
          code: pkg.packaging_material?.code,
          name: pkg.packaging_material?.name,
          quantity: pkg.quantity,
          unit_cost: pkg.packaging_material?.unit_cost
        })) || [];
          // Calculate the unit cost based on the semi-finished product and packaging materials
        const semiFinishedQty = Number(product.semi_finished_quantity || 1);
        const calculatedUnitCost = calculateFinishedProductCost(
          product.semi_finished, 
          formattedPackaging, 
          semiFinishedQty // استخدام كمية المنتج النصف مصنع المطلوبة فعلياً
        );

        // Use the calculated cost if it's greater than 0, otherwise use the stored cost
        const unitCost = calculatedUnitCost > 0 ? calculatedUnitCost : ensureNumericValue(product.unit_cost);
        
        // Ensure numeric values
        const quantity = ensureNumericValue(product.quantity);
        const totalValue = quantity * unitCost;
        const salesPrice = ensureNumericValue(product.sales_price);
        
        return {
          ...product,
          quantity,
          unit_cost: unitCost,
          sales_price: salesPrice,
          totalValue,
          packaging: formattedPackaging
        };
      }));
      
      return productsWithPackaging;
    }
  });
  
  // Quick update quantity mutation
  const quickUpdateQuantityMutation = useMutation({
    mutationFn: async ({ id, change }: { id: number, change: number }) => {
      const { data: product, error: fetchError } = await supabase
        .from('finished_products')
        .select('quantity')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      const newQuantity = Math.max(0, ensureNumericValue(product.quantity) + change);
      
      const { data, error } = await supabase
        .from('finished_products')
        .update({ quantity: newQuantity })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      toast.success('تم تحديث الكمية بنجاح');
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    }
  });

  // Filter and sort the data
  const filteredProducts = useMemo(() => {
    let filtered = [...finishedProducts];
    
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
        filtered = [...filtered].sort((a, b) => 
          ensureNumericValue(b.totalValue) - ensureNumericValue(a.totalValue)
        );
        break;
      default:
        // No additional filtering needed for 'all'
        break;
    }
    
    return filtered;
  }, [finishedProducts, filterType, searchQuery]);
  
  // Apply sorting
  const sortedProducts = useMemo(() => {
    if (!sortConfig) return filteredProducts;
    
    return [...filteredProducts].sort((a, b) => {
      const valueA = ensureNumericValue(a[sortConfig.key]);
      const valueB = ensureNumericValue(b[sortConfig.key]);
      
      if (valueA < valueB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
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
    ...getCommonTableColumns(),
    { 
      key: 'semi_finished', 
      title: 'المنتج النصف مصنع',
      sortable: true,
      render: (value: any, record: any) => record.semi_finished?.name || '-'
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

export default FinishedProductsList;
