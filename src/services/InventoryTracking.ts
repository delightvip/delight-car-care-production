
import { supabase } from '@/integrations/supabase/client';
import { InventoryMovement } from '@/types/inventoryTypes';
import { format, subDays } from 'date-fns';

// Interface for movement filtering
export interface MovementFilter {
  itemType?: string;
  movementType?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  searchTerm?: string;
}

/**
 * Fetches all inventory movements from the database
 */
export async function fetchAllInventoryMovements(): Promise<InventoryMovement[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data as InventoryMovement[];
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    return [];
  }
}

/**
 * Fetches inventory movements with filtering
 */
export async function fetchFilteredInventoryMovements(filter: MovementFilter): Promise<InventoryMovement[]> {
  try {
    let query = supabase
      .from('inventory_movements')
      .select('*');
    
    // Apply filters
    if (filter.itemType && filter.itemType !== 'all') {
      query = query.eq('item_type', filter.itemType);
    }
    
    if (filter.movementType && filter.movementType !== 'all') {
      query = query.eq('movement_type', filter.movementType);
    }
    
    if (filter.dateRange?.from) {
      query = query.gte('created_at', filter.dateRange.from.toISOString());
    }
    
    if (filter.dateRange?.to) {
      // Add one day to include the end date fully
      const endDate = new Date(filter.dateRange.to);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Apply text search filter in memory (since Supabase might not have full-text search on these columns)
    let filteredData = data as InventoryMovement[];
    
    if (filter.searchTerm && filter.searchTerm.trim() !== '') {
      const searchTerm = filter.searchTerm.toLowerCase().trim();
      filteredData = filteredData.filter(movement => {
        return (
          (movement.item_id && movement.item_id.toString().toLowerCase().includes(searchTerm)) ||
          (movement.reason && movement.reason.toLowerCase().includes(searchTerm))
        );
      });
    }
    
    return filteredData;
  } catch (error) {
    console.error('Error fetching filtered inventory movements:', error);
    return [];
  }
}

/**
 * Fetches recent inventory movements for the last N days
 */
export async function fetchRecentInventoryMovements(days: number = 7): Promise<InventoryMovement[]> {
  try {
    const startDate = subDays(new Date(), days);
    
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data as InventoryMovement[];
  } catch (error) {
    console.error('Error fetching recent inventory movements:', error);
    return [];
  }
}

/**
 * Fetches inventory movements statistics
 */
export async function fetchInventoryMovementStats(filter: MovementFilter = {}): Promise<{
  totalMovements: number;
  inMovements: number;
  outMovements: number;
  inQuantity: number;
  outQuantity: number;
}> {
  try {
    const movements = await fetchFilteredInventoryMovements(filter);
    
    const inMovements = movements.filter(m => m.movement_type === 'in' || m.quantity > 0);
    const outMovements = movements.filter(m => m.movement_type === 'out' || m.quantity < 0);
    
    const inQuantity = inMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const outQuantity = outMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    
    return {
      totalMovements: movements.length,
      inMovements: inMovements.length,
      outMovements: outMovements.length,
      inQuantity,
      outQuantity
    };
  } catch (error) {
    console.error('Error fetching inventory movement statistics:', error);
    return {
      totalMovements: 0,
      inMovements: 0,
      outMovements: 0,
      inQuantity: 0,
      outQuantity: 0
    };
  }
}

/**
 * Records an inventory movement to the database
 */
export async function recordInventoryMovement(movement: {
  itemId: string;
  itemType: string;
  movementType: 'in' | 'out' | 'adjustment';
  quantity: number;
  balanceAfter: number;
  reason?: string;
  userId?: string;
}): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert({
        item_id: movement.itemId,
        item_type: movement.itemType,
        movement_type: movement.movementType,
        quantity: movement.movementType === 'out' ? -Math.abs(movement.quantity) : Math.abs(movement.quantity),
        balance_after: movement.balanceAfter,
        reason: movement.reason,
        user_id: movement.userId
      });
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error recording inventory movement:', error);
    return false;
  }
}

/**
 * Export inventory movements to CSV
 */
export function exportInventoryMovementsToCSV(movements: InventoryMovement[]): void {
  try {
    const headers = ['رقم المعرف', 'الصنف', 'النوع', 'نوع الحركة', 'الكمية', 'الرصيد بعد', 'السبب', 'التاريخ', 'بواسطة'];
    
    const csvData = movements.map(movement => [
      movement.id,
      movement.item_id,
      movement.item_type,
      movement.movement_type,
      movement.quantity,
      movement.balance_after,
      movement.reason || '',
      format(new Date(movement.created_at), 'yyyy/MM/dd HH:mm:ss'),
      movement.user_name || 'النظام'
    ]);
    
    // Create CSV content
    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `حركات-المخزون-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting inventory movements to CSV:', error);
  }
}
