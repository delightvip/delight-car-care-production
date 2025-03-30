
import { supabase } from '@/integrations/supabase/client';

export interface InventoryMovement {
  id: number;
  type: 'in' | 'out';
  category: string;
  item_name: string;
  quantity: number;
  date: Date;
  note: string;
}

export async function fetchInventoryMovements(): Promise<InventoryMovement[]> {
  try {
    // Get raw materials changes
    const { data: rawMaterialsIn } = await supabase
      .from('production_order_ingredients')
      .select(`
        id,
        raw_material_name,
        required_quantity,
        production_order:production_orders(date, code)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get production orders (semi-finished products created)
    const { data: productionOrders } = await supabase
      .from('production_orders')
      .select('id, code, product_name, quantity, date')
      .order('date', { ascending: false })
      .limit(20);

    // Get packaging orders (finished products created)
    const { data: packagingOrders } = await supabase
      .from('packaging_orders')
      .select('id, code, product_name, quantity, date, semi_finished_name')
      .order('date', { ascending: false })
      .limit(20);

    // Transform the data into a unified format
    const movements: InventoryMovement[] = [];

    // Add raw materials consumption (out movements)
    if (rawMaterialsIn) {
      // Type casting for proper property access
      const typedRawMaterialsIn = rawMaterialsIn as unknown as Array<{
        id: number;
        raw_material_name: string;
        required_quantity: number;
        production_order: {
          date: string;
          code: string;
        };
      }>;
      
      for (const item of typedRawMaterialsIn) {
        if (item.production_order) {
          movements.push({
            id: item.id,
            type: 'out',
            category: 'raw_materials',
            item_name: item.raw_material_name,
            quantity: item.required_quantity,
            date: new Date(item.production_order.date),
            note: `استخدام في أمر إنتاج ${item.production_order.code}`
          });
        }
      }
    }

    // Add production orders (semi-finished products created - in movements)
    if (productionOrders) {
      for (const order of productionOrders) {
        movements.push({
          id: order.id,
          type: 'in',
          category: 'semi_finished',
          item_name: order.product_name,
          quantity: order.quantity,
          date: new Date(order.date),
          note: `إنتاج جديد - أمر رقم ${order.code}`
        });
      }
    }

    // Add packaging orders (semi-finished consumed - out movements & finished products created - in movements)
    if (packagingOrders) {
      for (const order of packagingOrders) {
        // Semi-finished consumed
        movements.push({
          id: order.id * 1000, // Creating unique ID
          type: 'out',
          category: 'semi_finished',
          item_name: order.semi_finished_name,
          quantity: order.quantity,
          date: new Date(order.date),
          note: `استخدام في أمر تعبئة ${order.code}`
        });

        // Finished product created
        movements.push({
          id: order.id * 1000 + 1, // Creating unique ID
          type: 'in',
          category: 'finished_products',
          item_name: order.product_name,
          quantity: order.quantity,
          date: new Date(order.date),
          note: `تعبئة منتج نهائي - أمر رقم ${order.code}`
        });
      }
    }

    // Sort all movements by date (newest first)
    return movements.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    console.error("Error fetching inventory movements:", error);
    return [];
  }
}

export function filterMovementsByCategory(movements: InventoryMovement[], category: string): InventoryMovement[] {
  if (category === 'all') return movements;
  return movements.filter(movement => movement.category === category);
}
