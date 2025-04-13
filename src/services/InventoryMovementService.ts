
import { toast } from "sonner";
import InventoryService from "./InventoryService";
import { supabase } from "@/integrations/supabase/client";

// Define missing interfaces
export interface InventoryMovement {
  id?: string;
  item_id: string;
  item_type: 'raw_material' | 'semi_finished' | 'finished' | 'packaging';
  quantity: number;
  movement_type: 'addition' | 'consumption' | 'transfer' | 'adjustment';
  reason?: string;
  source_location?: string;
  destination_location?: string;
  userId?: string;
  balance_after?: number;
  created_at?: string;
  date?: Date | string;
  user_name?: string;
  category?: string;
  note?: string;
  item_name?: string;
  type?: 'in' | 'out';
}

export interface InventoryMovementQuery {
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  category?: string;
  type?: string;
}

// Interface for manual movement creation
export interface ManualMovementData {
  type: 'in' | 'out';
  category: string;
  item_name: string;
  item_id: number;
  quantity: number;
  unit: string;
  note: string;
  date: Date;
}

// Interface for database types
export interface RawMaterial {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  category?: string;
  supplier?: string;
}

export interface SemiFinishedProduct {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
}

export interface FinishedProduct {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
}

export interface PackagingMaterial {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
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
        .insert({
          item_id: movement.item_id,
          item_type: movement.item_type,
          quantity: movement.quantity,
          movement_type: movement.movement_type,
          reason: movement.reason,
          source_location: movement.source_location,
          destination_location: movement.destination_location,
          user_id: movement.userId,
          balance_after: movement.balance_after || 0 // Add required balance_after
        });

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

  // Create a manual inventory movement - used by the UI
  async createManualInventoryMovement(movement: ManualMovementData): Promise<boolean> {
    try {
      // Format the movement to match our interface
      const movementType = movement.type === 'in' ? 'addition' : 'consumption';
      const formattedMovement: InventoryMovement = {
        item_id: movement.item_id.toString(),
        item_type: this.mapCategoryToItemType(movement.category),
        quantity: movement.type === 'in' ? Math.abs(movement.quantity) : -Math.abs(movement.quantity),
        movement_type: movementType as 'addition' | 'consumption',
        reason: movement.note
      };
      
      // Log the movement
      const success = await this.logInventoryMovement(formattedMovement);
      
      // Update the item quantity in inventory
      if (success) {
        // Use update methods from InventoryService
        const update = await this.updateItemQuantity(
          movement.item_id.toString(),
          this.mapCategoryToItemType(movement.category),
          formattedMovement.quantity
        );
        
        if (!update) {
          toast.error('Failed to update inventory quantity');
          return false;
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error creating manual inventory movement:', error);
      toast.error('Failed to create inventory movement');
      return false;
    }
  }

  // Map category to item_type
  private mapCategoryToItemType(category: string): 'raw_material' | 'semi_finished' | 'finished' | 'packaging' {
    switch (category) {
      case 'raw_materials':
        return 'raw_material';
      case 'semi_finished':
        return 'semi_finished';
      case 'finished_products':
        return 'finished';
      case 'packaging':
        return 'packaging';
      default:
        return 'raw_material'; // Default fallback
    }
  }

  // Helper method to update quantities based on item type
  private async updateItemQuantity(itemId: string, itemType: string, quantity: number): Promise<boolean> {
    const numericItemId = parseInt(itemId);
    
    switch (itemType) {
      case 'raw_material':
        return await this.inventoryService.updateRawMaterial(numericItemId, { quantity });
      case 'semi_finished':
        return await this.inventoryService.updateSemiFinishedProduct(numericItemId, { quantity });
      case 'finished':
        return await this.inventoryService.updateFinishedProduct(numericItemId, { quantity });
      case 'packaging':
        return await this.inventoryService.updatePackagingMaterial(numericItemId, { quantity });
      default:
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

  // Get all inventory movements - used by InventoryTracking.tsx
  async fetchInventoryMovements(query?: InventoryMovementQuery): Promise<InventoryMovement[]> {
    try {
      // Simple implementation for now - can be expanded with query filters
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching movements:', error);
        toast.error('فشل في تحميل حركات المخزون');
        return [];
      }

      // Transform to match expected format by components
      const movements = data.map(item => {
        const movement: InventoryMovement = {
          id: item.id,
          item_id: item.item_id,
          item_type: item.item_type as 'raw_material' | 'semi_finished' | 'finished' | 'packaging',
          quantity: item.quantity,
          movement_type: item.movement_type as 'addition' | 'consumption' | 'transfer' | 'adjustment',
          reason: item.reason,
          balance_after: item.balance_after,
          date: new Date(item.created_at),
          category: item.item_type,
          type: item.quantity > 0 ? 'in' : 'out',
          note: item.reason || '',
          item_name: 'Unknown item' // Default value as item_name isn't in the database
        };
        return movement;
      });

      return movements;
    } catch (error) {
      console.error('Error fetching movements:', error);
      toast.error('فشل في تحميل حركات المخزون');
      return [];
    }
  }

  // Helper method for filtering movements
  filterMovementsByCategory(movements: InventoryMovement[], category: string): InventoryMovement[] {
    if (category === 'all') return movements;
    return movements.filter(m => m.category === category);
  }

  // Record the consumption of stock for any inventory item type
  async consumeStock(product: any, quantity: number, reason?: string, invoiceReference?: string): Promise<boolean> {
    try {
      if (!product) {
        toast.error('المنتج غير موجود');
        return false;
      }
      
      // Create movement record
      const movement: InventoryMovement = {
        item_id: product.code,
        item_type: product.type === 'raw' ? 'raw_material' : 
                 product.type === 'packaging' ? 'packaging' :
                 product.type === 'semi_finished' ? 'semi_finished' : 'finished',
        quantity: -quantity,
        movement_type: 'consumption',
        reason: reason || `مبيعات: ${invoiceReference}`
      };
      
      // Log the inventory movement
      await this.logInventoryMovement(movement);
      
      // Update the quantity using our internal method
      let updated = await this.updateItemQuantity(
        product.code, 
        movement.item_type, 
        -quantity
      );
      
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
