import { toast } from "sonner";
import InventoryService from "./InventoryService";
import { Database } from "@/integrations/supabase/types/supabase";
import { supabase } from "@/integrations/supabase/client";

type RawMaterial = Database['public']['Tables']['raw_materials']['Row'];
type SemiFinishedProduct = Database['public']['Tables']['semi_finished_products']['Row'];
type FinishedProduct = Database['public']['Tables']['finished_products']['Row'];
type PackagingMaterial = Database['public']['Tables']['packaging_materials']['Row'];

interface InventoryMovement {
  itemId: string;
  itemType: 'raw_material' | 'semi_finished' | 'finished' | 'packaging';
  quantity: number;
  movementType: 'addition' | 'consumption' | 'transfer' | 'adjustment';
  reason?: string;
  sourceLocation?: string;
  destinationLocation?: string;
  userId?: string;
}

class InventoryMovementService {
  private static instance: InventoryMovementService;
  private inventoryService: InventoryService;

  private constructor() {
    this.inventoryService = InventoryService.getInstance();
  }

  public static getInstance(): InventoryMovementService {
    if (!InventoryMovementService.instance) {
      InventoryMovementService.instance = new InventoryMovementService();
    }
    return InventoryMovementService.instance;
  }

  // Log an inventory movement
  async logInventoryMovement(movement: InventoryMovement): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert([
          {
            item_id: movement.itemId,
            item_type: movement.itemType,
            quantity: movement.quantity,
            movement_type: movement.movementType,
            reason: movement.reason,
            source_location: movement.sourceLocation,
            destination_location: movement.destinationLocation,
            user_id: movement.userId,
            movement_date: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.error('Error logging inventory movement:', error);
        toast.error('Failed to log inventory movement');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error logging inventory movement:', error);
      toast.error('Failed to log inventory movement');
      return false;
    }
  }

  // Get inventory movements for a specific item
  async getItemMovements(itemId: string, itemType: 'raw_material' | 'semi_finished' | 'finished' | 'packaging'): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('item_id', itemId)
        .eq('item_type', itemType)
        .order('movement_date', { ascending: false });

      if (error) {
        console.error('Error fetching item movements:', error);
        toast.error('Failed to fetch item movements');
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching item movements:', error);
      toast.error('Failed to fetch item movements');
      return [];
    }
  }

  // Get all inventory movements
  async getAllMovements(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .order('movement_date', { ascending: false });

      if (error) {
        console.error('Error fetching all movements:', error);
        toast.error('Failed to fetch all movements');
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching all movements:', error);
      toast.error('Failed to fetch all movements');
      return [];
    }
  }

  // Record the addition of raw materials to inventory
  async recordRawMaterialAddition(material: RawMaterial, quantity: number, reason?: string, userId?: string): Promise<boolean> {
    try {
      // Log the inventory movement
      await this.logInventoryMovement({
        itemId: material.code,
        itemType: 'raw_material',
        quantity: quantity,
        movementType: 'addition',
        reason: reason || 'Raw material addition',
        userId: userId,
      });

      // Update the raw material quantity in the inventory
      const updated = await this.inventoryService.updateRawMaterialQuantity(material.code, quantity);
      if (!updated) {
        toast.error(`Failed to update quantity for raw material: ${material.name}`);
        return false;
      }

      toast.success(`Added ${quantity} ${material.unit} of ${material.name} to inventory`);
      return true;
    } catch (error) {
      console.error('Error recording raw material addition:', error);
      toast.error('Failed to record raw material addition');
      return false;
    }
  }

  // Record the consumption of raw materials from inventory
  async recordRawMaterialConsumption(material: RawMaterial, quantity: number, reason?: string, userId?: string): Promise<boolean> {
    try {
      // Log the inventory movement
      await this.logInventoryMovement({
        itemId: material.code,
        itemType: 'raw_material',
        quantity: -quantity,
        movementType: 'consumption',
        reason: reason || 'Raw material consumption',
        userId: userId,
      });

      // Update the raw material quantity in the inventory
      const updated = await this.inventoryService.updateRawMaterialQuantity(material.code, -quantity);
      if (!updated) {
        toast.error(`Failed to update quantity for raw material: ${material.name}`);
        return false;
      }

      toast.success(`Consumed ${quantity} ${material.unit} of ${material.name} from inventory`);
      return true;
    } catch (error) {
      console.error('Error recording raw material consumption:', error);
      toast.error('Failed to record raw material consumption');
      return false;
    }
  }

