import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InventoryMovement } from '@/types/inventoryTypes';

/**
 * خدمة تتبع المخزون - مسؤولة فقط عن تسجيل حركات المخزون وليس إجراء تغييرات على المخزون
 */
class InventoryTrackingService {
  private static instance: InventoryTrackingService;

  private constructor() {}

  /**
   * الحصول على نسخة واحدة من الخدمة (نمط Singleton)
   */
  public static getInstance(): InventoryTrackingService {
    if (!InventoryTrackingService.instance) {
      InventoryTrackingService.instance = new InventoryTrackingService();
    }
    return InventoryTrackingService.instance;
  }

  /**
   * تسجيل حركة مخزون جديدة
   * @param movement بيانات حركة المخزون
   */
  public async recordMovement(movement: {
    item_id: string;
    item_type: string;
    movement_type: 'in' | 'out' | 'adjustment';
    quantity: number;
    balance_after: number;
    reason?: string;
  }): Promise<boolean> {
    try {
      // جلب معرف المستخدم الحالي إذا كان متاحًا
      let user_id: string | null = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        user_id = user.id;
      }

      // إضافة حركة جديدة في جدول تتبع المخزون
      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          item_id: movement.item_id,
          item_type: movement.item_type,
          movement_type: movement.movement_type,
          quantity: movement.quantity,
          balance_after: movement.balance_after,
          reason: movement.reason || '',
          user_id
        });

      if (error) {
        console.error("Error recording inventory movement:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in recordMovement:", error);
      return false;
    }
  }

  /**
   * تسجيل حركة وارد للمخزون
   */
  public async recordIncomingMovement(
    itemId: string,
    itemType: string,
    quantity: number,
    balanceAfter: number,
    reason?: string
  ): Promise<boolean> {
    return this.recordMovement({
      item_id: itemId,
      item_type: itemType,
      movement_type: 'in',
      quantity: Math.abs(quantity), // التأكد من أن الكمية موجبة
      balance_after: balanceAfter,
      reason
    });
  }

  /**
   * تسجيل حركة صرف من المخزون
   */
  public async recordOutgoingMovement(
    itemId: string,
    itemType: string,
    quantity: number,
    balanceAfter: number,
    reason?: string
  ): Promise<boolean> {
    return this.recordMovement({
      item_id: itemId,
      item_type: itemType,
      movement_type: 'out',
      quantity: Math.abs(quantity), // التأكد من أن الكمية موجبة
      balance_after: balanceAfter,
      reason
    });
  }

  /**
   * تسجيل حركة تعديل في المخزون
   */
  public async recordAdjustmentMovement(
    itemId: string,
    itemType: string,
    quantity: number,
    balanceAfter: number,
    reason?: string
  ): Promise<boolean> {
    return this.recordMovement({
      item_id: itemId,
      item_type: itemType,
      movement_type: 'adjustment',
      quantity,
      balance_after: balanceAfter,
      reason: reason || 'تعديل مخزون'
    });
  }

  /**
   * استرجاع حركات المخزون مع إمكانية التصفية
   */
  public async getInventoryMovements(filters?: {
    itemType?: string;
    movementType?: 'in' | 'out' | 'adjustment';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<InventoryMovement[]> {
    try {
      let query = supabase
        .from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false });

      // تطبيق المرشحات إذا كانت موجودة
      if (filters) {
        if (filters.itemType) {
          query = query.eq('item_type', filters.itemType);
        }
        
        if (filters.movementType) {
          query = query.eq('movement_type', filters.movementType);
        }
        
        if (filters.startDate) {
          query = query.gte('created_at', filters.startDate.toISOString());
        }
        
        if (filters.endDate) {
          // إضافة يوم واحد للتاريخ النهائي للتأكد من شمول كل الحركات في ذلك اليوم
          const endDate = new Date(filters.endDate);
          endDate.setDate(endDate.getDate() + 1);
          query = query.lt('created_at', endDate.toISOString());
        }
        
        if (filters.limit) {
          query = query.limit(filters.limit);
        }
        
        if (filters.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching inventory movements:", error);
        throw error;
      }

      // تحويل البيانات إلى الشكل المطلوب
      return (data || []).map(item => ({
        id: item.id,
        item_id: item.item_id,
        item_type: item.item_type,
        movement_type: item.movement_type as 'in' | 'out' | 'adjustment',
        quantity: item.quantity,
        balance_after: item.balance_after,
        reason: item.reason,
        created_at: item.created_at,
        updated_at: item.updated_at,
        user_id: item.user_id,
        user_name: undefined // This will be populated when needed
      }));
    } catch (error) {
      console.error("Error fetching inventory movements:", error);
      toast.error("حدث خطأ أثناء جلب حركات المخزون");
      return [];
    }
  }

  /**
   * استرجاع حركات المخزون لصنف محدد
   */
  public async getItemMovements(itemId: string, itemType: string): Promise<InventoryMovement[]> {
    try {
      // Using the RPC function instead of direct join
      const { data, error } = await supabase.rpc('get_inventory_movements_by_item', {
        p_item_id: itemId,
        p_item_type: itemType
      });

      if (error) {
        console.error("Error fetching item movements:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in getItemMovements:", error);
      return [];
    }
  }

  /**
   * استرجاع إحصائيات حركة المخزون
   */
  public async getMovementStatistics(period?: 'day' | 'week' | 'month' | 'year'): Promise<{
    totalIn: number;
    totalOut: number;
    totalAdjustments: number;
    movementsByType: Record<string, number>;
  }> {
    try {
      let query = supabase
        .from('inventory_movements')
        .select('*');
      
      // تطبيق تصفية حسب الفترة الزمنية
      if (period) {
        const now = new Date();
        let startDate: Date;
        
        switch (period) {
          case 'day':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching movement statistics:", error);
        throw error;
      }

      // تحليل البيانات وحساب الإحصائيات
      const movements = data || [];
      const inMovements = movements.filter(m => m.movement_type === 'in');
      const outMovements = movements.filter(m => m.movement_type === 'out');
      const adjustmentMovements = movements.filter(m => m.movement_type === 'adjustment');
      
      // حساب إجمالي الكميات
      const totalIn = inMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);
      const totalOut = outMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);
      const totalAdjustments = adjustmentMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);
      
      // حساب الحركات حسب النوع
      const movementsByType: Record<string, number> = {};
      movements.forEach(m => {
        const type = m.item_type;
        movementsByType[type] = (movementsByType[type] || 0) + 1;
      });
      
      return {
        totalIn,
        totalOut,
        totalAdjustments,
        movementsByType
      };
    } catch (error) {
      console.error("Error calculating movement statistics:", error);
      return {
        totalIn: 0,
        totalOut: 0,
        totalAdjustments: 0,
        movementsByType: {}
      };
    }
  }

  /**
   * تسجيل حركات المخزون المرتبطة بأمر إنتاج
   * @param productionOrderId معرف أمر الإنتاج
   * @param isExecution إذا كانت العملية تنفيذ (true) أو إلغاء (false)
   */
  public async recordProductionOrderMovements(productionOrderId: number, isExecution: boolean = true): Promise<boolean> {
    try {
      // 1. استرجاع تفاصيل أمر الإنتاج
      const { data: productionOrder, error: orderError } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', productionOrderId)
        .single();

      if (orderError || !productionOrder) {
        console.error("Error fetching production order:", orderError);
        return false;
      }

      // 2. استرجاع مكونات أمر الإنتاج (المواد الخام)
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('production_order_ingredients')
        .select('*')
        .eq('production_order_id', productionOrderId);

      if (ingredientsError) {
        console.error("Error fetching production order ingredients:", ingredientsError);
        return false;
      }

      // 3. البحث عن المنتج النصف مصنع
      const { data: semiFinishedProduct, error: semiFinishedError } = await supabase
        .from('semi_finished_products')
        .select('*')
        .eq('code', productionOrder.product_code)
        .single();

      if (semiFinishedError || !semiFinishedProduct) {
        console.error("Error fetching semi-finished product:", semiFinishedError);
        return false;
      }

      // 4. تسجيل حركات استهلاك المواد الخام
      for (const ingredient of ingredients || []) {
        // البحث عن المادة الخام للحصول على رصيدها الحالي
        const { data: rawMaterial, error: rawMaterialError } = await supabase
          .from('raw_materials')
          .select('*')
          .eq('code', ingredient.raw_material_code)
          .single();

        if (rawMaterialError || !rawMaterial) {
          console.error(`Error fetching raw material with code ${ingredient.raw_material_code}:`, rawMaterialError);
          continue; // استمر مع المكون التالي
        }

        // تسجيل حركة استهلاك المادة الخام أو إعادتها حسب نوع العملية
        if (isExecution) {
          await this.recordOutgoingMovement(
            rawMaterial.id.toString(),
            'raw',
            ingredient.required_quantity, // Use required_quantity here
            rawMaterial.quantity,
            `استهلاك في أمر إنتاج رقم ${productionOrder.code}`
          );
        } else {
          await this.recordIncomingMovement(
            rawMaterial.id.toString(),
            'raw',
            ingredient.required_quantity, // Use required_quantity here
            rawMaterial.quantity,
            `إعادة بسبب إلغاء أمر إنتاج رقم ${productionOrder.code}`
          );
        }
      }

      // 5. تسجيل حركة إنتاج المنتج النصف مصنع أو إلغائها
      if (isExecution) {
        await this.recordIncomingMovement(
          semiFinishedProduct.id.toString(),
          'semi',
          productionOrder.quantity,
          semiFinishedProduct.quantity,
          `إنتاج من أمر إنتاج رقم ${productionOrder.code}`
        );
      } else {
        await this.recordOutgoingMovement(
          semiFinishedProduct.id.toString(),
          'semi',
          productionOrder.quantity,
          semiFinishedProduct.quantity,
          `إلغاء بسبب إلغاء أمر إنتاج رقم ${productionOrder.code}`
        );
      }

      return true;
    } catch (error) {
      console.error("Error recording production order movements:", error);
      return false;
    }
  }

  /**
   * تسجيل حركات المخزون المرتبطة بأمر تعبئة
   * @param packagingOrderId معرف أمر التعبئة
   * @param isExecution إذا كانت العملية تنفيذ (true) أو إلغاء (false)
   */
  public async recordPackagingOrderMovements(packagingOrderId: number, isExecution: boolean = true): Promise<boolean> {
    try {
      // 1. استرجاع تفاصيل أمر التعبئة
      const { data: packagingOrder, error: orderError } = await supabase
        .from('packaging_orders')
        .select('*')
        .eq('id', packagingOrderId)
        .single();

      if (orderError || !packagingOrder) {
        console.error("Error fetching packaging order:", orderError);
        return false;
      }

      // 2. استرجاع مواد التعبئة المستخدمة
      const { data: packagingMaterials, error: materialsError } = await supabase
        .from('packaging_order_materials')
        .select('*')
        .eq('packaging_order_id', packagingOrderId);

      if (materialsError) {
        console.error("Error fetching packaging materials:", materialsError);
        return false;
      }

      // 3. البحث عن المنتج النصف مصنع
      const { data: semiFinishedProduct, error: semiFinishedError } = await supabase
        .from('semi_finished_products')
        .select('*')
        .eq('code', packagingOrder.semi_finished_code)
        .single();

      if (semiFinishedError || !semiFinishedProduct) {
        console.error("Error fetching semi-finished product:", semiFinishedError);
        return false;
      }

      // 4. البحث عن المنتج النهائي
      const { data: finishedProduct, error: finishedError } = await supabase
        .from('finished_products')
        .select('*')
        .eq('code', packagingOrder.product_code)
        .single();

      if (finishedError || !finishedProduct) {
        console.error("Error fetching finished product:", finishedError);
        return false;
      }

      // 5. تسجيل حركة استهلاك المنتج النصف مصنع أو إعادته
      if (isExecution) {
        await this.recordOutgoingMovement(
          semiFinishedProduct.id.toString(),
          'semi',
          packagingOrder.semi_finished_quantity,
          semiFinishedProduct.quantity,
          `استهلاك في أمر تعبئة رقم ${packagingOrder.code}`
        );
      } else {
        await this.recordIncomingMovement(
          semiFinishedProduct.id.toString(),
          'semi',
          packagingOrder.semi_finished_quantity,
          semiFinishedProduct.quantity,
          `إعادة بسبب إلغاء أمر تعبئة رقم ${packagingOrder.code}`
        );
      }

      // 6. تسجيل حركات استهلاك مواد التعبئة أو إعادتها
      for (const material of packagingMaterials || []) {
        // البحث عن مادة التعبئة للحصول على رصيدها الحالي
        const { data: packagingMaterial, error: materialError } = await supabase
          .from('packaging_materials')
          .select('*')
          .eq('code', material.packaging_material_code)
          .single();

        if (materialError || !packagingMaterial) {
          console.error(`Error fetching packaging material with code ${material.packaging_material_code}:`, materialError);
          continue; // استمر مع المادة التالية
        }

        // تسجيل حركة استهلاك مادة التعبئة أو إعادتها
        if (isExecution) {
          await this.recordOutgoingMovement(
            packagingMaterial.id.toString(),
            'packaging',
            material.required_quantity, // Use required_quantity here
            packagingMaterial.quantity,
            `استهلاك في أمر تعبئة رقم ${packagingOrder.code}`
          );
        } else {
          await this.recordIncomingMovement(
            packagingMaterial.id.toString(),
            'packaging',
            material.required_quantity, // Use required_quantity here
            packagingMaterial.quantity,
            `إعادة بسبب إلغاء أمر تعبئة رقم ${packagingOrder.code}`
          );
        }
      }

      // 7. تسجيل حركة إنتاج المنتج النهائي أو إلغائها
      if (isExecution) {
        await this.recordIncomingMovement(
          finishedProduct.id.toString(),
          'finished',
          packagingOrder.quantity,
          finishedProduct.quantity,
          `إنتاج من أمر تعبئة رقم ${packagingOrder.code}`
        );
      } else {
        await this.recordOutgoingMovement(
          finishedProduct.id.toString(),
          'finished',
          packagingOrder.quantity,
          finishedProduct.quantity,
          `إلغاء بسبب إلغاء أمر تعبئة رقم ${packagingOrder.code}`
        );
      }

      return true;
    } catch (error) {
      console.error("Error recording packaging order movements:", error);
      return false;
    }
  }

  /**
   * تسجيل حركات المخزون المرتبطة بفاتورة مبيعات
   * @param invoiceId معرف الفاتورة
   * @param isExecution إذا كانت العملية تنفيذ (true) أو إلغاء (false)
   */
  public async recordSalesInvoiceMovements(invoiceId: string, isExecution: boolean = true): Promise<boolean> {
    try {
      // 1. استرجاع تفاصيل الفاتورة
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice || invoice.invoice_type !== 'sale') {
        console.error("Error fetching sales invoice:", invoiceError);
        return false;
      }

      // 2. استرجاع عناصر الفاتورة
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (itemsError) {
        console.error("Error fetching invoice items:", itemsError);
        return false;
      }

      // 3. معالجة كل عنصر في الفاتورة
      for (const item of invoiceItems || []) {
        let itemTableName = '';
        
        // تحديد جدول العنصر بناءً على نوعه
        switch (item.item_type) {
          case 'raw':
            itemTableName = 'raw_materials';
            break;
          case 'semi':
            itemTableName = 'semi_finished_products';
            break;
          case 'packaging':
            itemTableName = 'packaging_materials';
            break;
          case 'finished':
            itemTableName = 'finished_products';
            break;
          default:
            console.warn(`Unknown item type: ${item.item_type}`);
            continue; // تخطي هذا العنصر
        }

        // البحث عن العنصر في الجدول المناسب
        // Use type assertion to suppress TypeScript errors for dynamic table name
        const { data: inventoryItem, error: itemError } = await (supabase
          .from(itemTableName as any)
          .select('*')
          .eq('id', item.item_id)
          .single());

        if (itemError || !inventoryItem) {
          console.error(`Error fetching item with id ${item.item_id} from ${itemTableName}:`, itemError);
          continue; // استمر مع العنصر التالي
        }

        // تسجيل حركة بيع العنصر أو إعادته
        if (isExecution) {
          await this.recordOutgoingMovement(
            item.item_id.toString(),
            item.item_type,
            item.quantity, // Using direct quantity from invoice_items
            (inventoryItem as any).quantity,
            `بيع في فاتورة رقم ${invoice.id}`
          );
        } else {
          await this.recordIncomingMovement(
            item.item_id.toString(),
            item.item_type,
            item.quantity, // Using direct quantity from invoice_items
            (inventoryItem as any).quantity,
            `إعادة بسبب إلغاء فاتورة مبيعات رقم ${invoice.id}`
          );
        }
      }

      return true;
    } catch (error) {
      console.error("Error recording sales invoice movements:", error);
      return false;
    }
  }

  /**
   * تسجيل حركات المخزون المرتبطة بفاتورة مشتريات
   * @param invoiceId معرف الفاتورة
   * @param isExecution إذا كانت العملية تنفيذ (true) أو إلغاء (false)
   */
  public async recordPurchaseInvoiceMovements(invoiceId: string, isExecution: boolean = true): Promise<boolean> {
    try {
      // 1. استرجاع تفاصيل الفاتورة
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice || invoice.invoice_type !== 'purchase') {
        console.error("Error fetching purchase invoice:", invoiceError);
        return false;
      }

      // 2. استرجاع عناصر الفاتورة
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (itemsError) {
        console.error("Error fetching invoice items:", itemsError);
        return false;
      }

      // 3. معالجة كل عنصر في الفاتورة
      for (const item of invoiceItems || []) {
        let itemTableName = '';
        
        // تحديد جدول العنصر بناءً على نوعه
        switch (item.item_type) {
          case 'raw':
            itemTableName = 'raw_materials';
            break;
          case 'semi':
            itemTableName = 'semi_finished_products';
            break;
          case 'packaging':
            itemTableName = 'packaging_materials';
            break;
          case 'finished':
            itemTableName = 'finished_products';
            break;
          default:
            console.warn(`Unknown item type: ${item.item_type}`);
            continue; // تخطي هذا العنصر
        }

        // البحث عن العنصر في الجدول المناسب
        // Use type assertion to suppress TypeScript errors for dynamic table name
        const { data: inventoryItem, error: itemError } = await (supabase
          .from(itemTableName as any)
          .select('*')
          .eq('id', item.item_id)
          .single());

        if (itemError || !inventoryItem) {
          console.error(`Error fetching item with id ${item.item_id} from ${itemTableName}:`, itemError);
          continue; // استمر مع العنصر التالي
        }

        // تسجيل حركة شراء العنصر أو إلغائها
        if (isExecution) {
          await this.recordIncomingMovement(
            item.item_id.toString(),
            item.item_type,
            item.quantity, // Using direct quantity from invoice_items
            (inventoryItem as any).quantity,
            `شراء في فاتورة رقم ${invoice.id}`
          );
        } else {
          await this.recordOutgoingMovement(
            item.item_id.toString(),
            item.item_type,
            item.quantity, // Using direct quantity from invoice_items
            (inventoryItem as any).quantity,
            `إلغاء بسبب إلغاء فاتورة مشتريات رقم ${invoice.id}`
          );
        }
      }

      return true;
    } catch (error) {
      console.error("Error recording purchase invoice movements:", error);
      return false;
    }
  }

  /**
   * تسجيل حركات المخزون المرتبطة بأمر مرتجع
   * @param returnId معرف المرتجع
   * @param isExecution إذا كانت العملية تنفيذ (true) أو إلغاء (false)
   */
  public async recordReturnMovements(returnId: string, isExecution: boolean = true): Promise<boolean> {
    try {
      // 1. استرجاع تفاصيل المرتجع
      const { data: returnOrder, error: returnError } = await supabase
        .from('returns')
        .select('*')
        .eq('id', returnId)
        .single();

      if (returnError || !returnOrder) {
        console.error("Error fetching return order:", returnError);
        return false;
      }

      // 2. استرجاع عناصر المرتجع
      const { data: returnItems, error: itemsError } = await supabase
        .from('return_items')
        .select('*')
        .eq('return_id', returnId);

      if (itemsError) {
        console.error("Error fetching return items:", itemsError);
        return false;
      }

      // 3. معالجة كل عنصر في المرتجع
      for (const item of returnItems || []) {
        let itemTableName = '';
        
        // تحديد جدول العنصر بناءً على نوعه
        switch (item.item_type) {
          case 'raw':
            itemTableName = 'raw_materials';
            break;
          case 'semi':
            itemTableName = 'semi_finished_products';
            break;
          case 'packaging':
            itemTableName = 'packaging_materials';
            break;
          case 'finished':
            itemTableName = 'finished_products';
            break;
          default:
            console.warn(`Unknown item type: ${item.item_type}`);
            continue; // تخطي هذا العنصر
        }

        // البحث عن العنصر في الجدول المناسب
        // Use type assertion to suppress TypeScript errors for dynamic table name
        const { data: inventoryItem, error: itemError } = await (supabase
          .from(itemTableName as any)
          .select('*')
          .eq('id', item.item_id)
          .single());

        if (itemError || !inventoryItem) {
          console.error(`Error fetching item with id ${item.item_id} from ${itemTableName}:`, itemError);
          continue; // استمر مع العنصر التالي
        }

        // تحديد نوع الحركة بناءً على نوع المرتجع
        const isSalesReturn = returnOrder.return_type === 'sales';
        
        // تسجيل حركة المرتجع أو إلغائها
        if (isExecution) {
          if (isSalesReturn) {
            // مرتجع مبيعات: إعادة المنتجات إلى المخزون
            await this.recordIncomingMovement(
              item.item_id.toString(),
              item.item_type,
              item.quantity, // Using direct quantity from return_items
              (inventoryItem as any).quantity,
              `مرتجع مبيعات رقم ${returnOrder.id}`
            );
          } else {
            // مرتجع مشتريات: إخراج المنتجات من المخزون
            await this.recordOutgoingMovement(
              item.item_id.toString(),
              item.item_type,
              item.quantity, // Using direct quantity from return_items
              (inventoryItem as any).quantity,
              `مرتجع مشتريات رقم ${returnOrder.id}`
            );
          }
        } else {
          // إلغاء المرتجع (عكس العملية)
          if (isSalesReturn) {
            await this.recordOutgoingMovement(
              item.item_id.toString(),
              item.item_type,
              item.quantity, // Using direct quantity from return_items
              (inventoryItem as any).quantity,
              `إلغاء مرتجع مبيعات رقم ${returnOrder.id}`
            );
          } else {
            await this.recordIncomingMovement(
              item.item_id.toString(),
              item.item_type,
              item.quantity, // Using direct quantity from return_items
              (inventoryItem as any).quantity,
              `إلغاء مرتجع مشتريات رقم ${returnOrder.id}`
            );
          }
        }
      }

      return true;
    } catch (error) {
      console.error("Error recording return movements:", error);
      return false;
    }
  }
}

export default InventoryTrackingService;
