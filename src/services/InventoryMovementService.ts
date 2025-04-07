
import { format, parseISO, subDays } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import InventoryMovementTrackerService, { InventoryItemType } from './InventoryMovementTrackerService';

// Define the shape of inventory movement data for UI
export interface InventoryMovementData {
  id: string;
  date: Date;
  type: 'in' | 'out' | 'adjustment' | string;
  category: string;
  item_name: string;
  item_id: string;
  quantity: number;
  note: string;
  balance: number;
  user: string | null;
}

// Define the query parameters for filtering movements
export interface InventoryMovementQuery {
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  category?: string;
  type?: 'in' | 'out' | 'adjustment';
  search?: string;
  limit?: number;
}

// Function to fetch inventory movements
export async function fetchInventoryMovements(
  query: InventoryMovementQuery = {}
): Promise<InventoryMovementData[]> {
  try {
    // Start with a base query to the inventory_movements table
    let supabaseQuery = supabase
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

    // Apply date filters if specified
    if (query.dateRange) {
      if (query.dateRange.from) {
        supabaseQuery = supabaseQuery.gte('created_at', query.dateRange.from.toISOString());
      }
      if (query.dateRange.to) {
        const nextDay = new Date(query.dateRange.to);
        nextDay.setDate(nextDay.getDate() + 1);
        supabaseQuery = supabaseQuery.lt('created_at', nextDay.toISOString());
      }
    }

    // Apply type filter
    if (query.type) {
      supabaseQuery = supabaseQuery.eq('movement_type', query.type);
    }

    // Apply category filter
    if (query.category && query.category !== 'all') {
      supabaseQuery = supabaseQuery.eq('item_type', query.category);
    }

    // Apply limit if specified
    if (query.limit) {
      supabaseQuery = supabaseQuery.limit(query.limit);
    }

    // Execute the query
    const { data, error } = await supabaseQuery;

    if (error) {
      throw error;
    }

    // Process and augment the raw movements data
    const movementsWithDetails = await Promise.all(
      (data || []).map(async (movement) => {
        // Get item details based on the item type
        const itemDetails = await getItemDetails(movement.item_id, movement.item_type);
        
        // Get user details
        let userName = null;
        if (movement.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', movement.user_id)
            .single();
          
          if (userData) {
            userName = userData.name;
          }
        }

        return {
          id: movement.id,
          date: new Date(movement.created_at),
          type: movement.movement_type as 'in' | 'out' | 'adjustment',
          category: movement.item_type,
          item_name: itemDetails?.name || 'Unknown Item',
          item_id: movement.item_id,
          quantity: Math.abs(movement.quantity),
          note: movement.reason || '',
          balance: movement.balance_after,
          user: userName
        };
      })
    );

    // Apply search filter (client-side since we need to search in item names)
    let filteredMovements = movementsWithDetails;
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredMovements = filteredMovements.filter(
        (movement) =>
          movement.item_name.toLowerCase().includes(searchLower) ||
          movement.note.toLowerCase().includes(searchLower)
      );
    }

    return filteredMovements;
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    toast.error('حدث خطأ أثناء تحميل بيانات حركة المخزون');
    return [];
  }
}

// Helper function to get item details
async function getItemDetails(itemId: string, itemType: string): Promise<{ name: string } | null> {
  try {
    let tableName: string;
    
    // Determine the correct table name based on the item type
    switch (itemType) {
      case 'raw':
        tableName = 'raw_materials';
        break;
      case 'semi':
        tableName = 'semi_finished_products';
        break;
      case 'packaging':
        tableName = 'packaging_materials';
        break;
      case 'finished':
        tableName = 'finished_products';
        break;
      default:
        return null;
    }

    // Use hardcoded table names for type safety with Supabase client
    let data;
    let error;
    
    if (tableName === 'raw_materials') {
      const result = await supabase
        .from('raw_materials')
        .select('name')
        .eq('id', parseInt(itemId))
        .single();
      data = result.data;
      error = result.error;
    } else if (tableName === 'semi_finished_products') {
      const result = await supabase
        .from('semi_finished_products')
        .select('name')
        .eq('id', parseInt(itemId))
        .single();
      data = result.data;
      error = result.error;
    } else if (tableName === 'packaging_materials') {
      const result = await supabase
        .from('packaging_materials')
        .select('name')
        .eq('id', parseInt(itemId))
        .single();
      data = result.data;
      error = result.error;
    } else if (tableName === 'finished_products') {
      const result = await supabase
        .from('finished_products')
        .select('name')
        .eq('id', parseInt(itemId))
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error(`Error fetching ${itemType} details:`, error);
      return null;
    }

    return data ? { name: data.name } : null;
  } catch (error) {
    console.error('Error in getItemDetails:', error);
    return null;
  }
}