  // Record the addition of semi-finished products to inventory
  async recordSemiFinishedProductAddition(product: SemiFinishedProduct, quantity: number, reason?: string, userId?: string): Promise<boolean> {
    try {
      // Log the inventory movement
      await this.logInventoryMovement({
        itemId: product.code,
        itemType: 'semi_finished',
        quantity: quantity,
        movementType: 'addition',
        reason: reason || 'Semi-finished product addition',
        userId: userId,
      });

      // Update the semi-finished product quantity in the inventory
      const updated = await this.inventoryService.updateSemiFinishedProductQuantity(product.code, quantity);
      if (!updated) {
        toast.error(`Failed to update quantity for semi-finished product: ${product.name}`);
        return false;
      }

      toast.success(`Added ${quantity} ${product.unit} of ${product.name} to inventory`);
      return true;
    } catch (error) {
      console.error('Error recording semi-finished product addition:', error);
      toast.error('Failed to record semi-finished product addition');
      return false;
    }
  }

  // Record the consumption of semi-finished products from inventory
  async recordSemiFinishedProductConsumption(product: SemiFinishedProduct, quantity: number, reason?: string, userId?: string): Promise<boolean> {
    try {
      // Log the inventory movement
      await this.logInventoryMovement({
        itemId: product.code,
        itemType: 'semi_finished',
        quantity: -quantity,
        movementType: 'consumption',
        reason: reason || 'Semi-finished product consumption',
        userId: userId,
      });

      // Update the semi-finished product quantity in the inventory
      const updated = await this.inventoryService.updateSemiFinishedProductQuantity(product.code, -quantity);
      if (!updated) {
        toast.error(`Failed to update quantity for semi-finished product: ${product.name}`);
        return false;
      }

      toast.success(`Consumed ${quantity} ${product.unit} of ${product.name} from inventory`);
      return true;
    } catch (error) {
      console.error('Error recording semi-finished product consumption:', error);
      toast.error('Failed to record semi-finished product consumption');
      return false;
    }
  }

  // Record the addition of finished products to inventory
  async recordFinishedProductAddition(product: FinishedProduct, quantity: number, reason?: string, userId?: string): Promise<boolean> {
    try {
      // Log the inventory movement
      await this.logInventoryMovement({
        itemId: product.code,
        itemType: 'finished',
        quantity: quantity,
        movementType: 'addition',
        reason: reason || 'Finished product addition',
        userId: userId,
      });

      // Update the finished product quantity in the inventory
      const updated = await this.inventoryService.updateFinishedProductQuantity(product.code, quantity);
      if (!updated) {
        toast.error(`Failed to update quantity for finished product: ${product.name}`);
        return false;
      }

      toast.success(`Added ${quantity} ${product.unit} of ${product.name} to inventory`);
      return true;
    } catch (error) {
      console.error('Error recording finished product addition:', error);
      toast.error('Failed to record finished product addition');
      return false;
    }
  }

  // Record the consumption of finished products from inventory (e.g., sales)
  async recordFinishedProductConsumption(product: FinishedProduct, quantity: number, reason?: string, invoiceReference?: string): Promise<boolean> {
    try {
      // Log the inventory movement
      await this.logInventoryMovement({
        itemId: product.code,
        itemType: 'finished',
        quantity: -quantity,
        movementType: 'consumption',
        reason: reason || `مبيعات: ${invoiceReference}`,
      });

      // Update the finished product quantity in the inventory
      const updated = await this.inventoryService.updateFinishedProductQuantity(product.code, -quantity);
      if (!updated) {
        toast.error(`Failed to update quantity for finished product: ${product.name}`);
        return false;
      }

      toast.success(`Sold ${quantity} ${product.unit} of ${product.name}`);
      return true;
    } catch (error) {
      console.error('Error recording finished product consumption:', error);
      toast.error('Failed to record finished product consumption');
      return false;
    }
  }

