import React, { useState } from 'react';
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
import { PackagingOrder } from '@/services/production/ProductionTypes';
import { FinishedProduct } from '@/services/InventoryService';
import { ensureNumericValue } from '@/components/inventory/common/InventoryDataFormatter';

// Components
import OrdersTable from '@/components/production/orders/OrdersTable';
import AddOrderForm from '@/components/production/orders/AddOrderForm';
import OrderDetailsView from '@/components/production/orders/OrderDetailsView';
import UpdateStatusForm from '@/components/production/orders/UpdateStatusForm';
import EditOrderForm from '@/components/production/orders/EditOrderForm';
import DeleteOrderConfirm from '@/components/production/orders/DeleteOrderConfirm';

const PackagingOrders = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<PackagingOrder | null>(null);
  
  const productionService = ProductionService.getInstance();
  const inventoryService = InventoryService.getInstance();
  
  // Fetch packaging orders
  const { 
    data: orders = [], 
    isLoading: isOrdersLoading,
    refetch: refetchOrders
  } = useQuery({
    queryKey: ['packagingOrders'],
    queryFn: async () => productionService.getPackagingOrders(),
  });
  
  // Fetch finished products
  const { 
    data: finishedProducts = [], 
    isLoading: isProductsLoading,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['finishedProducts'],
    queryFn: async () => inventoryService.getFinishedProducts(),
  });
  
  const isLoading = isOrdersLoading || isProductsLoading;
  
  const refreshData = async () => {
    toast.info("جاري تحديث البيانات...");
    await Promise.all([
      refetchOrders(),
      refetchProducts()
    ]);
    toast.success("تم تحديث البيانات بنجاح");
  };
  
  const checkComponentsAvailability = (productCode: string, quantity: number) => {
    const product = finishedProducts.find(p => p.code === productCode);
    if (!product) return [];
    
    const semiFinishedComponent = {
      type: 'سائل',
      code: product.semiFinished.code,
      name: product.semiFinished.name,
      requiredQuantity: ensureNumericValue(product.semiFinished.quantity) * ensureNumericValue(quantity),
      available: true,
      unit: 'وحدة'
    };
    
    const packagingComponents = product.packaging.map(item => ({
      type: 'تعبئة',
      code: item.code,
      name: item.name,
      requiredQuantity: ensureNumericValue(item.quantity) * ensureNumericValue(quantity),
      available: true,
      unit: 'وحدة'
    }));
    
    return [semiFinishedComponent, ...packagingComponents];
  };
  
  const calculateTotalCost = (productCode: string, quantity: number) => {
    const product = finishedProducts.find(p => p.code === productCode);
    if (!product) return 0;
    
    return ensureNumericValue(product.unit_cost) * ensureNumericValue(quantity);
  };

  // Handle add order
  const handleAddOrder = async (productCode: string, quantity: number) => {
    try {
      await productionService.createPackagingOrder(productCode, quantity);
      setIsAddDialogOpen(false);
      refetchOrders();
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("حدث خطأ أثناء إنشاء أمر التعبئة");
    }
  };
  
  // Handle update status
  const handleUpdateStatus = async (newStatus: 'pending' | 'inProgress' | 'completed' | 'cancelled') => {
    if (!currentOrder) return;
    
    try {
      const success = await productionService.updatePackagingOrderStatus(
        currentOrder.id, 
        newStatus
      );
      if (success) {
        setIsStatusDialogOpen(false);
        refetchOrders();
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("حدث خطأ أثناء تحديث حالة أمر التعبئة");
    }
  };
  
  // Handle delete order
  const handleDeleteOrder = async () => {
    if (!currentOrder) return;
    
    try {
      const success = await productionService.deletePackagingOrder(currentOrder.id);
      if (success) {
        setIsDeleteDialogOpen(false);
        refetchOrders();
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("حدث خطأ أثناء حذف أمر التعبئة");
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
      const product = finishedProducts.find(p => p.code === productCode);
      if (!product) {
        toast.error("المنتج غير موجود");
        return;
      }
      
      const semiFinished = {
        code: product.semiFinished.code,
        name: product.semiFinished.name,
        quantity: product.semiFinished.quantity * quantity
      };
      
      const components = checkComponentsAvailability(productCode, quantity);
      const packagingMaterials = components
        .filter(comp => comp.type === 'تعبئة')
        .map(material => ({
          code: material.code,
          name: material.name,
          quantity: material.requiredQuantity
        }));
      
      const success = await productionService.updatePackagingOrder(
        id,
        {
          productCode,
          productName: product.name,
          quantity,
          unit,
          semiFinished,
          packagingMaterials
        }
      );
      
      if (success) {
        setIsEditDialogOpen(false);
        refetchOrders();
        toast.success("تم تحديث أمر التعبئة بنجاح");
      }
    } catch (error) {
      console.error("Error updating packaging order:", error);
      toast.error("حدث خطأ أثناء تحديث أمر التعبئة");
    }
  };
  
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">أوامر التعبئة</h1>
            <p className="text-muted-foreground mt-1">إدارة عمليات تعبئة المنتجات النهائية</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshData} className="hover:bg-primary/10">
              <RefreshCw size={16} className="ml-2" />
              تحديث
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus size={18} className="mr-2" />
              أمر تعبئة جديد
            </Button>
          </div>
        </div>
        
        {/* Orders Table */}
        <OrdersTable
          data={orders}
          isLoading={isLoading}
          onView={(order) => {
            setCurrentOrder(order as PackagingOrder);
            setIsViewDialogOpen(true);
          }}
          onStatus={(order) => {
            setCurrentOrder(order as PackagingOrder);
            setIsStatusDialogOpen(true);
          }}
          onEdit={(order) => {
            setCurrentOrder(order as PackagingOrder);
            setIsEditDialogOpen(true);
          }}
          onDelete={(order) => {
            setCurrentOrder(order as PackagingOrder);
            setIsDeleteDialogOpen(true);
          }}
        />
        
        {/* Add Order Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>إضافة أمر تعبئة جديد</DialogTitle>
            </DialogHeader>
            <AddOrderForm
              type="packaging"
              products={finishedProducts}
              onSubmit={handleAddOrder}
              calculateItems={checkComponentsAvailability}
              calculateTotalCost={calculateTotalCost}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
        
        {/* View Order Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل أمر التعبئة</DialogTitle>
            </DialogHeader>
            {currentOrder && (
              <OrderDetailsView
                order={currentOrder}
                type="packaging"
                onClose={() => setIsViewDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
        
        {/* Update Status Dialog */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تحديث حالة أمر التعبئة</DialogTitle>
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
              <DialogTitle>حذف أمر تعبئة</DialogTitle>
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
              <DialogTitle>تعديل أمر تعبئة</DialogTitle>
            </DialogHeader>
            {currentOrder && (
              <EditOrderForm
                type="packaging"
                order={currentOrder}
                products={finishedProducts}
                onSubmit={handleEditOrder}
                calculateItems={checkComponentsAvailability}
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

export default PackagingOrders;
