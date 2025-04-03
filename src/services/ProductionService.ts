
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

      // Add type assertion to ensure proper type handling
      const ordersWithTypeAssurance = (data || []).map(order => ({
        ...order,
        status: order.status as "pending" | "inProgress" | "completed" | "cancelled",
        ingredients: [] // Initialize empty ingredients array that will be populated when needed
      }));

      return ordersWithTypeAssurance;
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

      // Add type assertion to ensure proper type handling
      const ordersWithTypeAssurance = (data || []).map(order => ({
        ...order,
        status: order.status as "pending" | "inProgress" | "completed" | "cancelled",
        packagingMaterials: [], // Initialize empty array
        semiFinished: { // Initialize with default structure
          code: order.semi_finished_code,
          name: order.semi_finished_name,
          quantity: order.semi_finished_quantity,
          available: true
        }
      }));

      return ordersWithTypeAssurance;
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
   * @returns {Promise<ProductionOrder | null>} - The created production order.
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
          total_cost: semiFinishedProduct.unit_cost * quantity,
          notes: notes // Add notes field
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

      toast.success("أمر الإنتاج تم إنشاؤه بنجاح");

      return {
        ...productionOrder, 
        status: productionOrder.status as "pending" | "inProgress" | "completed" | "cancelled",
        ingredients: []
      };
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
   * @param {string} finishedProductCode - The code of the finished product.
   * @param {number} quantity - The quantity to package.
   * @param {string} notes - Additional notes.
   * @returns {Promise<PackagingOrder | null>} - The created packaging order.
   */
  async createPackagingOrder(
    finishedProductCode: string,
    quantity: number,
    notes: string = ""
  ): Promise<PackagingOrder | null> {
    try {
      // Fetch the finished product details by code
      let finishedProduct = null;
      const { data: finishedProducts, error: finishedError } = await supabase
        .from('finished_products')
        .select('*')
        .eq('code', finishedProductCode)
        .single();
      
      if (finishedError) {
        throw new Error("Finished product not found.");
      }
      
      finishedProduct = finishedProducts;

      if (!finishedProduct) {
        throw new Error("Finished product not found.");
      }

      // Get semi-finished product details
      const semiFinishedProduct = await this.inventoryService.getSemiFinishedProductById(finishedProduct.semi_finished_id);
      if (!semiFinishedProduct) {
        throw new Error("Semi-finished product not found.");
      }

      // Create the packaging order
      const orderCode = generateOrderCode('PACK');
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      
      const requiredSemiQuantity = finishedProduct.semi_finished_quantity * quantity;
      
      const { data: packagingOrder, error: packagingOrderError } = await supabase
        .from('packaging_orders')
        .insert({
          code: orderCode,
          date: currentDate,
          product_code: finishedProduct.code,
          product_name: finishedProduct.name,
          semi_finished_code: semiFinishedProduct.code,
          semi_finished_name: semiFinishedProduct.name,
          semi_finished_quantity: requiredSemiQuantity,
          quantity: quantity,
          unit: finishedProduct.unit,
          status: 'pending',
          total_cost: finishedProduct.unit_cost * quantity,
          notes: notes // Add notes field
        })
        .select()
        .single();

      if (packagingOrderError) throw packagingOrderError;

      toast.success("تم إنشاء أمر التعبئة بنجاح");
      
      return {
        ...packagingOrder,
        status: packagingOrder.status as "pending" | "inProgress" | "completed" | "cancelled",
        packagingMaterials: [],
        semiFinished: {
          code: semiFinishedProduct.code,
          name: semiFinishedProduct.name,
          quantity: requiredSemiQuantity,
          available: true
        }
      };
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
      console.log("Production movement:", movement);
      // Since the table doesn't exist yet, we'll just log the movement
    } catch (error) {
      console.error("Error recording production movement:", error);
    }
  }
}

export default ProductionService;
