import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import InventoryService from "./InventoryService";
import { RawMaterial, PackagingMaterial, SemiFinishedProduct, FinishedProduct } from "@/types/inventoryTypes";
import { format } from "date-fns";

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
   * Creates a new production order.
   * @param {string} semiFinishedCode - The code of the semi-finished product to produce.
   * @param {number} quantity - The quantity of the semi-finished product to produce.
   * @param {string} notes - Additional notes for the production order.
   * @returns {Promise<any>} - The created production order.
   */
  async createProductionOrder(
    semiFinishedCode: string,
    quantity: number,
    notes: string
  ): Promise<any> {
    try {
      // Fetch the semi-finished product details
      const { data: semiFinishedProduct, error: semiFinishedError } =
        await supabase
          .from("semi_finished_products")
          .select("*")
          .eq("code", semiFinishedCode)
          .single();

      if (semiFinishedError) {
        throw new Error(
          `Failed to fetch semi-finished product: ${semiFinishedError.message}`
        );
      }

      if (!semiFinishedProduct) {
        throw new Error("Semi-finished product not found.");
      }

      // Calculate raw materials required based on the quantity
      const rawMaterialsWithQuantities =
        semiFinishedProduct.ingredients.map((ingredient: any) => ({
          code: ingredient.code,
          requiredQuantity: ingredient.percentage * quantity,
        }));

      // Check if there are enough raw materials in stock
      for (const material of rawMaterialsWithQuantities) {
        const { data: rawMaterial, error: rawMaterialError } = await supabase
          .from("raw_materials")
          .select("quantity")
          .eq("code", material.code)
          .single();

        if (rawMaterialError) {
          throw new Error(
            `Failed to fetch raw material ${material.code}: ${rawMaterialError.message}`
          );
        }

        if (!rawMaterial || rawMaterial.quantity < material.requiredQuantity) {
          throw new Error(
            `Insufficient stock for raw material ${material.code}.`
          );
        }
      }

      // Consume the raw materials from inventory
      const materialsToConsume = rawMaterialsWithQuantities.map(material => ({
        id: Number(material.code),
        quantity: material.requiredQuantity
      }));
      await this.inventoryService.consumeRawMaterials(materialsToConsume);

      // Create the production order
      const { data: productionOrder, error: productionOrderError } =
        await supabase.from("production_orders").insert([
          {
            semi_finished_code: semiFinishedCode,
            quantity,
            notes,
            status: "pending",
          },
        ]).select().single();

      if (productionOrderError) {
        throw new Error(
          `Failed to create production order: ${productionOrderError.message}`
        );
      }

      // Record the production movement
      await this.recordProductionMovement(semiFinishedCode, 'production');

      toast({
        title: "Success",
        description: "Production order created successfully.",
      });

      return productionOrder;
    } catch (error: any) {
      console.error("Error creating production order:", error);
      toast({
        title: "Error",
        description: `Failed to create production order: ${error.message}`,
        variant: "destructive",
      });
      return null;
    }
  }

  /**
   * Cancels a production order and returns the raw materials to inventory.
   * @param {string} semiFinishedCode - The code of the semi-finished product.
   * @param {number} quantity - The quantity of the semi-finished product.
   * @returns {Promise<void>}
   */
  async cancelProductionOrder(
    semiFinishedCode: string,
    quantity: number
  ): Promise<void> {
    try {
      // Fetch the semi-finished product details
      const { data: semiFinishedProduct, error: semiFinishedError } =
        await supabase
          .from("semi_finished_products")
          .select("*")
          .eq("code", semiFinishedCode)
          .single();

      if (semiFinishedError) {
        throw new Error(
          `Failed to fetch semi-finished product: ${semiFinishedError.message}`
        );
      }

      if (!semiFinishedProduct) {
        throw new Error("Semi-finished product not found.");
      }

      // Calculate raw materials required based on the quantity
      const unusedMaterials = semiFinishedProduct.ingredients.map(
        (ingredient: any) => ({
          code: ingredient.code,
          requiredQuantity: ingredient.percentage * quantity,
        })
      );

      // Return the raw materials to inventory
      const materialsToReturn = unusedMaterials.map(material => ({
        id: Number(material.code),
        quantity: material.requiredQuantity
      }));
      await this.inventoryService.returnRawMaterials(materialsToReturn);

      // Update material importances
      await this.updateMaterialImportance();

      // Record the inventory movement
      await this.recordProductionMovement(semiFinishedCode, 'cancel');

      toast({
        title: "Success",
        description: "Production order cancelled and materials returned.",
      });
    } catch (error: any) {
      console.error("Error cancelling production order:", error);
      toast({
        title: "Error",
        description: `Failed to cancel production order: ${error.message}`,
        variant: "destructive",
      });
    }
  }

  /**
   * Records the production of finished products and consumes semi-finished products and packaging materials.
   * @param {string} productCode - The code of the finished product.
   * @param {number} quantity - The quantity of the finished product produced.
   * @param {string} notes - Additional notes for the production.
   * @returns {Promise<void>}
   */
  async recordProduction(productCode: string, quantity: number, notes: string): Promise<void> {
    try {
      // Fetch the finished product details
      const { data: finishedProduct, error: finishedProductError } =
        await supabase
          .from("finished_products")
          .select("*")
          .eq("code", productCode)
          .single();

      if (finishedProductError) {
        throw new Error(
          `Failed to fetch finished product: ${finishedProductError.message}`
        );
      }

      if (!finishedProduct) {
        throw new Error("Finished product not found.");
      }

      // Consume semi-finished products
      await supabase.from("semi_finished_products").update({
        quantity: finishedProduct.semi_finished_quantity - quantity,
      });

      // Calculate packaging materials required
      const packagingMaterialsWithQuantities = finishedProduct.packaging.map(
        (packaging: any) => ({
          code: packaging.code,
          requiredQuantity: packaging.quantity * quantity,
        })
      );

      // Consume packaging materials from inventory
      const packagingToConsume = packagingMaterialsWithQuantities.map(material => ({
        id: Number(material.code),
        quantity: material.requiredQuantity
      }));
      await this.inventoryService.consumePackagingMaterials(packagingToConsume);

      // Update material importances
      await this.updateMaterialImportance();

      // Record the inventory movement
      await this.recordInventoryMovement(productCode);

      toast({
        title: "Success",
        description: "Production recorded successfully.",
      });
    } catch (error: any) {
      console.error("Error recording production:", error);
      toast({
        title: "Error",
        description: `Failed to record production: ${error.message}`,
        variant: "destructive",
      });
    }
  }

  /**
   * Cancels the production of finished products and returns semi-finished products and packaging materials to inventory.
   * @param {string} productCode - The code of the finished product.
   * @param {number} quantity - The quantity of the finished product to cancel.
   * @returns {Promise<void>}
   */
  async cancelFinishedProduction(productCode: string, quantity: number): Promise<void> {
    try {
      // Fetch the finished product details
      const { data: finishedProduct, error: finishedProductError } =
        await supabase
          .from("finished_products")
          .select("*")
          .eq("code", productCode)
          .single();

      if (finishedProductError) {
        throw new Error(
          `Failed to fetch finished product: ${finishedProductError.message}`
        );
      }

      if (!finishedProduct) {
        throw new Error("Finished product not found.");
      }

      // Calculate packaging materials to return
      const unusedMaterials = finishedProduct.packaging.map(
        (packaging: any) => ({
          code: packaging.code,
          requiredQuantity: packaging.quantity * quantity,
        })
      );

      // Return packaging materials to inventory
      const packagingToReturn = unusedMaterials.map(material => ({
        id: Number(material.code),
        quantity: material.requiredQuantity
      }));
      await this.inventoryService.returnPackagingMaterials(packagingToReturn);

      // Update material importances
      await this.updateMaterialImportance();

      // Record the inventory movement
      await this.recordProductionMovement(productCode, 'packaging');

      toast({
        title: "Success",
        description: "Production cancellation recorded successfully.",
      });
    } catch (error: any) {
      console.error("Error cancelling production:", error);
      toast({
        title: "Error",
        description: `Failed to cancel production: ${error.message}`,
        variant: "destructive",
      });
    }
  }

  /**
   * Updates the importance of raw materials based on their usage.
   * @returns {Promise<void>}
   */
  private async updateMaterialImportance(): Promise<void> {
    try {
      // Fetch all raw materials
      const { data: rawMaterials, error: rawMaterialsError } = await supabase
        .from("raw_materials")
        .select("*");

      if (rawMaterialsError) {
        throw new Error(
          `Failed to fetch raw materials: ${rawMaterialsError.message}`
        );
      }

      // Calculate the usage of each raw material
      const rawMaterialUsage = rawMaterials.map((material: RawMaterial) => ({
        code: material.code,
        usage: material.quantity,
      }));

      // Update the importance of each raw material
      for (const material of rawMaterialUsage) {
        const { data, error } = await supabase
          .from("raw_materials")
          .update({ importance: material.usage })
          .eq("code", material.code);

        if (error) {
          console.error(
            `Failed to update importance for raw material ${material.code}: ${error.message}`
          );
        }
      }
    } catch (error: any) {
      console.error("Error updating material importances:", error);
    }
  }

  /**
   * Records an inventory movement for a given item.
   * @param {string} itemCode - The code of the item.
   * @returns {Promise<void>}
   */
  private async recordInventoryMovement(itemCode: string): Promise<void> {
    try {
      // Fetch the item details
      const { data: item, error: itemError } = await supabase
        .from("semi_finished_products")
        .select("quantity")
        .eq("code", itemCode)
        .single();

      if (itemError) {
        throw new Error(`Failed to fetch item: ${itemError.message}`);
      }

      if (!item) {
        throw new Error("Item not found.");
      }

      // Record the inventory movement
      const { error: movementError } = await supabase.from("inventory_movements").insert([
        {
          item_code: itemCode,
          quantity: item.quantity,
          movement_type: "production",
        },
      ]);

      if (movementError) {
        throw new Error(
          `Failed to record inventory movement: ${movementError.message}`
        );
      }
    } catch (error: any) {
      console.error("Error recording inventory movement:", error);
    }
  }

  /**
   * Records a production movement for a given product.
   * @param {string} productCode - The code of the product.
   * @param {string} movementType - The type of movement (production or packaging).
   * @returns {Promise<void>}
   */
  private async recordProductionMovement(productCode: string, movementType: string): Promise<void> {
    try {
      // Fetch the product details
      const { data: product, error: productError } = await supabase
        .from("finished_products")
        .select("quantity")
        .eq("code", productCode)
        .single();

      if (productError) {
        throw new Error(`Failed to fetch product: ${productError.message}`);
      }

      if (!product) {
        throw new Error("Product not found.");
      }

      // Record the production movement
      const { error: movementError } = await supabase.from("production_movements").insert([
        {
          product_code: productCode,
          quantity: product.quantity,
          movement_type: movementType,
        },
      ]);

      if (movementError) {
        throw new Error(
          `Failed to record production movement: ${movementError.message}`
        );
      }
    } catch (error: any) {
      console.error("Error recording production movement:", error);
    }
  }
}

export default ProductionService;
