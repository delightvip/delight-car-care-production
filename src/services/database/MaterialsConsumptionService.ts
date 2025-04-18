import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface MaterialConsumptionRecord {
  materialId: string;
  materialCode: string;
  materialName: string;
  category: 'raw-material' | 'packaging';
  month: string; // yyyy-MM
  consumptionQty: number;
}

/**
 * Service to aggregate monthly material consumption from production and packaging orders.
 */
export class MaterialsConsumptionService {
  /**
   * Get historical monthly consumption for all materials (raw & packaging) for the last N months.
   * Returns array of { materialId, month, consumptionQty }
   */
  static async getHistoricalConsumption(monthsBack: number = 6): Promise<MaterialConsumptionRecord[]> {
    // Calculate the start/end months
    const now = new Date();
    const months: string[] = [];
    for (let i = monthsBack; i >= 0; i--) {
      months.push(format(new Date(now.getFullYear(), now.getMonth() - i, 1), 'yyyy-MM'));
    }
    // 1. Aggregate raw material consumption from production orders
    const { data: prodIngredients, error: prodError } = await supabase
      .from('production_order_ingredients')
      .select('raw_material_code, raw_material_name, required_quantity, production_order_id, created_at');
    if (prodError) throw prodError;
    const { data: prodOrders, error: prodOrdersError } = await supabase
      .from('production_orders')
      .select('id, date, status');
    if (prodOrdersError) throw prodOrdersError;
    // 2. Aggregate packaging material consumption from packaging orders
    const { data: packagingMaterials, error: pkgError } = await supabase
      .from('packaging_order_materials')
      .select('packaging_material_code, packaging_material_name, required_quantity, packaging_order_id, created_at');
    if (pkgError) throw pkgError;
    const { data: packagingOrders, error: pkgOrdersError } = await supabase
      .from('packaging_orders')
      .select('id, date, status');
    if (pkgOrdersError) throw pkgOrdersError;
    // Helper: Build a map of orderId => {date, status}
    const prodOrderMap = Object.fromEntries((prodOrders || []).map(o => [o.id, o]));
    const pkgOrderMap = Object.fromEntries((packagingOrders || []).map(o => [o.id, o]));
    // 3. Build consumption records (raw)
    const rawRecords: MaterialConsumptionRecord[] = (prodIngredients || []).map(ing => {
      const order = prodOrderMap[ing.production_order_id];
      const month = order ? format(new Date(order.date), 'yyyy-MM') : format(new Date(ing.created_at), 'yyyy-MM');
      return {
        materialId: ing.raw_material_code,
        materialCode: ing.raw_material_code,
        materialName: ing.raw_material_name,
        category: 'raw-material',
        month,
        consumptionQty: ing.required_quantity
      };
    });
    // 4. Build consumption records (packaging)
    const packagingRecords: MaterialConsumptionRecord[] = (packagingMaterials || []).map(mat => {
      const order = pkgOrderMap[mat.packaging_order_id];
      const month = order ? format(new Date(order.date), 'yyyy-MM') : format(new Date(mat.created_at), 'yyyy-MM');
      return {
        materialId: mat.packaging_material_code,
        materialCode: mat.packaging_material_code,
        materialName: mat.packaging_material_name,
        category: 'packaging',
        month,
        consumptionQty: mat.required_quantity
      };
    });
    // 5. Aggregate by materialId + month
    const allRecords = [...rawRecords, ...packagingRecords];
    // Group by materialId + month
    const grouped: { [key: string]: MaterialConsumptionRecord } = {};
    allRecords.forEach(rec => {
      const key = rec.materialId + '_' + rec.month;
      if (!grouped[key]) {
        grouped[key] = { ...rec };
      } else {
        grouped[key].consumptionQty += rec.consumptionQty;
      }
    });
    // Filter to only last N months
    return Object.values(grouped).filter(rec => months.includes(rec.month));
  }

  /**
   * Get summary stats for material consumption (total consumed raw & packaging materials)
   */
  static async getSummaryStats(): Promise<{ totalRawConsumed: number; totalPackagingConsumed: number }> {
    // Get all consumption records
    const records = await this.getHistoricalConsumption(12);
    // Sum up by category
    const totalRawConsumed = records
      .filter(r => r.category === 'raw-material')
      .reduce((sum, r) => sum + (r.consumptionQty || 0), 0);
    const totalPackagingConsumed = records
      .filter(r => r.category === 'packaging')
      .reduce((sum, r) => sum + (r.consumptionQty || 0), 0);
    return { totalRawConsumed, totalPackagingConsumed };
  }
}

export default MaterialsConsumptionService;
