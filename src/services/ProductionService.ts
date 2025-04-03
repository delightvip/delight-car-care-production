import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryService from "./InventoryService";
import { ProductionOrderIngredient } from "./commercial/CommercialTypes";

class ProductionService {
  private static instance: ProductionService;
  private inventoryService: InventoryService;
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
  }
  
  public static getInstance(): ProductionService {
    if (!ProductionService.instance) {
      ProductionService.instance = new ProductionService();
    }
    return ProductionService.instance;
  }
  
  // Production order methods
  async getProductionOrders(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('production_orders')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Fetch ingredients for each production order
      const productionOrdersWithIngredients = await Promise.all(
        data.map(async (order) => {
          const { data: ingredients, error: ingredientsError } = await supabase
            .from('production_order_ingredients')
            .select('*')
            .eq('production_order_id', order.id);
          
          if (ingredientsError) {
            console.error(`Error fetching ingredients for order ${order.id}:`, ingredientsError);
            return order;
          }
          
          return {
            ...order,
            ingredients: ingredients || []
          };
        })
      );
      
      return productionOrdersWithIngredients;
    } catch (error) {
      console.error('Error fetching production orders:', error);
      toast.error('حدث خطأ أثناء جلب أوامر الإنتاج');
      return [];
    }
  }
  
  async createProductionOrder(productCode: string, quantity: number): Promise<any> {
    try {
      // Fetch product details
      const { data: product, error: productError } = await supabase
        .from('semi_finished_products')
        .select('*')
        .eq('code', productCode)
        .single();
      
      if (productError) throw productError;
      
      // Calculate total cost
      const totalCost = product.unit_cost * quantity;
      
      // Create production order
      const { data: order, error: orderError } = await supabase
        .from('production_orders')
        .insert({
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          quantity: quantity,
          unit: product.unit,
          total_cost: totalCost,
          status: 'pending'
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create ingredients
      for (const ingredient of product.ingredients) {
        const requiredQuantity = (ingredient.percentage / 100) * quantity;
        
        await supabase
          .from('production_order_ingredients')
          .insert({
            production_order_id: order.id,
            raw_material_id: ingredient.raw_material_id,
            raw_material_code: ingredient.code,
            raw_material_name: ingredient.name,
            required_quantity: requiredQuantity
          });
      }
      
      toast.success('تم إنشاء أمر الإنتاج بنجاح');
      return order;
    } catch (error) {
      console.error('Error creating production order:', error);
      toast.error('حدث خطأ أثناء إنشاء أمر الإنتاج');
      return null;
    }
  }

  // Add missing production order methods
  async updateProductionOrder(id: number, data: any): Promise<boolean> {
    try {
      // Update the production order
      const { error } = await this.supabase
        .from('production_orders')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating production order:', error);
      return false;
    }
  }
  
  async deleteProductionOrder(id: number): Promise<boolean> {
    try {
      // Delete ingredients first
      await this.supabase
        .from('production_order_ingredients')
        .delete()
        .eq('production_order_id', id);
        
      // Delete the production order
      const { error } = await this.supabase
        .from('production_orders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting production order:', error);
      return false;
    }
  }
  
  async updateProductionOrderStatus(id: number, status: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('production_orders')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      // If status is "completed", we should update inventory
      if (status === 'completed') {
        const { data: order, error: orderError } = await this.supabase
          .from('production_orders')
          .select('*')
          .eq('id', id)
          .single();
          
        if (orderError) throw orderError;
        
        // Update raw materials inventory
        const { data: ingredients, error: ingredientsError } = await this.supabase
          .from('production_order_ingredients')
          .select('*')
          .eq('production_order_id', id);
          
        if (ingredientsError) throw ingredientsError;
        
        // Decrease raw materials inventory
        for (const ingredient of ingredients) {
          await this.inventoryService.updateRawMaterial(
            ingredient.raw_material_id,
            { quantity: -ingredient.required_quantity }
          );
        }
        
        // Increase semi-finished products inventory
        await this.inventoryService.updateSemiFinishedProduct(
          order.product_id,
          { quantity: order.quantity }
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error updating production order status:', error);
      return false;
    }
  }

  // Packaging order methods
  async getPackagingOrders(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('packaging_orders')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Fetch materials for each packaging order
      const packagingOrdersWithMaterials = await Promise.all(
        data.map(async (order) => {
          const { data: materials, error: materialsError } = await supabase
            .from('packaging_order_materials')
            .select('*')
            .eq('packaging_order_id', order.id);
          
          if (materialsError) {
            console.error(`Error fetching materials for order ${order.id}:`, materialsError);
            return order;
          }
          
          return {
            ...order,
            materials: materials || []
          };
        })
      );
      
      return packagingOrdersWithMaterials;
    } catch (error) {
      console.error('Error fetching packaging orders:', error);
      toast.error('حدث خطأ أثناء جلب أوامر التعبئة والتغليف');
      return [];
    }
  }
  
  async createPackagingOrder(
    productId: number,
    semiFinishedId: number,
    quantity: number
  ): Promise<any> {
    try {
      // Fetch product and semi-finished product details
      const { data: product, error: productError } = await supabase
        .from('finished_products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (productError) throw productError;
      
      const { data: semiFinished, error: semiFinishedError } = await supabase
        .from('semi_finished_products')
        .select('*')
        .eq('id', semiFinishedId)
        .single();
      
      if (semiFinishedError) throw semiFinishedError;
      
      // Create packaging order
      const { data: order, error: orderError } = await supabase
        .from('packaging_orders')
        .insert({
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          semi_finished_id: semiFinished.id,
          semi_finished_code: semiFinished.code,
          semi_finished_name: semiFinished.name,
          semi_finished_quantity: semiFinished.quantity,
          quantity: quantity,
          unit: product.unit,
          status: 'pending'
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create materials
      for (const material of semiFinished.packaging_materials) {
        const requiredQuantity = material.percentage / 100 * quantity;
        
        await supabase
          .from('packaging_order_materials')
          .insert({
            packaging_order_id: order.id,
            packaging_material_id: material.packaging_material_id,
            packaging_material_code: material.code,
            packaging_material_name: material.name,
            required_quantity: requiredQuantity
          });
      }
      
      toast.success('تم إنشاء أمر التعبئة والتغليف بنجاح');
      return order;
    } catch (error) {
      console.error('Error creating packaging order:', error);
      toast.error('حدث خطأ أثناء إنشاء أمر التعبئة والتغليف');
      return null;
    }
  }
  
  // Add missing packaging order methods
  async updatePackagingOrder(id: number, data: any): Promise<boolean> {
    try {
      // Update the packaging order
      const { error } = await this.supabase
        .from('packaging_orders')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating packaging order:', error);
      return false;
    }
  }
  
  async deletePackagingOrder(id: number): Promise<boolean> {
    try {
      // Delete materials first
      await this.supabase
        .from('packaging_order_materials')
        .delete()
        .eq('packaging_order_id', id);
        
      // Delete the packaging order
      const { error } = await this.supabase
        .from('packaging_orders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting packaging order:', error);
      return false;
    }
  }
  
  async updatePackagingOrderStatus(id: number, status: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('packaging_orders')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      // If status is "completed", we should update inventory
      if (status === 'completed') {
        const { data: order, error: orderError } = await this.supabase
          .from('packaging_orders')
          .select('*')
          .eq('id', id)
          .single();
          
        if (orderError) throw orderError;
        
        // Update packaging materials inventory
        const { data: materials, error: materialsError } = await this.supabase
          .from('packaging_order_materials')
          .select('*')
          .eq('packaging_order_id', id);
          
        if (materialsError) throw materialsError;
        
        // Decrease packaging materials inventory
        for (const material of materials) {
          await this.inventoryService.updatePackagingMaterial(
            material.packaging_material_id,
            { quantity: -material.required_quantity }
          );
        }
        
        // Decrease semi-finished products inventory
        await this.inventoryService.updateSemiFinishedProduct(
          order.semi_finished_id,
          { quantity: -order.semi_finished_quantity }
        );
        
        // Increase finished products inventory
        await this.inventoryService.updateFinishedProduct(
          order.product_id,
          { quantity: order.quantity }
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error updating packaging order status:', error);
      return false;
    }
  }
}

export default ProductionService;
