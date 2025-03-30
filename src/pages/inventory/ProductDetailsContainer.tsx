import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertTriangle, Edit, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProductDetailsView from '@/components/inventory/ProductDetailsView';
import { InventoryMovement } from '@/types/inventoryTypes';

const ProductDetailsContainer = () => {
  const { id, type } = useParams<{ id: string; type: string }>();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const numericId = id ? parseInt(id, 10) : 0;
  
  const productTitle: Record<string, string> = {
    'raw-materials': 'المواد الخام',
    'packaging': 'مواد التغليف',
    'semi-finished': 'المنتجات النصف مصنعة',
    'finished-products': 'المنتجات النهائية'
  };
  
  const tableMapping: Record<string, string> = {
    'raw-materials': 'raw_materials',
    'packaging': 'packaging_materials',
    'semi-finished': 'semi_finished_products',
    'finished-products': 'finished_products'
  };
  
  const tableName = tableMapping[type as keyof typeof tableMapping] || 'raw_materials';
  
  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ['product', tableName, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .eq('id', numericId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });
  
  const { data: movements } = useQuery<InventoryMovement[]>({
    queryKey: ['product-movements', tableName, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*, users(name)')
        .eq('item_id', id)
        .eq('item_type', tableName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as InventoryMovement[];
    },
    enabled: !!id && !!tableName
  });
  
  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', tableName, id],
    queryFn: async () => {
      if (tableName === 'raw_materials') {
        const { data: semiFinished, error: semiError } = await supabase
          .from('semi_finished_ingredients')
          .select('semi_finished_id, percentage, semi_finished_products(name)')
          .eq('raw_material_id', numericId);
        
        if (semiError) throw semiError;
        
        const typedSemiFinished = semiFinished as unknown as Array<{
          semi_finished_id: number;
          percentage: number;
          semi_finished_products: { name: string };
        }>;
        
        return typedSemiFinished.map(item => ({
          id: item.semi_finished_id,
          name: item.semi_finished_products?.name || 'منتج غير معروف',
          type: 'semi_finished_products',
          percentage: item.percentage
        }));
      } 
      else if (tableName === 'packaging_materials') {
        const { data: finished, error: finishedError } = await supabase
          .from('finished_product_packaging')
          .select('finished_product_id, quantity, finished_products(name)')
          .eq('packaging_material_id', numericId);
        
        if (finishedError) throw finishedError;
        
        const typedFinished = finished as unknown as Array<{
          finished_product_id: number;
          quantity: number;
          finished_products: { name: string };
        }>;
        
        return typedFinished.map(item => ({
          id: item.finished_product_id,
          name: item.finished_products?.name || 'منتج غير معروف',
          type: 'finished_products',
          quantity: item.quantity
        }));
      }
      else if (tableName === 'semi_finished_products') {
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('semi_finished_ingredients')
          .select('raw_material_id, percentage, raw_materials(name)')
          .eq('semi_finished_id', numericId);
        
        if (ingredientsError) throw ingredientsError;
        
        const typedIngredients = ingredients as unknown as Array<{
          raw_material_id: number;
          percentage: number;
          raw_materials: { name: string };
        }>;
        
        return typedIngredients.map(item => ({
          id: item.raw_material_id,
          name: item.raw_materials?.name || 'مادة غير معروفة',
          type: 'raw_materials',
          percentage: item.percentage
        }));
      }
      else if (tableName === 'finished_products') {
        const { data: semi, error: semiError } = await supabase
          .from('finished_products')
          .select('semi_finished_id, semi_finished_quantity, semi_finished_products(name)')
          .eq('id', numericId)
          .single();
        
        if (semiError) throw semiError;
        
        const { data: packaging, error: packagingError } = await supabase
          .from('finished_product_packaging')
          .select('packaging_material_id, quantity, packaging_materials(name)')
          .eq('finished_product_id', numericId);
        
        if (packagingError) throw packagingError;
        
        const typedSemi = semi as unknown as {
          semi_finished_id: number;
          semi_finished_quantity: number;
          semi_finished_products: { name: string };
        };
        
        const typedPackaging = packaging as unknown as Array<{
          packaging_material_id: number;
          quantity: number;
          packaging_materials: { name: string };
        }>;
        
        const result = [];
        
        if (typedSemi && typedSemi.semi_finished_id) {
          result.push({
            id: typedSemi.semi_finished_id,
            name: typedSemi.semi_finished_products?.name || 'منتج نصف مصنع غير معروف',
            type: 'semi_finished_products',
            quantity: typedSemi.semi_finished_quantity
          });
        }
        
        if (typedPackaging && typedPackaging.length > 0) {
          typedPackaging.forEach(item => {
            result.push({
              id: item.packaging_material_id,
              name: item.packaging_materials?.name || 'مادة تغليف غير معروفة',
              type: 'packaging_materials',
              quantity: item.quantity
            });
          });
        }
        
        return result;
      }
      
      return [];
    },
    enabled: !!id && !!tableName
  });
  
  const { data: usageStats } = useQuery({
    queryKey: ['product-usage', tableName, id],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('created_at, quantity, movement_type')
        .eq('item_id', id)
        .eq('item_type', tableName)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const monthMap = new Map();
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      
      data.forEach(movement => {
        const date = new Date(movement.created_at);
        const monthName = months[date.getMonth()];
        
        if (!monthMap.has(monthName)) {
          monthMap.set(monthName, { month: monthName, amount: 0 });
        }
        
        const entry = monthMap.get(monthName);
        
        if (movement.movement_type === 'out') {
          entry.amount += Math.abs(Number(movement.quantity));
        }
      });
      
      return Array.from(monthMap.values());
    },
    enabled: !!id && !!tableName
  });
  
  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq('id', numericId);
        
      if (error) throw error;
      
      toast.success('تم حذف العنصر بنجاح');
      navigate(`/inventory/${type}`);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('حدث خطأ أثناء محاولة حذف العنصر');
    } finally {
      setShowDeleteDialog(false);
    }
  };
  
  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="animate-spin h-12 w-12 text-primary" />
        </div>
      </PageTransition>
    );
  }
  
  if (error || !product) {
    return (
      <PageTransition>
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium">حدث خطأ أثناء تحميل البيانات</h3>
          <p className="text-muted-foreground mt-2 mb-4">لم نتمكن من العثور على المنتج المطلوب</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            العودة
          </Button>
        </div>
      </PageTransition>
    );
  }
  
  interface ProductType {
    id: number;
    name: string;
    code: string;
    quantity: number;
    min_stock: number;
    unit_cost?: number;
    cost_price?: number;
    unit: string;
  }
  
  const hasRequiredProperties = (obj: any): obj is ProductType => {
    return obj && 
      typeof obj.id === 'number' && 
      typeof obj.name === 'string' && 
      typeof obj.code === 'string' && 
      'quantity' in obj && 
      'min_stock' in obj && 
      typeof obj.unit === 'string';
  };
  
  if (!hasRequiredProperties(product)) {
    return (
      <PageTransition>
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium">حدث خطأ في بيانات المنتج</h3>
          <p className="text-muted-foreground mt-2 mb-4">بيانات المنتج غير صالحة</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            العودة
          </Button>
        </div>
      </PageTransition>
    );
  }
  
  const typedProduct = product as ProductType;
  
  const isLowStock = typedProduct.quantity && typedProduct.min_stock ? 
    typedProduct.quantity <= typedProduct.min_stock : false;
  
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Breadcrumb>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/inventory/${type}`}>
                  {productTitle[type as keyof typeof productTitle]}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink>
                  {typedProduct.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            <h1 className="text-3xl font-bold mt-2">{typedProduct.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isLowStock ? "destructive" : "outline"}>
                {isLowStock ? 'مخزون منخفض' : 'المخزون متاح'}
              </Badge>
              <Badge variant="outline" className="bg-primary/10">
                الكود: {typedProduct.code}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>
            <Button variant="outline" className="gap-2">
              <Link to={`/inventory/${type}/edit/${id}`} className="flex items-center gap-1">
                <Edit className="h-4 w-4" />
                تعديل
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              حذف
            </Button>
          </div>
        </div>
        
        <ProductDetailsView 
          product={typedProduct}
          productType={type || ''}
          tableName={tableName}
          movements={movements}
          usageStats={usageStats}
          relatedProducts={relatedProducts}
        />
        
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد الحذف</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من رغبتك في حذف هذا العنصر؟ هذا الإجراء لا يمكن التراجع عنه.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>إلغاء</Button>
              <Button variant="destructive" onClick={handleDelete}>حذف</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default ProductDetailsContainer;
