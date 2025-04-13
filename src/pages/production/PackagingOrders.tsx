
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import ProductionDatabaseService from "@/services/database/ProductionDatabaseService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import InventoryMovementService from '@/services/InventoryMovementService';

const PackagingOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const productionService = ProductionDatabaseService.getInstance();
  const inventoryMovementService = InventoryMovementService.getInstance();
  
  const { data: packagingOrders, isLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['packagingOrders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });
  
  useEffect(() => {
    if (packagingOrders) {
      setOrders(packagingOrders);
    }
  }, [packagingOrders]);
  
  const handleViewOrder = (order: any) => {
    // Get the packaging materials
    const packagingMaterials = order.packaging_materials;
    
    // Ensure packaging_materials is properly accessed
    const formattedOrder = {
      ...order,
      semiFinished: {
        code: order.semi_finished_code,
        name: order.semi_finished_name,
        quantity: order.semi_finished_quantity
      },
      // Make sure packaging_materials is treated as an array of objects
      packaging: Array.isArray(packagingMaterials) ? packagingMaterials : []
    };
    
    setSelectedOrder(formattedOrder);
    setIsViewModalOpen(true);
  };
  
  // Helper method to consume semi-finished product using the inventory service
  const consumeSemiFinishedProduct = async (code: string, name: string, quantity: number, reason: string) => {
    return await inventoryMovementService.consumeStock(
      { code, name, unit: 'وحدة', type: 'semi_finished' },
      quantity,
      reason
    );
  };
  
  // Helper method to consume packaging material using the inventory service
  const consumePackagingMaterial = async (code: string, name: string, quantity: number, reason: string) => {
    return await inventoryMovementService.consumeStock(
      { code, name, unit: 'وحدة', type: 'packaging' },
      quantity,
      reason
    );
  };
  
  // Helper method to add finished product using the inventory service
  const addFinishedProduct = async (code: string, name: string, quantity: number, unitCost: number, reason: string) => {
    try {
      // Create movement record for adding the finished product
      const movement = {
        item_id: code,
        item_type: 'finished' as 'raw_material' | 'semi_finished' | 'finished' | 'packaging',
        quantity: quantity,
        movement_type: 'addition' as 'addition' | 'consumption' | 'transfer' | 'adjustment',
        reason: reason,
        note: reason,
        item_name: name
      };
      
      // Log the inventory movement
      await inventoryMovementService.logInventoryMovement(movement);
      
      // Update the finished product quantity in inventory - this is simplified
      const { data, error } = await supabase
        .from('finished_products')
        .select('quantity')
        .eq('code', code)
        .single();
      
      if (error) {
        console.error('Error fetching finished product:', error);
        return false;
      }
      
      const currentQuantity = data.quantity || 0;
      const newQuantity = currentQuantity + quantity;
      
      const { error: updateError } = await supabase
        .from('finished_products')
        .update({ 
          quantity: newQuantity,
          unit_cost: unitCost // Update unit cost with the calculated value
        })
        .eq('code', code);
      
      if (updateError) {
        console.error('Error updating finished product quantity:', updateError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error adding finished product:', error);
      return false;
    }
  };
  
  // Helper method to update packaging order status
  const updatePackagingOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('packaging_orders')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (error) {
        console.error('Error updating packaging order status:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating packaging order status:', error);
      return false;
    }
  };
  
  const handleApproveOrder = async (order: any) => {
    setProcessingOrderId(order.id);
    
    try {
      // Ensure we're passing the correct data structure to consumeSemiFinishedProduct
      await consumeSemiFinishedProduct(
        order.semi_finished_code,
        order.semi_finished_name,
        Number(order.semi_finished_quantity),
        `أمر تعبئة رقم: ${order.code}`
      );
      
      // For each packaging material, consume the required quantity
      const packagingMaterials = order.packaging_materials;
      
      if (Array.isArray(packagingMaterials)) {
        for (const material of packagingMaterials) {
          await consumePackagingMaterial(
            material.packaging_material_code,
            material.packaging_material_name,
            Number(material.required_quantity),
            `أمر تعبئة رقم: ${order.code}`
          );
        }
      }
      
      // Add the finished product to inventory
      await addFinishedProduct(
        order.product_code,
        order.product_name,
        Number(order.quantity),
        Number(order.total_cost / order.quantity),
        `أمر تعبئة رقم: ${order.code}`
      );
      
      // Update the order status
      await updatePackagingOrderStatus(order.id, 'completed');
      
      toast.success(`تم تنفيذ أمر التعبئة رقم ${order.code} بنجاح`);
      
      // Refresh data
      refetchOrders();
    } catch (error) {
      console.error('Error approving packaging order:', error);
      toast.error('حدث خطأ أثناء تنفيذ أمر التعبئة');
    } finally {
      setProcessingOrderId(null);
    }
  };
  
  const OrderDetails = ({ order }: { order: any }) => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">تفاصيل المنتج</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">الكود</div>
              <div>{order.product_code}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">الاسم</div>
              <div>{order.product_name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">الكمية</div>
              <div>
                {order.quantity} <Badge variant="outline">{order.product_unit}</Badge>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">التكلفة الإجمالية</div>
              <div>{order.total_cost}</div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h3 className="text-lg font-medium mb-2">تفاصيل المنتج النصف مصنع</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">الكود</div>
              <div>{order.semiFinished.code}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">الاسم</div>
              <div>{order.semiFinished.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">الكمية</div>
              <div>{order.semiFinished.quantity}</div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">مواد التعبئة</h3>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الكمية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(order.packaging_materials) ? (
                  order.packaging_materials.map((material: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{material.packaging_material_code}</TableCell>
                      <TableCell>{material.packaging_material_name}</TableCell>
                      <TableCell>{material.required_quantity}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      لا توجد مواد تعبئة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-6 w-6" />
            أوامر التعبئة
          </CardTitle>
          <CardDescription>
            عرض وإدارة أوامر تعبئة المنتجات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>المنتج</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>التكلفة الإجمالية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.code}</TableCell>
                    <TableCell>{order.product_name}</TableCell>
                    <TableCell>
                      {order.quantity} <Badge variant="outline">{order.product_unit}</Badge>
                    </TableCell>
                    <TableCell>{order.total_cost}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                      >
                        عرض
                      </Button>
                      {order.status === 'pending' && (
                        <Button
                          variant="default"
                          size="sm"
                          disabled={processingOrderId === order.id}
                          onClick={() => handleApproveOrder(order)}
                        >
                          {processingOrderId === order.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              جاري التنفيذ...
                            </>
                          ) : (
                            'تنفيذ الأمر'
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>تفاصيل أمر التعبئة</DialogTitle>
            <DialogDescription>
              عرض تفاصيل أمر التعبئة المحدد
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && <OrderDetails order={selectedOrder} />}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsViewModalOpen(false)}>
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackagingOrders;
