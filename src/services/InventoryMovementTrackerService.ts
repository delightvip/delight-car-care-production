
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InventoryMovement } from "@/types/inventoryTypes";

export enum InventoryItemType {
  RAW_MATERIAL = 'raw',
  SEMI_FINISHED = 'semi',
  PACKAGING = 'packaging',
  FINISHED_PRODUCT = 'finished'
}

export enum MovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment'
}

export interface InventoryMovementRecord {
  itemId: string;
  itemType: InventoryItemType;
  quantity: number; // Positive for IN, negative for OUT
  reason?: string;
  userId?: string;
}

class InventoryMovementTrackerService {
  private static instance: InventoryMovementTrackerService;

  private constructor() {}

  public static getInstance(): InventoryMovementTrackerService {
    if (!InventoryMovementTrackerService.instance) {
      InventoryMovementTrackerService.instance = new InventoryMovementTrackerService();
    }
    return InventoryMovementTrackerService.instance;
  }

  /**
   * Records a movement in the inventory_movements table
   */
  public async recordMovement(movement: InventoryMovementRecord): Promise<boolean> {
    try {
      // Get current balance for the item
      const currentBalance = await this.getCurrentItemBalance(
        movement.itemId,
        movement.itemType
      );

      if (currentBalance === null) {
        toast.error('لم يتم العثور على العنصر المحدد');
        return false;
      }

      // Calculate the new balance
      const newBalance = currentBalance + movement.quantity;

      // Determine movement type
      const movementType = movement.quantity > 0 
        ? MovementType.IN 
        : (movement.quantity < 0 ? MovementType.OUT : MovementType.ADJUSTMENT);

      // Insert the movement record
      const { error } = await supabase.from('inventory_movements').insert({
        item_id: movement.itemId,
        item_type: movement.itemType,
        movement_type: movementType,
        quantity: movement.quantity,
        balance_after: newBalance,
        reason: movement.reason || null,
        user_id: movement.userId || null
      });

      if (error) {
        console.error('Error recording inventory movement:', error);
        throw error;
      }

      // Return success
      return true;
    } catch (error) {
      console.error('Error in recordMovement:', error);
      return false;
    }
  }

  /**
   * Records a raw material movement in inventory
   */
  public async recordRawMaterialMovement(
    materialId: string | number, 
    quantity: number, 
    reason?: string
  ): Promise<boolean> {
    return this.recordMovement({
      itemId: materialId.toString(),
      itemType: InventoryItemType.RAW_MATERIAL,
      quantity,
      reason
    });
  }

  /**
   * Records a semi-finished product movement in inventory
   */
  public async recordSemiFinishedMovement(
    productId: string | number, 
    quantity: number, 
    reason?: string
  ): Promise<boolean> {
    return this.recordMovement({
      itemId: productId.toString(),
      itemType: InventoryItemType.SEMI_FINISHED,
      quantity,
      reason
    });
  }

  /**
   * Records a packaging material movement in inventory
   */
  public async recordPackagingMovement(
    materialId: string | number, 
    quantity: number, 
    reason?: string
  ): Promise<boolean> {
    return this.recordMovement({
      itemId: materialId.toString(),
      itemType: InventoryItemType.PACKAGING,
      quantity,
      reason
    });
  }

  /**
   * Records a finished product movement in inventory
   */
  public async recordFinishedProductMovement(
    productId: string | number, 
    quantity: number, 
    reason?: string
  ): Promise<boolean> {
    return this.recordMovement({
      itemId: productId.toString(),
      itemType: InventoryItemType.FINISHED_PRODUCT,
      quantity,
      reason
    });
  }

  /**
   * Gets the current balance for an item from its respective table
   */
  private async getCurrentItemBalance(
    itemId: string, 
    itemType: InventoryItemType
  ): Promise<number | null> {
    try {
      let currentQuantity: number | null = null;
      
      // Get the quantity from the specific table based on item type
      if (itemType === InventoryItemType.RAW_MATERIAL) {
        const { data, error } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('id', parseInt(itemId))
          .single();
        
        if (error) {
          console.error(`Error fetching current balance for raw materials with ID ${itemId}:`, error);
          return null;
        }
        
        currentQuantity = data?.quantity || 0;
      } 
      else if (itemType === InventoryItemType.SEMI_FINISHED) {
        const { data, error } = await supabase
          .from('semi_finished_products')
          .select('quantity')
          .eq('id', parseInt(itemId))
          .single();
        
        if (error) {
          console.error(`Error fetching current balance for semi finished products with ID ${itemId}:`, error);
          return null;
        }
        
        currentQuantity = data?.quantity || 0;
      }
      else if (itemType === InventoryItemType.PACKAGING) {
        const { data, error } = await supabase
          .from('packaging_materials')
          .select('quantity')
          .eq('id', parseInt(itemId))
          .single();
        
        if (error) {
          console.error(`Error fetching current balance for packaging materials with ID ${itemId}:`, error);
          return null;
        }
        
        currentQuantity = data?.quantity || 0;
      }
      else if (itemType === InventoryItemType.FINISHED_PRODUCT) {
        const { data, error } = await supabase
          .from('finished_products')
          .select('quantity')
          .eq('id', parseInt(itemId))
          .single();
        
        if (error) {
          console.error(`Error fetching current balance for finished products with ID ${itemId}:`, error);
          return null;
        }
        
        currentQuantity = data?.quantity || 0;
      }

      return currentQuantity;
    } catch (error) {
      console.error('Error in getCurrentItemBalance:', error);
      return null;
    }
  }

  /**
   * Gets all inventory movements from the database
   */
  public async getAllMovements(): Promise<InventoryMovement[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          id,
          item_id,
          item_type,
          movement_type,
          quantity,
          balance_after,
          reason,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching inventory movements:', error);
        throw error;
      }

      // Get user names separately to avoid type issues
      const movements = await Promise.all((data || []).map(async (item) => {
        let userName = null;
        
        if (item.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', item.user_id)
            .single();
            
          if (userData) {
            userName = userData.name;
          }
        }
        
        return {
          id: item.id,
          item_id: item.item_id,
          item_type: item.item_type,
          movement_type: item.movement_type,
          quantity: item.quantity,
          balance_after: item.balance_after,
          reason: item.reason,
          created_at: item.created_at,
          user_id: item.user_id,
          user_name: userName
        } as InventoryMovement;
      }));

      return movements;
    } catch (error) {
      console.error('Error in getAllMovements:', error);
      return [];
    }
  }

  /**
   * Gets movements for a specific item
   */
  public async getMovementsForItem(
    itemId: string,
    itemType: InventoryItemType
  ): Promise<InventoryMovement[]> {
    try {
      const { data, error } = await supabase.rpc('get_inventory_movements_by_item', {
        p_item_id: itemId,
        p_item_type: itemType
      });

      if (error) {
        console.error('Error fetching item movements:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        item_id: item.item_id,
        item_type: item.item_type,
        movement_type: item.movement_type,
        quantity: item.quantity,
        balance_after: item.balance_after,
        reason: item.reason,
        created_at: item.created_at,
        user_name: item.user_name
      })) as InventoryMovement[];
    } catch (error) {
      console.error('Error in getMovementsForItem:', error);
      return [];
    }
  }
}

export default InventoryMovementTrackerService;
