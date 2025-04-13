
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InventoryMovement, ItemType, ManualMovementInput } from '@/types/inventoryTypes';
import { format, parseISO, subDays } from 'date-fns';

// Types for the inventory movement queries
export interface InventoryMovementQuery {
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  category?: string;
  type?: 'in' | 'out' | 'adjustment' | 'all';
  search?: string;
}

class InventoryMovementService {
  private static instance: InventoryMovementService;

  private constructor() {}

  public static getInstance(): InventoryMovementService {
    if (!InventoryMovementService.instance) {
      InventoryMovementService.instance = new InventoryMovementService();
    }
    return InventoryMovementService.instance;
  }

  // تسجيل حركة مخزون جديدة
  public async recordMovement(
    itemId: string, 
    itemType: ItemType, 
    movementType: 'in' | 'out' | 'adjustment', 
    quantity: number, 
    reason?: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // التحقق من وجود عنصر بهذا المعرف
      const currentQuantity = await this.getCurrentQuantity(itemId, itemType);
      if (currentQuantity === null) {
        toast.error('العنصر غير موجود');
        return false;
      }

      // حساب الكمية بعد الحركة
      let balanceAfter = currentQuantity;
      
      // إذا كانت إضافة، نقوم بإضافة الكمية (الأرقام موجبة)
      // إذا كانت إزالة، نقوم بطرح الكمية (الأرقام سالبة)
      // لكن نتأكد أن الكمية النهائية المخزنة في حركة المخزون دائمًا موجبة
      let movementQuantity = quantity;
      if (movementType === 'out') {
        movementQuantity = -Math.abs(quantity); // تأكد من أن الكمية سالبة
        balanceAfter += movementQuantity;
      } else if (movementType === 'in') {
        movementQuantity = Math.abs(quantity); // تأكد من أن الكمية موجبة
        balanceAfter += movementQuantity;
      } else if (movementType === 'adjustment') {
        // التسوية: الكمية هي الفرق بين الكمية الحالية والكمية المطلوبة
        movementQuantity = quantity - currentQuantity;
        balanceAfter = quantity;
      }

      // منع الكميات السالبة في المخزون إلا إذا كانت حركة تسوية
      if (balanceAfter < 0 && movementType !== 'adjustment') {
        toast.error('لا يمكن أن تكون كمية المخزون أقل من صفر');
        return false;
      }

      // إضافة سجل حركة مخزون جديد
      const { error } = await supabase.from('inventory_movements').insert({
        item_id: String(itemId),
        item_type: itemType,
        movement_type: movementType,
        quantity: movementQuantity,
        balance_after: balanceAfter,
        reason,
        user_id: userId
      });

      if (error) {
        console.error('Error recording movement:', error);
        throw error;
      }

      // تحديث كمية العنصر في الجدول المناسب
      await this.updateItemQuantity(itemId, itemType, balanceAfter);

      return true;
    } catch (error) {
      console.error('Error in recordMovement:', error);
      toast.error('حدث خطأ أثناء تسجيل حركة المخزون');
      return false;
    }
  }

  // الحصول على الكمية الحالية لعنصر
  private async getCurrentQuantity(itemId: string, itemType: ItemType): Promise<number | null> {
    try {
      // Using direct queries instead of RPC
      let tableName = '';
      
      switch (itemType) {
        case 'raw':
          tableName = 'raw_materials';
          break;
        case 'packaging':
          tableName = 'packaging_materials';
          break;
        case 'semi':
          tableName = 'semi_finished_products';
          break;
        case 'finished':
          tableName = 'finished_products';
          break;
        default:
          throw new Error('Invalid item type');
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('quantity')
        .eq('id', parseInt(itemId, 10))
        .single();

      if (error) {
        console.error('Error getting current quantity:', error);
        return null;
      }

      return data?.quantity || 0;
    } catch (error) {
      console.error('Error in getCurrentQuantity:', error);
      return null;
    }
  }

  // تحديث كمية العنصر في الجدول المناسب
  private async updateItemQuantity(itemId: string, itemType: ItemType, newQuantity: number): Promise<boolean> {
    try {
      // Using direct queries instead of RPC
      let tableName = '';
      
      switch (itemType) {
        case 'raw':
          tableName = 'raw_materials';
          break;
        case 'packaging':
          tableName = 'packaging_materials';
          break;
        case 'semi':
          tableName = 'semi_finished_products';
          break;
        case 'finished':
          tableName = 'finished_products';
          break;
        default:
          throw new Error('Invalid item type');
      }

      const { error } = await supabase
        .from(tableName)
        .update({ quantity: newQuantity })
        .eq('id', parseInt(itemId, 10));

      if (error) {
        console.error('Error updating item quantity:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateItemQuantity:', error);
      return false;
    }
  }

  // الحصول على حركات المخزون لعنصر معين
  public async getMovementsForItem(itemId: string, itemType: string): Promise<InventoryMovement[]> {
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
          users:user_id (name)
        `)
        .eq('item_id', String(itemId))
        .eq('item_type', itemType)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching inventory movements:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        item_id: item.item_id,
        item_type: item.item_type,
        movement_type: item.movement_type as 'in' | 'out' | 'adjustment',
        quantity: item.quantity,
        balance_after: item.balance_after,
        reason: item.reason,
        created_at: item.created_at,
        user_name: item.users?.name,
        // Add alias for compatibility
        type: item.movement_type as 'in' | 'out' | 'adjustment'
      }));
    } catch (error) {
      console.error('Error in getMovementsForItem:', error);
      return [];
    }
  }

  // الحصول على حركات المخزون للمواد الخام
  public async getRawMaterialsMovements(): Promise<InventoryMovement[]> {
    return this.getAllMovementsByType('raw', 'المواد الأولية');
  }

  // الحصول على حركات المخزون لمواد التعبئة
  public async getPackagingMaterialsMovements(): Promise<InventoryMovement[]> {
    return this.getAllMovementsByType('packaging', 'مواد التعبئة');
  }

  // الحصول على حركات المخزون للمنتجات نصف المصنعة
  public async getSemiFinishedMovements(): Promise<InventoryMovement[]> {
    return this.getAllMovementsByType('semi', 'منتجات نصف مصنعة');
  }

  // الحصول على حركات المخزون للمنتجات النهائية
  public async getFinishedProductsMovements(): Promise<InventoryMovement[]> {
    return this.getAllMovementsByType('finished', 'منتجات نهائية');
  }

  // الحصول على جميع حركات المخزون لنوع معين
  private async getAllMovementsByType(type: ItemType, categoryName: string): Promise<InventoryMovement[]> {
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
          users:user_id (name)
        `)
        .eq('item_type', type);

      if (error) {
        console.error(`Error fetching ${type} movements:`, error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        item_id: item.item_id,
        item_type: item.item_type,
        movement_type: item.movement_type as 'in' | 'out' | 'adjustment',
        quantity: item.quantity,
        balance_after: item.balance_after,
        reason: item.reason,
        created_at: item.created_at,
        user_name: item.users?.name || null,
        category: categoryName,
        type: item.movement_type as 'in' | 'out' | 'adjustment'
      }));
    } catch (error) {
      console.error(`Error in get${type}Movements:`, error);
      return [];
    }
  }

  // الحصول على جميع حركات المخزون
  public async getAllMovements(): Promise<InventoryMovement[]> {
    try {
      const rawMaterials = await this.getRawMaterialsMovements();
      const packagingMaterials = await this.getPackagingMaterialsMovements();
      const semiFinished = await this.getSemiFinishedMovements();
      const finishedProducts = await this.getFinishedProductsMovements();

      // دمج جميع الحركات وترتيبها حسب التاريخ
      const allMovements = [
        ...rawMaterials,
        ...packagingMaterials,
        ...semiFinished,
        ...finishedProducts
      ].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return allMovements;
    } catch (error) {
      console.error('Error in getAllMovements:', error);
      return [];
    }
  }

  // إضافة حركة مخزون للمنتج النهائي بناءً على أمر تعبئة
  public async addFinishedProductFromPackagingOrder(
    productId: string, 
    productQuantity: number, 
    semiFinishedId: string,
    semiFinishedQuantity: number,
    orderCode: string,
    userId?: string
  ): Promise<boolean> {
    try {
      // تسجيل حركة مخزون للمنتج النهائي (إضافة)
      const addFinishedSuccess = await this.recordMovement(
        productId, 
        'finished', 
        'in', 
        productQuantity, 
        `إنتاج من أمر تعبئة: ${orderCode}`,
        userId
      );
      
      if (!addFinishedSuccess) {
        return false;
      }
      
      // تسجيل حركة مخزون للمنتج النصف المصنع (إزالة)
      // استخدام الكمية الإجمالية: كمية المنتج النصف المصنع × كمية المنتج النهائي
      const totalSemiFinishedQuantity = semiFinishedQuantity * productQuantity;
      
      const consumeSemiSuccess = await this.recordMovement(
        semiFinishedId, 
        'semi', 
        'out', 
        totalSemiFinishedQuantity, 
        `استهلاك في أمر تعبئة: ${orderCode}`,
        userId
      );
      
      if (!consumeSemiSuccess) {
        // يجب التراجع عن الإضافة السابقة إذا فشلت عملية الإزالة
        await this.recordMovement(
          productId, 
          'finished', 
          'out', 
          productQuantity, 
          `إلغاء إضافة من أمر تعبئة بسبب خطأ: ${orderCode}`,
          userId
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in addFinishedProductFromPackagingOrder:', error);
      return false;
    }
  }

  // Fetch inventory movements based on query parameters
  public async fetchInventoryMovements(query: InventoryMovementQuery = {}): Promise<InventoryMovement[]> {
    try {
      // Call direct query instead of RPC function
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
          users:user_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching inventory movements:', error);
        throw error;
      }

      if (!data || !Array.isArray(data)) {
        console.error('Invalid data returned when fetching inventory movements:', data);
        return [];
      }

      // Convert server data to client format
      let movements = data.map((item: any) => {
        const movement: InventoryMovement = {
          id: item.id,
          item_id: item.item_id,
          item_type: item.item_type,
          movement_type: item.movement_type as 'in' | 'out' | 'adjustment',
          type: item.movement_type as 'in' | 'out' | 'adjustment', // Add type alias for compatibility
          quantity: Number(item.quantity),
          balance_after: Number(item.balance_after),
          reason: item.reason,
          note: item.reason, // Add note alias for compatibility
          created_at: item.created_at,
          user_name: item.users?.name,
          category: this.getItemTypeCategory(item.item_type),
          item_name: item.item_name || item.item_id,
          date: parseISO(item.created_at) // Convert string to Date
        };
        return movement;
      });

      // Apply date range filter
      if (query.dateRange) {
        if (query.dateRange.from) {
          movements = movements.filter(m => 
            m.date && m.date >= query.dateRange!.from!
          );
        }
        
        if (query.dateRange.to) {
          movements = movements.filter(m => 
            m.date && m.date <= query.dateRange!.to!
          );
        }
      }

      // Apply category filter
      if (query.category && query.category !== 'all') {
        movements = movements.filter(m => m.category === query.category);
      }

      // Apply type filter
      if (query.type && query.type !== 'all') {
        movements = movements.filter(m => m.type === query.type);
      }

      // Apply search filter
      if (query.search) {
        const search = query.search.toLowerCase();
        movements = movements.filter(m => 
          (m.item_name?.toLowerCase().includes(search)) || 
          (m.reason?.toLowerCase().includes(search))
        );
      }

      return movements;
    } catch (error) {
      console.error('Error in fetchInventoryMovements:', error);
      return [];
    }
  }

  // Filter movements by category
  public filterMovementsByCategory(movements: InventoryMovement[], category: string): InventoryMovement[] {
    if (category === 'all') return movements;
    return movements.filter(m => m.category === category);
  }

  // Create a manual inventory movement
  public async createManualInventoryMovement(data: ManualMovementInput): Promise<boolean> {
    try {
      // Map category to item_type format
      let itemType: ItemType;
      
      switch (data.category) {
        case 'raw_materials':
          itemType = 'raw';
          break;
        case 'packaging':
          itemType = 'packaging';
          break;
        case 'semi_finished':
          itemType = 'semi';
          break;
        case 'finished_products':
          itemType = 'finished';
          break;
        default:
          throw new Error('Invalid category');
      }
      
      // Record the movement
      const success = await this.recordMovement(
        data.item_id.toString(),
        itemType,
        data.type,
        data.quantity,
        data.note
      );
      
      if (success) {
        toast.success('تم تسجيل حركة المخزون بنجاح');
      }
      
      return success;
    } catch (error) {
      console.error('Error creating manual movement:', error);
      toast.error('حدث خطأ أثناء تسجيل حركة المخزون');
      return false;
    }
  }

  // Helper function for getItemTypeCategory
  private getItemTypeCategory(itemType: string): string {
    switch (itemType) {
      case 'raw':
        return 'raw_materials';
      case 'packaging':
        return 'packaging';
      case 'semi':
        return 'semi_finished';
      case 'finished':
        return 'finished_products';
      default:
        return itemType;
    }
  }
}

export { InventoryMovementService };
export type { InventoryMovement, InventoryMovementQuery };
export default InventoryMovementService;