// Function to filter movements by category
export function filterMovementsByCategory(
  movements: InventoryMovementData[],
  category: string
): InventoryMovementData[] {
  if (category === 'all') {
    return movements;
  }
  return movements.filter((movement) => movement.category === category);
}

// Function to record a new inventory movement manually
export async function recordManualInventoryMovement(
  itemId: string,
  itemType: string,
  quantity: number,
  reason: string
): Promise<boolean> {
  try {
    const movementTracker = InventoryMovementTrackerService.getInstance();
    
    // Convert itemType string to enum
    let itemTypeEnum: InventoryItemType;
    switch (itemType) {
      case 'raw':
        itemTypeEnum = InventoryItemType.RAW_MATERIAL;
        break;
      case 'semi':
        itemTypeEnum = InventoryItemType.SEMI_FINISHED;
        break;
      case 'packaging':
        itemTypeEnum = InventoryItemType.PACKAGING;
        break;
      case 'finished':
        itemTypeEnum = InventoryItemType.FINISHED_PRODUCT;
        break;
      default:
        throw new Error(`Invalid item type: ${itemType}`);
    }
    
    // Record the movement
    const result = await movementTracker.recordMovement({
      itemId,
      itemType: itemTypeEnum,
      quantity,
      reason
    });
    
    if (result) {
      // Update the item quantity in its respective table
      await updateItemQuantity(itemId, itemType, quantity);
    }
    
    return result;
  } catch (error) {
    console.error('Error recording manual inventory movement:', error);
    return false;
  }
}

// Helper function to update item quantity in its table
async function updateItemQuantity(
  itemId: string,
  itemType: string,
  quantityChange: number
): Promise<boolean> {
  try {
    // Use specific table names based on item type
    let currentItem;
    let fetchError;
    let updateError;
    
    // Get current quantity
    if (itemType === 'raw') {
      const result = await supabase
        .from('raw_materials')
        .select('quantity')
        .eq('id', parseInt(itemId))
        .single();
      currentItem = result.data;
      fetchError = result.error;
        
      if (fetchError) {
        console.error(`Error fetching current quantity for raw materials:`, fetchError);
        return false;
      }
      
      // Calculate new quantity
      const newQuantity = (currentItem?.quantity || 0) + quantityChange;
      
      // Update the quantity
      const updateResult = await supabase
        .from('raw_materials')
        .update({ quantity: newQuantity })
        .eq('id', parseInt(itemId));
      
      updateError = updateResult.error;
    } 
    else if (itemType === 'semi') {
      const result = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('id', parseInt(itemId))
        .single();
      currentItem = result.data;
      fetchError = result.error;
        
      if (fetchError) {
        console.error(`Error fetching current quantity for semi finished products:`, fetchError);
        return false;
      }
      
      // Calculate new quantity
      const newQuantity = (currentItem?.quantity || 0) + quantityChange;
      
      // Update the quantity
      const updateResult = await supabase
        .from('semi_finished_products')
        .update({ quantity: newQuantity })
        .eq('id', parseInt(itemId));
      
      updateError = updateResult.error;
    }
    else if (itemType === 'packaging') {
      const result = await supabase
        .from('packaging_materials')
        .select('quantity')
        .eq('id', parseInt(itemId))
        .single();
      currentItem = result.data;
      fetchError = result.error;
        
      if (fetchError) {
        console.error(`Error fetching current quantity for packaging materials:`, fetchError);
        return false;
      }
      
      // Calculate new quantity
      const newQuantity = (currentItem?.quantity || 0) + quantityChange;
      
      // Update the quantity
      const updateResult = await supabase
        .from('packaging_materials')
        .update({ quantity: newQuantity })
        .eq('id', parseInt(itemId));
      
      updateError = updateResult.error;
    }
    else if (itemType === 'finished') {
      const result = await supabase
        .from('finished_products')
        .select('quantity')
        .eq('id', parseInt(itemId))
        .single();
      currentItem = result.data;
      fetchError = result.error;
        
      if (fetchError) {
        console.error(`Error fetching current quantity for finished products:`, fetchError);
        return false;
      }
      
      // Calculate new quantity
      const newQuantity = (currentItem?.quantity || 0) + quantityChange;
      
      // Update the quantity
      const updateResult = await supabase
        .from('finished_products')
        .update({ quantity: newQuantity })
        .eq('id', parseInt(itemId));
      
      updateError = updateResult.error;
    }
    
    if (updateError) {
      console.error(`Error updating quantity for ${itemType}:`, updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateItemQuantity:', error);
    return false;
  }
}
