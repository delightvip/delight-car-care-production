
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProductDetailsView from '@/components/inventory/ProductDetailsView';
import { InventoryMovement } from '@/types/inventoryTypes';
import PageTransition from '@/components/ui/PageTransition';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingIndicator from '@/components/ui/LoadingIndicator';

interface ProductDetailsContainerProps {
  id?: string;
}

const ProductDetailsContainer: React.FC<ProductDetailsContainerProps> = ({ id }) => {
  const [productType, setProductType] = React.useState<string>('');
  const [tableName, setTableName] = React.useState<string>('');
  
  // Auto-detect the product type from the URL if not provided
  React.useEffect(() => {
    if (!id) return;
    
    const detectProductType = async () => {
      // Try each product table to find the item
      const tables = [
        { name: 'raw_materials', type: 'raw' },
        { name: 'packaging_materials', type: 'packaging' },
        { name: 'semi_finished_products', type: 'semi-finished' },
        { name: 'finished_products', type: 'finished' }
      ];
      
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table.name)
          .select('id')
          .eq('id', id)
          .single();
        
        if (data && !error) {
          setProductType(table.type);
          setTableName(table.name);
          break;
        }
      }
    };
    
    detectProductType();
  }, [id]);
  
  // Fetch product details
  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product', productType, id],
    queryFn: async () => {
      if (!tableName || !id) return null;
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tableName && !!id,
  });
  
  // Fetch inventory movements
  const { data: movements, isLoading: isLoadingMovements } = useQuery({
    queryKey: ['movements', productType, id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          users (
            name
          )
        `)
        .eq('item_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as InventoryMovement[];
    },
    enabled: !!id,
  });
  
  // Fetch usage in semi-finished products
  const { data: usageStats, isLoading: isLoadingUsage } = useQuery({
    queryKey: ['usage', productType, id],
    queryFn: async () => {
      if (!id || !['raw', 'packaging', 'semi-finished'].includes(productType)) {
        return [];
      }
      
      if (productType === 'raw') {
        // Find usage in semi-finished products
        const { data, error } = await supabase
          .from('semi_finished_ingredients')
          .select(`
            ingredient_quantity,
            semi_finished_products (
              id,
              name,
              code,
              unit
            )
          `)
          .eq('ingredient_id', id);
        
        if (error) throw error;
        return data.map(item => ({
          id: item.semi_finished_products.id,
          name: item.semi_finished_products.name,
          code: item.semi_finished_products.code,
          quantity: item.ingredient_quantity,
          unit: item.semi_finished_products.unit,
          type: 'semi_finished_products'
        }));
      } else if (productType === 'semi-finished') {
        // Find usage in finished products
        const { data, error } = await supabase
          .from('finished_product_ingredients')
          .select(`
            ingredient_quantity,
            finished_products (
              id,
              name,
              code,
              unit
            )
          `)
          .eq('ingredient_id', id)
          .eq('ingredient_type', 'semi_finished');
        
        if (error) throw error;
        return data.map(item => ({
          id: item.finished_products.id,
          name: item.finished_products.name,
          code: item.finished_products.code,
          quantity: item.ingredient_quantity,
          unit: item.finished_products.unit,
          type: 'finished_products'
        }));
      } else if (productType === 'packaging') {
        // Find usage in finished products
        const { data, error } = await supabase
          .from('finished_product_packaging')
          .select(`
            quantity,
            finished_products (
              id,
              name,
              code,
              unit
            )
          `)
          .eq('packaging_id', id);
        
        if (error) throw error;
        return data.map(item => ({
          id: item.finished_products.id,
          name: item.finished_products.name,
          code: item.finished_products.code,
          quantity: item.quantity,
          unit: item.finished_products.unit,
          type: 'finished_products'
        }));
      }
      
      return [];
    },
    enabled: !!id && ['raw', 'packaging', 'semi-finished'].includes(productType),
  });
  
  // Fetch related products
  const { data: relatedProducts, isLoading: isLoadingRelated } = useQuery({
    queryKey: ['related', productType, id],
    queryFn: async () => {
      if (!id || productType !== 'finished') {
        return [];
      }
      
      // For finished products, get ingredient products
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('finished_product_ingredients')
        .select(`
          ingredient_id,
          ingredient_type,
          ingredient_quantity,
          raw_materials!inner (
            id,
            name,
            code,
            unit
          )
        `)
        .eq('finished_product_id', id)
        .eq('ingredient_type', 'raw');
      
      const { data: semiFinished, error: semiFinishedError } = await supabase
        .from('finished_product_ingredients')
        .select(`
          ingredient_id,
          ingredient_type,
          ingredient_quantity,
          semi_finished_products!inner (
            id,
            name,
            code,
            unit
          )
        `)
        .eq('finished_product_id', id)
        .eq('ingredient_type', 'semi_finished');
      
      const { data: packaging, error: packagingError } = await supabase
        .from('finished_product_packaging')
        .select(`
          packaging_id,
          quantity,
          packaging_materials!inner (
            id,
            name,
            code,
            unit
          )
        `)
        .eq('finished_product_id', id);
      
      if (ingredientsError || semiFinishedError || packagingError) {
        throw new Error('Error fetching related products');
      }
      
      const rawMaterials = ingredients?.map(item => ({
        id: item.raw_materials.id,
        name: item.raw_materials.name,
        code: item.raw_materials.code,
        quantity: item.ingredient_quantity,
        unit: item.raw_materials.unit,
        type: 'raw_materials'
      })) || [];
      
      const semiFinishedProducts = semiFinished?.map(item => ({
        id: item.semi_finished_products.id,
        name: item.semi_finished_products.name,
        code: item.semi_finished_products.code,
        quantity: item.ingredient_quantity,
        unit: item.semi_finished_products.unit,
        type: 'semi_finished_products'
      })) || [];
      
      const packagingMaterials = packaging?.map(item => ({
        id: item.packaging_materials.id,
        name: item.packaging_materials.name,
        code: item.packaging_materials.code,
        quantity: item.quantity,
        unit: item.packaging_materials.unit,
        type: 'packaging_materials'
      })) || [];
      
      return [...rawMaterials, ...semiFinishedProducts, ...packagingMaterials];
    },
    enabled: !!id && productType === 'finished',
  });
  
  const isLoading = isLoadingProduct || isLoadingMovements || isLoadingUsage || isLoadingRelated || !productType;
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-9 w-32" />
          </div>
          
          <Card className="p-6">
            <div className="flex justify-center py-8">
              <LoadingIndicator size="large" text="جاري تحميل معلومات المنتج..." />
            </div>
          </Card>
        </div>
      </PageTransition>
    );
  }
  
  if (!product) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">منتج غير موجود</h1>
          </div>
          
          <Card className="p-6">
            <div className="flex justify-center py-8">
              <p className="text-muted-foreground">
                لم يتم العثور على المنتج المطلوب. قد يكون تم حذفه أو أن الرابط غير صحيح.
              </p>
            </div>
          </Card>
        </div>
      </PageTransition>
    );
  }
  
  return (
    <ProductDetailsView
      product={product}
      productType={productType}
      tableName={tableName}
      movements={movements || []}
      usageStats={usageStats || []}
      relatedProducts={relatedProducts || []}
    />
  );
};

export default ProductDetailsContainer;
