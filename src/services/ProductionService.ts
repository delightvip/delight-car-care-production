
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryService from "./InventoryService";
import { RawMaterial, PackagingMaterial, SemiFinishedProduct, FinishedProduct } from "@/types/inventoryTypes";
import { format } from "date-fns";
import { ProductionOrder, ProductionOrderIngredient, PackagingOrder, PackagingOrderMaterial, ProductionMovement } from "./types/productionTypes";
import { generateOrderCode } from "@/utils/generateCode";

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

  /**
   * Gets all production orders.
   * @returns {Promise<ProductionOrder[]>} - The production orders.
   */
  async getProductionOrders(): Promise<ProductionOrder[]> {
    try {
      const { data, error } = await supabase
        .from('production_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error("Error fetching production orders:", error);
      toast.error("حدث خطأ أثناء جلب أوامر الإنتاج");
      return [];
    }
  }

  /**
   * Gets all packaging orders.
   * @returns {Promise<PackagingOrder[]>} - The packaging orders.
   */
  async getPackagingOrders(): Promise<PackagingOrder[]> {
    try {
      const { data, error } = await supabase
        .from('packaging_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error("Error fetching packaging orders:", error);
      toast.error("حدث خطأ أثناء جلب أوامر التعبئة");
      return [];
    }
  }

  /**
   * Creates a new production order.
   * @param {string} semiFinishedCode - The code of the semi-finished product to produce.
   * @param {number} quantity - The quantity of the semi-finished product to produce.
   * @param {string} notes - Additional notes for the production order.
   * @returns {Promise<any>} - The created production order.
   */
  async createProductionOrder(
    semiFinishedCode: string,
    quantity: number,
    notes: string = ""
  ): Promise<ProductionOrder | null> {
    try {
      // Fetch the semi-finished product details
      const semiFinishedProduct = await this.inventoryService.getSemiFinishedProductByCode(semiFinishedCode);

      if (!semiFinishedProduct) {
        throw new Error("Semi-finished product not found.");
      }

      const orderCode = generateOrderCode('PROD');
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      
      // Calculate raw materials required based on the quantity
      const ingredients = semiFinishedProduct.ingredients?.map((ingredient: any) => ({
        id: parseInt(ingredient.code),
        quantity: ingredient.percentage * quantity / 100
      })) || [];

      // Check if there are enough raw materials in stock
      for (const material of ingredients) {
        const available = await this.inventoryService.checkRawMaterialAvailability(material.id, material.quantity);
        if (!available) {
          throw new Error(`Insufficient stock for raw material #${material.id}.`);
        }
      }

      // Consume the raw materials from inventory
      await this.inventoryService.consumeRawMaterials(ingredients);

      // Create the production order
      const { data: productionOrder, error: productionOrderError } = await supabase
        .from("production_orders")
        .insert({
          code: orderCode,
          product_code: semiFinishedProduct.code,
          product_name: semiFinishedProduct.name,
          date: currentDate,
          quantity,
          unit: semiFinishedProduct.unit,
          status: "pending",
          total_cost: semiFinishedProduct.unit_cost * quantity
        })
        .select()
        .single();

      if (productionOrderError) {
        throw new Error(`Failed to create production order: ${productionOrderError.message}`);
      }

      // Record ingredients for the production order
      if (semiFinishedProduct.ingredients && semiFinishedProduct.ingredients.length > 0) {
        const ingredientsToInsert = semiFinishedProduct.ingredients.map((ingredient: any) => ({
          production_order_id: productionOrder.id,
          raw_material_code: ingredient.code,
          raw_material_name: ingredient.name,
          required_quantity: (ingredient.percentage * quantity) / 100
        }));

        const { error: ingredientsError } = await supabase
          .from("production_order_ingredients")
          .insert(ingredientsToInsert);

        if (ingredientsError) {
          console.error("Error recording ingredients:", ingredientsError);
        }
      }

      // Record the production movement
      await this.recordInventoryMovement({
        item_id: semiFinishedProduct.code,
        item_type: 'semi_finished_products',
        quantity,
        movement_type: 'add',
        reason: `Production order ${orderCode}`,
        balance_after: (semiFinishedProduct.quantity || 0) + quantity
      });

      toast({
        title: "Success",
        description: "Production order created successfully.",
      });

      return productionOrder;
    } catch (error: any) {
      console.error("Error creating production order:", error);
      toast.error(`Failed to create production order: ${error.message}`);
      return null;
    }
  }

  /**
   * Updates a production order's status.
   * @param {number} id - The ID of the production order.
   * @param {string} status - The new status.
   * @returns {Promise<boolean>} - Whether the update was successful.
   */
  async updateProductionOrderStatus(
    id: number,
    status: 'pending' | 'inProgress' | 'completed' | 'cancelled'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('production_orders')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast.success("تم تحديث حالة أمر الإنتاج بنجاح");
      return true;
    } catch (error: any) {
      console.error("Error updating production order status:", error);
      toast.error("حدث خطأ أثناء تحديث حالة أمر الإنتاج");
      return false;
    }
  }

  /**
   * Updates a packaging order's status.
   * @param {number} id - The ID of the packaging order.
   * @param {string} status - The new status.
   * @returns {Promise<boolean>} - Whether the update was successful.
   */
  async updatePackagingOrderStatus(
    id: number,
    status: 'pending' | 'inProgress' | 'completed' | 'cancelled'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('packaging_orders')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast.success("تم تحديث حالة أمر التعبئة بنجاح");
      return true;
    } catch (error: any) {
      console.error("Error updating packaging order status:", error);
      toast.error("حدث خطأ أثناء تحديث حالة أمر التعبئة");
      return false;
    }
  }

  /**
   * Deletes a production order.
   * @param {number} id - The ID of the production order.
   * @returns {Promise<boolean>} - Whether the deletion was successful.
   */
  async deleteProductionOrder(id: number): Promise<boolean> {
    try {
      // Get the ingredients first to potentially return them to inventory
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('production_order_ingredients')
        .select('*')
        .eq('production_order_id', id);

      if (ingredientsError) throw ingredientsError;

      // Delete the order
      const { error } = await supabase
        .from('production_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Return the raw materials to inventory if needed
      // This would need additional implementation based on your business rules

      toast.success("تم حذف أمر الإنتاج بنجاح");
      return true;
    } catch (error: any) {
      console.error("Error deleting production order:", error);
      toast.error("حدث خطأ أثناء حذف أمر الإنتاج");
      return false;
    }
  }

  /**
   * Deletes a packaging order.
   * @param {number} id - The ID of the packaging order.
   * @returns {Promise<boolean>} - Whether the deletion was successful.
   */
  async deletePackagingOrder(id: number): Promise<boolean> {
    try {
      // Get the packaging materials first to potentially return them to inventory
      const { data: materials, error: materialsError } = await supabase
        .from('packaging_order_materials')
        .select('*')
        .eq('packaging_order_id', id);

      if (materialsError) throw materialsError;

      // Delete the order
      const { error } = await supabase
        .from('packaging_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("تم حذف أمر التعبئة بنجاح");
      return true;
    } catch (error: any) {
      console.error("Error deleting packaging order:", error);
      toast.error("حدث خطأ أثناء حذف أمر التعبئة");
      return false;
    }
  }

  /**
   * Updates a production order.
   * @param {number} id - The ID of the production order.
   * @param {Partial<ProductionOrder>} data - The updated data.
   * @returns {Promise<boolean>} - Whether the update was successful.
   */
  async updateProductionOrder(
    id: number,
    data: Partial<ProductionOrder & { ingredients?: Array<{ code: string, name: string, requiredQuantity: number }> }>
  ): Promise<boolean> {
    try {
      // Update only the allowed fields
      const updateData = {
        product_code: data.product_code,
        product_name: data.product_name,
        quantity: data.quantity,
        unit: data.unit,
        total_cost: data.total_cost,
      };

      const { error } = await supabase
        .from('production_orders')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update ingredients if provided
      if (data.ingredients && data.ingredients.length > 0) {
        // Delete existing ingredients
        await supabase
          .from('production_order_ingredients')
          .delete()
          .eq('production_order_id', id);

        // Insert new ingredients
        const ingredientsToInsert = data.ingredients.map(ing => ({
          production_order_id: id,
          raw_material_code: ing.code,
          raw_material_name: ing.name,
          required_quantity: ing.requiredQuantity
        }));

        const { error: ingredientsError } = await supabase
          .from('production_order_ingredients')
          .insert(ingredientsToInsert);

        if (ingredientsError) throw ingredientsError;
      }

      toast.success("تم تحديث أمر الإنتاج بنجاح");
      return true;
    } catch (error: any) {
      console.error("Error updating production order:", error);
      toast.error("حدث خطأ أثناء تحديث أمر الإنتاج");
      return false;
    }
  }

  /**
   * Updates a packaging order.
   * @param {number} id - The ID of the packaging order.
   * @param {Partial<PackagingOrder>} data - The updated data.
   * @returns {Promise<boolean>} - Whether the update was successful.
   */
  async updatePackagingOrder(
    id: number,
    data: Partial<PackagingOrder & { materials?: Array<{ code: string, name: string, requiredQuantity: number }> }>
  ): Promise<boolean> {
    try {
      // Update only the allowed fields
      const updateData = {
        product_code: data.product_code,
        product_name: data.product_name,
        quantity: data.quantity,
        unit: data.unit,
        semi_finished_code: data.semi_finished_code,
        semi_finished_name: data.semi_finished_name,
        semi_finished_quantity: data.semi_finished_quantity,
        total_cost: data.total_cost,
      };

      const { error } = await supabase
        .from('packaging_orders')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Update materials if provided
      if (data.materials && data.materials.length > 0) {
        // Delete existing materials
        await supabase
          .from('packaging_order_materials')
          .delete()
          .eq('packaging_order_id', id);

        // Insert new materials
        const materialsToInsert = data.materials.map(mat => ({
          packaging_order_id: id,
          packaging_material_code: mat.code,
          packaging_material_name: mat.name,
          required_quantity: mat.requiredQuantity
        }));

        const { error: materialsError } = await supabase
          .from('packaging_order_materials')
          .insert(materialsToInsert);

        if (materialsError) throw materialsError;
      }

      toast.success("تم تحديث أمر التعبئة بنجاح");
      return true;
    } catch (error: any) {
      console.error("Error updating packaging order:", error);
      toast.error("حدث خطأ أثناء تحديث أمر التعبئة");
      return false;
    }
  }

  /**
   * Creates a packaging order.
   * @param {Object} data - The packaging order data.
   * @returns {Promise<PackagingOrder | null>} - The created packaging order.
   */
  async createPackagingOrder(data: {
    finishedProductCode: string;
    quantity: number;
    notes?: string;
  }): Promise<PackagingOrder | null> {
    try {
      // Fetch the finished product details
      const { data: finishedProduct, error: finishedProductError } = await supabase
        .from('finished_products')
        .select(`
          *,
          semi_finished_products (id, code, name, quantity, unit)
        `)
        .eq('code', data.finishedProductCode)
        .single();

      if (finishedProductError) throw finishedProductError;

      // Fetch packaging materials for the finished product
      const { data: packagingMaterials, error: packagingError } = await supabase
        .from('finished_product_packaging')
        .select(`
          quantity,
          packaging_materials (id, code, name, quantity)
        `)
        .eq('finished_product_id', finishedProduct.id);

      if (packagingError) throw packagingError;

      // Calculate required materials and check availability
      const materials = packagingMaterials.map((material: any) => ({
        code: material.packaging_materials.code,
        name: material.packaging_materials.name,
        requiredQuantity: material.quantity * data.quantity,
        available: material.packaging_materials.quantity >= material.quantity * data.quantity
      }));

      // Calculate required semi-finished product quantity
      const requiredSemiQuantity = finishedProduct.semi_finished_quantity * data.quantity;
      
      // Check if there's enough semi-finished product available
      const semiFinishedAvailable = finishedProduct.semi_finished_products.quantity >= requiredSemiQuantity;
      if (!semiFinishedAvailable) {
        throw new Error("Not enough semi-finished product available");
      }

      // Check if all packaging materials are available
      const allMaterialsAvailable = materials.every(mat => mat.available);
      if (!allMaterialsAvailable) {
        throw new Error("Not all packaging materials are available");
      }

      // Create the packaging order
      const orderCode = generateOrderCode('PACK');
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      
      const { data: packagingOrder, error: packagingOrderError } = await supabase
        .from('packaging_orders')
        .insert({
          code: orderCode,
          date: currentDate,
          product_code: finishedProduct.code,
          product_name: finishedProduct.name,
          semi_finished_code: finishedProduct.semi_finished_products.code,
          semi_finished_name: finishedProduct.semi_finished_products.name,
          semi_finished_quantity: requiredSemiQuantity,
          quantity: data.quantity,
          unit: finishedProduct.unit,
          status: 'pending',
          total_cost: finishedProduct.unit_cost * data.quantity
        })
        .select()
        .single();

      if (packagingOrderError) throw packagingOrderError;

      // Record the packaging materials
      if (materials.length > 0) {
        const materialsToInsert = materials.map(material => ({
          packaging_order_id: packagingOrder.id,
          packaging_material_code: material.code,
          packaging_material_name: material.name,
          required_quantity: material.requiredQuantity
        }));

        const { error: insertError } = await supabase
          .from('packaging_order_materials')
          .insert(materialsToInsert);

        if (insertError) throw insertError;
      }

      // Consume materials from inventory
      // This would be done when the order is confirmed, not when it's created
      // But we'll prepare the materials data here

      toast.success("تم إنشاء أمر التعبئة بنجاح");
      return packagingOrder;
    } catch (error: any) {
      console.error("Error creating packaging order:", error);
      toast.error(`حدث خطأ أثناء إنشاء أمر التعبئة: ${error.message}`);
      return null;
    }
  }

  /**
   * Records an inventory movement.
   */
  private async recordInventoryMovement(movement: {
    item_id: string;
    item_type: string;
    quantity: number;
    movement_type: string;
    reason?: string;
    balance_after: number;
  }): Promise<void> {
    try {
      await supabase.from('inventory_movements').insert({
        item_id: movement.item_id,
        item_type: movement.item_type,
        quantity: movement.quantity,
        movement_type: movement.movement_type,
        reason: movement.reason,
        balance_after: movement.balance_after,
      });
    } catch (error) {
      console.error("Error recording inventory movement:", error);
    }
  }

  /**
   * Records a production movement.
   */
  private async recordProductionMovement(movement: ProductionMovement): Promise<void> {
    try {
      // Check if the production_movements table exists and create it if needed
      // This would usually be done as part of schema migrations, but we'll check here for safety
      
      // Insert the movement record into appropriate table based on database schema
      // For now, we'll log the movement since we're not sure of the exact schema
      console.log("Production movement:", movement);
      
      // Here you would implement the actual database record insertion
      // For example:
      // await supabase.from('production_movements').insert(movement);
    } catch (error) {
      console.error("Error recording production movement:", error);
    }
  }
}

export default ProductionService;
export type { ProductionOrder, PackagingOrder, ProductionMovement };
