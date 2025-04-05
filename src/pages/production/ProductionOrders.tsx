
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageTransition from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ProductionService from '@/services/ProductionService';
import InventoryService from '@/services/InventoryService';
import { ProductionOrder } from '@/services/production/ProductionTypes';
import { SemiFinishedProduct } from '@/services/InventoryService';

// Components
import ProductionStatsCards from '@/components/production/stats/ProductionStatsCards';
import ProductionChart from '@/components/production/stats/ProductionChart';
import OrdersTable from '@/components/production/orders/OrdersTable';
import AddOrderForm from '@/components/production/orders/AddOrderForm';
import OrderDetailsView from '@/components/production/orders/OrderDetailsView';
import UpdateStatusForm from '@/components/production/orders/UpdateStatusForm';
import EditOrderForm from '@/components/production/orders/EditOrderForm';
import DeleteOrderConfirm from '@/components/production/orders/DeleteOrderConfirm';

const ProductionOrders = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<ProductionOrder | null>(null);
  
  const productionService = ProductionService.getInstance();
  const inventoryService = InventoryService.getInstance();
  
  // Fetch production orders
  const { 
    data: orders = [], 
    isLoading: isOrdersLoading,
    refetch: refetchOrders
  } = useQuery({
    queryKey: ['productionOrders'],
    queryFn: async () => productionService.getProductionOrders(),
  });
  
  // Fetch semi-finished products
  const { 
    data: semiFinishedProducts = [], 
    isLoading: isProductsLoading,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['semiFinishedProducts'],
    queryFn: async () => inventoryService.getSemiFinishedProducts(),
  });
  
  // Fetch production stats
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['productionStats'],
    queryFn: async () => productionService.getProductionStats(),
  });
  
  // Fetch production chart data
  const {
    data: chartData = [],
    isLoading: isChartLoading,
    refetch: refetchChartData
  } = useQuery({
    queryKey: ['productionChartData'],
    queryFn: async () => productionService.getProductionChartData(),
  });
  
  const isLoading = isOrdersLoading || isProductsLoading;
  
  const refreshData = async () => {
    toast.info("جاري تحديث البيانات...");
    await Promise.all([
      refetchOrders(),
      refetchProducts(),
      refetchStats(),
      refetchChartData()
    ]);
    toast.success("تم تحديث البيانات بنجاح");
  };
  
  const calculateIngredientsForProduct = (productCode: string, quantity: number) => {
    const product = semiFinishedProducts.find(p => p.code === productCode);
    if (!product) return [];
    
    return product.ingredients.map(ingredient => {
      const requiredQuantity = (ingredient.percentage / 100) * quantity;
      
      return {
        ...ingredient,
        requiredQuantity,
        available: true
      };
    });
  };
  
  const calculateTotalCost = (productCode: string, quantity: number) => {
    const product = semiFinishedProducts.find(p => p.code === productCode);
    if (!product) return 0;
    
    return product.unit_cost * quantity;
  };

  // Handle add order
  const handleAddOrder = async (productCode: string, quantity: number) => {
    try {
      await productionService.createProductionOrder(productCode, quantity);
      setIsAddDialogOpen(false);
      refetchOrders();
      refetchStats();
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("حدث خطأ أثناء إنشاء أمر الإنتاج");
    }
  };
  
  // Handle update status
  const handleUpdateStatus = async (newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled') => {
    if (!currentOrder) return;
    
    try {
      const success = await productionService.updateProductionOrderStatus(
        currentOrder.id, 
        newStatus
      );
      if (success) {
        setIsStatusDialogOpen(false);
        refetchOrders();
        refetchStats();
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("حدث خطأ أثناء تحديث حالة أمر الإنتاج");
    }
  };
  
  // Handle delete order
  const handleDeleteOrder = async () => {
    if (!currentOrder) return;
    
    try {
      const success = await productionService.deleteProductionOrder(currentOrder.id);
      if (success) {
        setIsDeleteDialogOpen(false);
        refetchOrders();
        refetchStats();
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("حدث خطأ أثناء حذف أمر الإنتاج");
    }
  };
  
  // Handle edit order
  const handleEditOrder = async (
    id: number, 
    productCode: string, 
    quantity: number, 
    unit: string
  ) => {
    try {
      const ingredients = calculateIngredientsForProduct(productCode, quantity);
      
      const success = await productionService.updateProductionOrder(
        id,
        {
          productCode,
          productName: semiFinishedProducts.find(p => p.code === productCode)?.name || '',
          quantity,
          unit,
          ingredients: ingredients.map(ing => ({
            code: ing.code,
            name: ing.name,
            requiredQuantity: ing.requiredQuantity
          }))
        }
      );
      
      if (success) {
        setIsEditDialogOpen(false);
        refetchOrders();
        toast.success("تم تحديث أمر الإنتاج بنجاح");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("حدث خطأ أثناء تحديث أمر الإنتاج");
    }
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">أوامر الإنتاج</h1>
            <p className="text-muted-foreground mt-1">إدارة عمليات إنتاج المنتجات النصف مصنعة</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshData} className="hover:bg-primary/10">
              <RefreshCw size={16} className="ml-2" />
              تحديث
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus size={18} className="mr-2" />
              أمر إنتاج جديد
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <ProductionStatsCards stats={stats || {}} isLoading={isStatsLoading} />
        
        {/* Chart */}
        <ProductionChart data={chartData} isLoading={isChartLoading} />
        
        {/* Orders Table */}
        <OrdersTable
          data={orders}
          isLoading={isLoading}
          onView={(order) => {
            setCurrentOrder(order as ProductionOrder);
            setIsViewDialogOpen(true);
          }}
          onStatus={(order) => {
            setCurrentOrder(order as ProductionOrder);
            setIsStatusDialogOpen(true);
          }}
          onEdit={(order) => {
            setCurrentOrder(order as ProductionOrder);
            setIsEditDialogOpen(true);
          }}
          onDelete={(order) => {
            setCurrentOrder(order as ProductionOrder);
            setIsDeleteDialogOpen(true);
          }}
        />
        
        {/* Add Order Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>إضافة أمر إنتاج جديد</DialogTitle>
            </DialogHeader>
            <AddOrderForm
              type="production"
              products={semiFinishedProducts}
              onSubmit={handleAddOrder}
              calculateItems={calculateIngredientsForProduct}
              calculateTotalCost={calculateTotalCost}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
        
        {/* View Order Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل أمر الإنتاج</DialogTitle>
            </DialogHeader>
            {currentOrder && (
              <OrderDetailsView
                order={currentOrder}
                type="production"
                onClose={() => setIsViewDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
        
        {/* Update Status Dialog */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تحديث حالة أمر الإنتاج</DialogTitle>
            </DialogHeader>
            {currentOrder && (
              <UpdateStatusForm
                order={currentOrder}
                onSubmit={handleUpdateStatus}
                onCancel={() => setIsStatusDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
        
        {/* Delete Order Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف أمر إنتاج</DialogTitle>
            </DialogHeader>
            {currentOrder && (
              <DeleteOrderConfirm
                order={currentOrder}
                onConfirm={handleDeleteOrder}
                onCancel={() => setIsDeleteDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
        
        {/* Edit Order Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل أمر إنتاج</DialogTitle>
            </DialogHeader>
            {currentOrder && (
              <EditOrderForm
                type="production"
                order={currentOrder}
                products={semiFinishedProducts}
                onSubmit={handleEditOrder}
                calculateItems={calculateIngredientsForProduct}
                calculateTotalCost={calculateTotalCost}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default ProductionOrders;