  // Record the addition of packaging materials to inventory
  async recordPackagingMaterialAddition(material: PackagingMaterial, quantity: number, reason?: string, userId?: string): Promise<boolean> {
    try {
      // Log the inventory movement
      await this.logInventoryMovement({
        itemId: material.code,
        itemType: 'packaging',
        quantity: quantity,
        movementType: 'addition',
        reason: reason || 'Packaging material addition',
        userId: userId,
      });

      // Update the packaging material quantity in the inventory
      const updated = await this.inventoryService.updatePackagingMaterialQuantity(material.code, quantity);
      if (!updated) {
        toast.error(`Failed to update quantity for packaging material: ${material.name}`);
        return false;
      }

      toast.success(`Added ${quantity} ${material.unit} of ${material.name} to inventory`);
      return true;
    } catch (error) {
      console.error('Error recording packaging material addition:', error);
      toast.error('Failed to record packaging material addition');
      return false;
    }
  }

  // Record the consumption of packaging materials from inventory
  async recordPackagingMaterialConsumption(material: PackagingMaterial, quantity: number, reason?: string, userId?: string): Promise<boolean> {
    try {
      // Log the inventory movement
      await this.logInventoryMovement({
        itemId: material.code,
        itemType: 'packaging',
        quantity: -quantity,
        movementType: 'consumption',
        reason: reason || 'Packaging material consumption',
        userId: userId,
      });

      // Update the packaging material quantity in the inventory
      const updated = await this.inventoryService.updatePackagingMaterialQuantity(material.code, -quantity);
      if (!updated) {
        toast.error(`Failed to update quantity for packaging material: ${material.name}`);
        return false;
      }

      toast.success(`Consumed ${quantity} ${material.unit} of ${material.name} from inventory`);
      return true;
    } catch (error) {
      console.error('Error recording packaging material consumption:', error);
      toast.error('Failed to record packaging material consumption');
      return false;
    }
  }

  async consumeStock(product: any, quantity: number, reason?: string, invoiceReference?: string): Promise<boolean> {
    try {
      if (!product) {
        toast.error('المنتج غير موجود');
        return false;
      }
      
      // Fix the method call to use logInventoryMovement instead of recordItemMovement
      await this.inventoryService.logInventoryMovement({
        itemId: product.code,
        itemType: product.type === 'raw' ? 'raw_material' : 
                 product.type === 'packaging' ? 'packaging' :
                 product.type === 'semi_finished' ? 'semi_finished' : 'finished',
        quantity: -quantity,
        movementType: 'consumption',
        reason: reason || `مبيعات: ${invoiceReference}`
      });
      
      // Depending on the product type, call the appropriate method to update the quantity
      let updated: boolean = false;
      switch (product.type) {
        case 'raw':
          updated = await this.inventoryService.updateRawMaterialQuantity(product.code, -quantity);
          break;
        case 'semi_finished':
          updated = await this.inventoryService.updateSemiFinishedProductQuantity(product.code, -quantity);
          break;
        case 'finished':
          updated = await this.inventoryService.updateFinishedProductQuantity(product.code, -quantity);
          break;
        case 'packaging':
          updated = await this.inventoryService.updatePackagingMaterialQuantity(product.code, -quantity);
          break;
        default:
          toast.error('نوع المنتج غير مدعوم');
          return false;
      }
      
      if (!updated) {
        toast.error(`فشل تحديث كمية المنتج: ${product.name}`);
        return false;
      }
      
      toast.success(`تم استهلاك ${quantity} ${product.unit} من ${product.name}`);
      return true;
    } catch (error) {
      console.error('خطأ في استهلاك المخزون:', error);
      toast.error('فشل في استهلاك المخزون');
      return false;
    }
  }
}

export default InventoryMovementService;
