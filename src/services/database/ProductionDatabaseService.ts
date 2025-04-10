
import { supabase, rpcFunctions } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ProductionOrder, 
  PackagingOrder 
} from "../ProductionService";

class ProductionDatabaseService {
  private static instance: ProductionDatabaseService;
  
  private constructor() {}
  
  public static getInstance(): ProductionDatabaseService {
    if (!ProductionDatabaseService.instance) {
      ProductionDatabaseService.instance = new ProductionDatabaseService();
    }
    return ProductionDatabaseService.instance;
  }

  // جلب جميع أوامر الإنتاج
  public async getProductionOrders(): Promise<ProductionOrder[]> {
    try {
      const { data: orders, error } = await supabase
        .from('production_orders')
        .select('*')
        .order('date', { ascending: false });
        
      if (error) {
        console.error('Error fetching production orders:', error);
        throw error;
      }
      
      // جلب المكونات لكل أمر إنتاج
      const ordersWithIngredients = await Promise.all(orders.map(async (order) => {
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('production_order_ingredients')
          .select('*')
          .eq('production_order_id', order.id);
          
        if (ingredientsError) {
          console.error(`Error fetching ingredients for order ${order.id}:`, ingredientsError);
          throw ingredientsError;
        }
        
        // تحويل البيانات من صيغة قاعدة البيانات إلى صيغة التطبيق
        return {
          id: order.id,
          code: order.code,
          productCode: order.product_code,
          productName: order.product_name,
          quantity: order.quantity,
          unit: order.unit,
          status: order.status as "pending" | "inProgress" | "completed" | "cancelled",
          date: order.date,
          ingredients: ingredients.map(ingredient => ({
            id: ingredient.id,
            code: ingredient.raw_material_code,
            name: ingredient.raw_material_name,
            requiredQuantity: ingredient.required_quantity,
            available: true // سيتم تحديثها لاحقاً عند التحقق من توفر المواد
          })),
          totalCost: order.total_cost
        };
      }));
      
      return ordersWithIngredients;
    } catch (error) {
      console.error('Error fetching production orders:', error);
      toast.error('حدث خطأ أثناء جلب أوامر الإنتاج');
      return [];
    }
  }

  // جلب جميع أوامر التعبئة
  public async getPackagingOrders(): Promise<PackagingOrder[]> {
    try {
      const { data: orders, error } = await supabase
        .from('packaging_orders')
        .select('*')
        .order('date', { ascending: false });
        
      if (error) {
        console.error('Error fetching packaging orders:', error);
        throw error;
      }
      
      // جلب المكونات لكل أمر تعبئة
      const ordersWithMaterials = await Promise.all(orders.map(async (order) => {
        const { data: materials, error: materialsError } = await supabase
          .from('packaging_order_materials')
          .select('*')
          .eq('packaging_order_id', order.id);
          
        if (materialsError) {
          console.error(`Error fetching materials for packaging order ${order.id}:`, materialsError);
          throw materialsError;
        }
        
        // تحويل البيانات من صيغة قاعدة البيانات إلى صيغة التطبيق
        return {
          id: order.id,
          code: order.code,
          productCode: order.product_code,
          productName: order.product_name,
          quantity: order.quantity,
          unit: order.unit,
          status: order.status as "pending" | "inProgress" | "completed" | "cancelled",
          date: order.date,
          semiFinished: {
            code: order.semi_finished_code,
            name: order.semi_finished_name,
            quantity: order.semi_finished_quantity,
            available: true // سيتم تحديثها لاحقاً عند التحقق من توفر المواد
          },
          packagingMaterials: materials.map(material => ({
            code: material.packaging_material_code,
            name: material.packaging_material_name,
            quantity: material.required_quantity,
            available: true // سيتم تحديثها لاحقاً عند التحقق من توفر المواد
          })),
          totalCost: order.total_cost
        };
      }));
      
      return ordersWithMaterials;
    } catch (error) {
      console.error('Error fetching packaging orders:', error);
      toast.error('حدث خطأ أثناء جلب أوامر التعبئة');
      return [];
    }
  }

  // إنشاء أمر إنتاج جديد
  public async createProductionOrder(
    productCode: string,
    productName: string,
    quantity: number,
    unit: string,
    ingredients: { code: string, name: string, requiredQuantity: number }[],
    totalCost: number
  ): Promise<ProductionOrder | null> {
    try {
      const code = this.generateOrderCode('production');
      const date = new Date().toISOString().split('T')[0];
      
      console.log(`Creating new production order: ${code} for ${productName}`);
      
      // إنشاء أمر الإنتاج
      const { data: orderData, error: orderError } = await supabase
        .from('production_orders')
        .insert({
          code,
          product_code: productCode,
          product_name: productName,
          quantity,
          unit,
          status: 'pending' as "pending",
          date,
          total_cost: totalCost
        })
        .select('*')
        .single();
        
      if (orderError) {
        console.error('Error creating production order:', orderError);
        throw orderError;
      }
      
      // إضافة المكونات
      const ingredientsToInsert = ingredients.map(ingredient => ({
        production_order_id: orderData.id,
        raw_material_code: ingredient.code,
        raw_material_name: ingredient.name,
        required_quantity: ingredient.requiredQuantity
      }));
      
      console.log(`Adding ${ingredientsToInsert.length} ingredients to production order ${orderData.id}`);
      
      const { error: ingredientsError } = await supabase
        .from('production_order_ingredients')
        .insert(ingredientsToInsert);
        
      if (ingredientsError) {
        console.error('Error adding ingredients to production order:', ingredientsError);
        throw ingredientsError;
      }
      
      console.log(`Production order ${orderData.id} created successfully`);
      
      // إعادة تهيئة الأمر بالصيغة المطلوبة
      return {
        id: orderData.id,
        code: orderData.code,
        productCode: orderData.product_code,
        productName: orderData.product_name,
        quantity: orderData.quantity,
        unit: orderData.unit,
        status: orderData.status as "pending" | "inProgress" | "completed" | "cancelled",
        date: orderData.date,
        ingredients: ingredients.map(ingredient => ({
          id: 0, // سيتم تحديثه لاحقًا
          code: ingredient.code,
          name: ingredient.name,
          requiredQuantity: ingredient.requiredQuantity,
          available: true
        })),
        totalCost: orderData.total_cost
      };
    } catch (error) {
      console.error('Error creating production order:', error);
      toast.error('حدث خطأ أثناء إنشاء أمر الإنتاج');
      return null;
    }
  }

  // إنشاء أمر تعبئة جديد
  public async createPackagingOrder(
    productCode: string,
    productName: string,
    quantity: number,
    unit: string,
    semiFinished: { code: string, name: string, quantity: number },
    packagingMaterials: { code: string, name: string, quantity: number }[],
    totalCost: number
  ): Promise<PackagingOrder | null> {
    try {
      const code = this.generateOrderCode('packaging');
      const date = new Date().toISOString().split('T')[0];
      
      console.log(`Creating new packaging order: ${code} for ${productName}`);
      
      // إنشاء أمر التعبئة
      const { data: orderData, error: orderError } = await supabase
        .from('packaging_orders')
        .insert({
          code,
          product_code: productCode,
          product_name: productName,
          quantity,
          unit,
          status: 'pending',
          date,
          semi_finished_code: semiFinished.code,
          semi_finished_name: semiFinished.name,
          semi_finished_quantity: semiFinished.quantity,
          total_cost: totalCost
        })
        .select('*')
        .single();
        
      if (orderError) {
        console.error('Error creating packaging order:', orderError);
        throw orderError;
      }
      
      // إضافة مواد التعبئة
      const materialsToInsert = packagingMaterials.map(material => ({
        packaging_order_id: orderData.id,
        packaging_material_code: material.code,
        packaging_material_name: material.name,
        required_quantity: material.quantity
      }));
      
      console.log(`Adding ${materialsToInsert.length} packaging materials to order ${orderData.id}`);
      
      const { error: materialsError } = await supabase
        .from('packaging_order_materials')
        .insert(materialsToInsert);
        
      if (materialsError) {
        console.error('Error adding materials to packaging order:', materialsError);
        throw materialsError;
      }
      
      console.log(`Packaging order ${orderData.id} created successfully`);
      
      // إعادة تهيئة الأمر بالصيغة المطلوبة
      return {
        id: orderData.id,
        code: orderData.code,
        productCode: orderData.product_code,
        productName: orderData.product_name,
        quantity: orderData.quantity,
        unit: orderData.unit,
        status: orderData.status as "pending" | "inProgress" | "completed" | "cancelled",
        date: orderData.date,
        semiFinished: {
          code: semiFinished.code,
          name: semiFinished.name,
          quantity: semiFinished.quantity,
          available: true
        },
        packagingMaterials: packagingMaterials.map(material => ({
          code: material.code,
          name: material.name,
          quantity: material.quantity,
          available: true
        })),
        totalCost: orderData.total_cost
      };
    } catch (error) {
      console.error('Error creating packaging order:', error);
      toast.error('حدث خطأ أثناء إنشاء أمر التعبئة');
      return null;
    }
  }

  // توليد كود فريد للأمر
  private generateOrderCode(type: 'production' | 'packaging'): string {
    const prefix = type === 'production' ? 'PRD' : 'PKG';
    const timestamp = Date.now().toString().slice(-8);
    return `${prefix}-${timestamp}`;
  }

  // تحديث حالة أمر التعبئة
  public async updatePackagingOrderStatus(
    orderId: number, 
    status: 'pending' | 'inProgress' | 'completed' | 'cancelled'
  ): Promise<boolean> {
    try {
      console.log(`Updating packaging order ${orderId} status to ${status}`);
      
      const { error } = await supabase
        .from('packaging_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
        
      if (error) {
        console.error(`Error updating packaging order ${orderId} status:`, error);
        throw error;
      }
      
      console.log(`Packaging order ${orderId} status updated to ${status}`);
      
      // إذا كانت الحالة "مكتملة"، قم بتحديث المخزون
      if (status === 'completed') {
        await this.updateInventoryForCompletedPackagingOrder(orderId);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating packaging order status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة أمر التعبئة');
      return false;
    }
  }

  // تحديث حالة أمر الإنتاج
  public async updateProductionOrderStatus(
    orderId: number, 
    status: 'pending' | 'inProgress' | 'completed' | 'cancelled'
  ): Promise<boolean> {
    try {
      console.log(`Updating production order ${orderId} status to ${status}`);
      
      const { error } = await supabase
        .from('production_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
        
      if (error) {
        console.error(`Error updating production order ${orderId} status:`, error);
        throw error;
      }
      
      console.log(`Production order ${orderId} status updated to ${status}`);
      
      // إذا كانت الحالة "مكتملة"، قم بتحديث المخزون
      if (status === 'completed') {
        await this.updateInventoryForCompletedProductionOrder(orderId);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating production order status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة أمر الإنتاج');
      return false;
    }
  }

  // تحديث المخزون عند اكتمال أمر الإنتاج
  private async updateInventoryForCompletedProductionOrder(orderId: number): Promise<void> {
    try {
      console.log(`Updating inventory for completed production order ${orderId}`);
      
      // جلب تفاصيل أمر الإنتاج
      const { data: order, error: orderError } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      if (orderError) {
        console.error(`Error fetching production order ${orderId}:`, orderError);
        throw orderError;
      }
      
      // جلب المكونات
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('production_order_ingredients')
        .select('*')
        .eq('production_order_id', orderId);
        
      if (ingredientsError) {
        console.error(`Error fetching ingredients for production order ${orderId}:`, ingredientsError);
        throw ingredientsError;
      }
      
      // 1. خصم المواد الخام المستخدمة من المخزون
      for (const ingredient of ingredients) {
        console.log(`Reducing raw material ${ingredient.raw_material_code} by ${ingredient.required_quantity}`);
        
        // جلب المادة الخام الحالية
        const { data: rawMaterial, error: rawError } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('code', ingredient.raw_material_code)
          .single();
          
        if (rawError) {
          console.error(`Error fetching raw material ${ingredient.raw_material_code}:`, rawError);
          continue; // استمر مع المكون التالي
        }
        
        // حساب الكمية الجديدة
        const newQuantity = rawMaterial.quantity - ingredient.required_quantity;
        
        // تحديث كمية المادة الخام
        const { error: updateError } = await supabase
          .from('raw_materials')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('code', ingredient.raw_material_code);
          
        if (updateError) {
          console.error(`Error updating raw material ${ingredient.raw_material_code} quantity:`, updateError);
          continue;
        }
        
        // تسجيل حركة المخزون
        await supabase
          .from('inventory_movements')
          .insert({
            item_id: ingredient.raw_material_code,
            item_type: 'raw_materials',
            movement_type: 'production_consumption',
            quantity: -ingredient.required_quantity,
            balance_after: newQuantity,
            reason: `استهلاك في أمر الإنتاج ${order.code}`
          });
      }
      
      // 2. إضافة المنتج النصف مصنع إلى المخزون
      console.log(`Adding semi-finished product ${order.product_code} with quantity ${order.quantity}`);
      
      // جلب المنتج النصف مصنع الحالي
      const { data: semiFinished, error: semiError } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('code', order.product_code)
        .single();
        
      if (semiError) {
        console.error(`Error fetching semi-finished product ${order.product_code}:`, semiError);
        return;
      }
      
      // حساب الكمية الجديدة
      const newSemiQuantity = semiFinished.quantity + order.quantity;
      
      // تحديث كمية المنتج النصف مصنع
      const { error: updateSemiError } = await supabase
        .from('semi_finished_products')
        .update({ quantity: newSemiQuantity, updated_at: new Date().toISOString() })
        .eq('code', order.product_code);
        
      if (updateSemiError) {
        console.error(`Error updating semi-finished product ${order.product_code} quantity:`, updateSemiError);
        return;
      }
      
      // تسجيل حركة المخزون
      await supabase
        .from('inventory_movements')
        .insert({
          item_id: order.product_code,
          item_type: 'semi_finished_products',
          movement_type: 'production_addition',
          quantity: order.quantity,
          balance_after: newSemiQuantity,
          reason: `إنتاج من أمر الإنتاج ${order.code}`
        });
      
      console.log(`Inventory updated successfully for production order ${orderId}`);
      toast.success('تم تحديث المخزون بنجاح');
    } catch (error) {
      console.error('Error updating inventory for production order:', error);
      toast.error('حدث خطأ أثناء تحديث المخزون');
    }
  }

  // تحديث المخزون عند اكتمال أمر التعبئة
  private async updateInventoryForCompletedPackagingOrder(orderId: number): Promise<void> {
    try {
      console.log(`Updating inventory for completed packaging order ${orderId}`);
      
      // جلب تفاصيل أمر التعبئة
      const { data: order, error: orderError } = await supabase
        .from('packaging_orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      if (orderError) {
        console.error(`Error fetching packaging order ${orderId}:`, orderError);
        throw orderError;
      }
      
      // جلب مواد التعبئة
      const { data: materials, error: materialsError } = await supabase
        .from('packaging_order_materials')
        .select('*')
        .eq('packaging_order_id', orderId);
        
      if (materialsError) {
        console.error(`Error fetching packaging materials for order ${orderId}:`, materialsError);
        throw materialsError;
      }
      
      // 1. خصم المنتج النصف مصنع المستخدم
      console.log(`Reducing semi-finished product ${order.semi_finished_code} by ${order.semi_finished_quantity}`);
      
      // جلب المنتج النصف مصنع الحالي
      const { data: semiFinished, error: semiError } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('code', order.semi_finished_code)
        .single();
        
      if (semiError) {
        console.error(`Error fetching semi-finished product ${order.semi_finished_code}:`, semiError);
        throw semiError;
      }
      
      // حساب الكمية الجديدة
      const newSemiQuantity = semiFinished.quantity - order.semi_finished_quantity;
      
      // تحديث كمية المنتج النصف مصنع
      const { error: updateSemiError } = await supabase
        .from('semi_finished_products')
        .update({ quantity: newSemiQuantity, updated_at: new Date().toISOString() })
        .eq('code', order.semi_finished_code);
        
      if (updateSemiError) {
        console.error(`Error updating semi-finished product ${order.semi_finished_code} quantity:`, updateSemiError);
        throw updateSemiError;
      }
      
      // تسجيل حركة المخزون
      await supabase
        .from('inventory_movements')
        .insert({
          item_id: order.semi_finished_code,
          item_type: 'semi_finished_products',
          movement_type: 'packaging_consumption',
          quantity: -order.semi_finished_quantity,
          balance_after: newSemiQuantity,
          reason: `استهلاك في أمر التعبئة ${order.code}`
        });
      
      // 2. خصم مواد التعبئة المستخدمة
      for (const material of materials) {
        console.log(`Reducing packaging material ${material.packaging_material_code} by ${material.required_quantity}`);
        
        // جلب مادة التعبئة الحالية
        const { data: packagingMaterial, error: packError } = await supabase
          .from('packaging_materials')
          .select('quantity')
          .eq('code', material.packaging_material_code)
          .single();
          
        if (packError) {
          console.error(`Error fetching packaging material ${material.packaging_material_code}:`, packError);
          continue; // استمر مع المادة التالية
        }
        
        // حساب الكمية الجديدة
        const newPackQuantity = packagingMaterial.quantity - material.required_quantity;
        
        // تحديث كمية مادة التعبئة
        const { error: updatePackError } = await supabase
          .from('packaging_materials')
          .update({ quantity: newPackQuantity, updated_at: new Date().toISOString() })
          .eq('code', material.packaging_material_code);
          
        if (updatePackError) {
          console.error(`Error updating packaging material ${material.packaging_material_code} quantity:`, updatePackError);
          continue;
        }
        
        // تسجيل حركة المخزون
        await supabase
          .from('inventory_movements')
          .insert({
            item_id: material.packaging_material_code,
            item_type: 'packaging_materials',
            movement_type: 'packaging_consumption',
            quantity: -material.required_quantity,
            balance_after: newPackQuantity,
            reason: `استهلاك في أمر التعبئة ${order.code}`
          });
      }
      
      // 3. إضافة المنتج النهائي إلى المخزون
      console.log(`Adding finished product ${order.product_code} with quantity ${order.quantity}`);
      
      // جلب المنتج النهائي الحالي
      const { data: finishedProduct, error: finishedError } = await supabase
        .from('finished_products')
        .select('quantity')
        .eq('code', order.product_code)
        .single();
        
      if (finishedError) {
        console.error(`Error fetching finished product ${order.product_code}:`, finishedError);
        throw finishedError;
      }
      
      // حساب الكمية الجديدة
      const newFinishedQuantity = finishedProduct.quantity + order.quantity;
      
      // تحديث كمية المنتج النهائي
      const { error: updateFinishedError } = await supabase
        .from('finished_products')
        .update({ quantity: newFinishedQuantity, updated_at: new Date().toISOString() })
        .eq('code', order.product_code);
        
      if (updateFinishedError) {
        console.error(`Error updating finished product ${order.product_code} quantity:`, updateFinishedError);
        throw updateFinishedError;
      }
      
      // تسجيل حركة المخزون
      await supabase
        .from('inventory_movements')
        .insert({
          item_id: order.product_code,
          item_type: 'finished_products',
          movement_type: 'packaging_addition',
          quantity: order.quantity,
          balance_after: newFinishedQuantity,
          reason: `إنتاج من أمر التعبئة ${order.code}`
        });
      
      console.log(`Inventory updated successfully for packaging order ${orderId}`);
      toast.success('تم تحديث المخزون بنجاح');
    } catch (error) {
      console.error('Error updating inventory for packaging order:', error);
      toast.error('حدث خطأ أثناء تحديث المخزون');
    }
  }

  // تحديث تكلفة أمر الإنتاج
  public async updateProductionOrderCost(orderId: number, totalCost: number): Promise<boolean> {
    try {
      console.log(`Updating production order ${orderId} cost to ${totalCost}`);
      
      const { error } = await supabase
        .from('production_orders')
        .update({ total_cost: totalCost, updated_at: new Date().toISOString() })
        .eq('id', orderId);
        
      if (error) {
        console.error(`Error updating production order ${orderId} cost:`, error);
        throw error;
      }
      
      console.log(`Production order ${orderId} cost updated to ${totalCost}`);
      return true;
    } catch (error) {
      console.error('Error updating production order cost:', error);
      toast.error('حدث خطأ أثناء تحديث تكلفة أمر الإنتاج');
      return false;
    }
  }

  // حذف أمر إنتاج
  public async deleteProductionOrder(orderId: number): Promise<boolean> {
    try {
      console.log(`Deleting production order ${orderId}`);
      
      // حذف المكونات أولاً
      const { error: ingredientsError } = await supabase
        .from('production_order_ingredients')
        .delete()
        .eq('production_order_id', orderId);
        
      if (ingredientsError) {
        console.error(`Error deleting ingredients for production order ${orderId}:`, ingredientsError);
        throw ingredientsError;
      }
      
      // ثم حذف الأمر نفسه
      const { error: orderError } = await supabase
        .from('production_orders')
        .delete()
        .eq('id', orderId);
        
      if (orderError) {
        console.error(`Error deleting production order ${orderId}:`, orderError);
        throw orderError;
      }
      
      console.log(`Production order ${orderId} deleted successfully`);
      return true;
    } catch (error) {
      console.error('Error deleting production order:', error);
      toast.error('حدث خطأ أثناء حذف أمر الإنتاج');
      return false;
    }
  }

  // حذف أمر تعبئة
  public async deletePackagingOrder(orderId: number): Promise<boolean> {
    try {
      console.log(`Deleting packaging order ${orderId}`);
      
      // حذف مواد التعبئة أولاً
      const { error: materialsError } = await supabase
        .from('packaging_order_materials')
        .delete()
        .eq('packaging_order_id', orderId);
        
      if (materialsError) {
        console.error(`Error deleting materials for packaging order ${orderId}:`, materialsError);
        throw materialsError;
      }
      
      // ثم حذف الأمر نفسه
      const { error: orderError } = await supabase
        .from('packaging_orders')
        .delete()
        .eq('id', orderId);
        
      if (orderError) {
        console.error(`Error deleting packaging order ${orderId}:`, orderError);
        throw orderError;
      }
      
      console.log(`Packaging order ${orderId} deleted successfully`);
      return true;
    } catch (error) {
      console.error('Error deleting packaging order:', error);
      toast.error('حدث خطأ أثناء حذف أمر التعبئة');
      return false;
    }
  }

  // جلب بيانات إحصائية للإنتاج
  public async getProductionStats() {
    try {
      const { data, error } = await rpcFunctions.getProductionStats();
        
      if (error) {
        console.error('Error fetching production stats:', error);
        throw error;
      }
      
      return data || { total_production_orders: 0, completed_orders: 0, pending_orders: 0, total_cost: 0 };
    } catch (error) {
      console.error('Error fetching production stats:', error);
      return { total_production_orders: 0, completed_orders: 0, pending_orders: 0, total_cost: 0 };
    }
  }

  // جلب بيانات شهرية للإنتاج
  public async getMonthlyProductionStats() {
    try {
      const { data, error } = await rpcFunctions.getMonthlyProductionStats();
        
      if (error) {
        console.error('Error fetching monthly production stats:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching monthly production stats:', error);
      return [];
    }
  }

  // تحديث أمر إنتاج
  public async updateProductionOrder(
    orderId: number,
    orderData: {
      productCode: string;
      productName: string;
      quantity: number;
      unit: string;
      ingredients: {
        code: string;
        name: string;
        requiredQuantity: number;
      }[];
      totalCost?: number;
    }
  ): Promise<boolean> {
    try {
      console.log(`Updating production order ${orderId} with data:`, orderData);
      
      // تكوين كائن التحديث
      const updateData: any = {
        product_code: orderData.productCode,
        product_name: orderData.productName,
        quantity: orderData.quantity,
        unit: orderData.unit,
        updated_at: new Date().toISOString()
      };
      
      // إضافة التكلفة الإجمالية بشكل صريح دائمًا، حتى لو كانت قيمتها صفر
      if (orderData.totalCost !== undefined) {
        updateData.total_cost = orderData.totalCost;
        console.log(`Will update total cost to: ${updateData.total_cost}`);
      }
      
      // تحديث بيانات الأمر
      const { error: orderError } = await supabase
        .from('production_orders')
        .update(updateData)
        .eq('id', orderId);
        
      if (orderError) {
        console.error(`Error updating production order ${orderId}:`, orderError);
        throw orderError;
      }
      
      console.log(`Production order ${orderId} data updated successfully`);
      
      // حذف المكونات القديمة
      const { error: deleteIngredientsError } = await supabase
        .from('production_order_ingredients')
        .delete()
        .eq('production_order_id', orderId);
        
      if (deleteIngredientsError) {
        console.error(`Error deleting ingredients for production order ${orderId}:`, deleteIngredientsError);
        throw deleteIngredientsError;
      }
      
      // إضافة المكونات الجديدة
      const ingredientsToInsert = orderData.ingredients.map(ingredient => ({
        production_order_id: orderId,
        raw_material_code: ingredient.code,
        raw_material_name: ingredient.name,
        required_quantity: ingredient.requiredQuantity
      }));
      
      console.log(`Adding ${ingredientsToInsert.length} new ingredients to production order ${orderId}`);
      
      const { error: insertIngredientsError } = await supabase
        .from('production_order_ingredients')
        .insert(ingredientsToInsert);
        
      if (insertIngredientsError) {
        console.error(`Error inserting new ingredients for production order ${orderId}:`, insertIngredientsError);
        throw insertIngredientsError;
      }
      
      // التحقق من تحديث التكلفة بنجاح
      if (orderData.totalCost !== undefined) {
        const { data: checkOrder } = await supabase
          .from('production_orders')
          .select('total_cost')
          .eq('id', orderId)
          .single();
          
        console.log(`Verified updated cost: ${checkOrder?.total_cost}`);
      }
      
      console.log(`Production order ${orderId} updated successfully`);
      return true;
    } catch (error) {
      console.error('Error updating production order:', error);
      toast.error('حدث خطأ أثناء تحديث أمر الإنتاج');
      return false;
    }
  }

  // تحديث أمر تعبئة
  public async updatePackagingOrder(
    orderId: number,
    orderData: {
      productCode: string;
      productName: string;
      quantity: number;
      unit: string;
      semiFinished: {
        code: string;
        name: string;
        quantity: number;
      };
      packagingMaterials: {
        code: string;
        name: string;
        quantity: number;
      }[];
      totalCost?: number;
    }
  ): Promise<boolean> {
    try {
      console.log(`Updating packaging order ${orderId} with data:`, orderData);
      
      // تكوين كائن التحديث
      const updateData: any = {
        product_code: orderData.productCode,
        product_name: orderData.productName,
        quantity: orderData.quantity,
        unit: orderData.unit,
        semi_finished_code: orderData.semiFinished.code,
        semi_finished_name: orderData.semiFinished.name,
        semi_finished_quantity: orderData.semiFinished.quantity,
        updated_at: new Date().toISOString()
      };
      
      // إضافة التكلفة الإجمالية بشكل صريح دائمًا، حتى لو كانت قيمتها صفر
      if (orderData.totalCost !== undefined) {
        updateData.total_cost = orderData.totalCost;
        console.log(`Will update packaging order total cost to: ${updateData.total_cost}`);
      }
      
      // تحديث بيانات الأمر
      const { error: orderError } = await supabase
        .from('packaging_orders')
        .update(updateData)
        .eq('id', orderId);
        
      if (orderError) {
        console.error(`Error updating packaging order ${orderId}:`, orderError);
        throw orderError;
      }
      
      console.log(`Packaging order ${orderId} data updated successfully`);
      
      // حذف مواد التعبئة القديمة
      const { error: deleteMaterialsError } = await supabase
        .from('packaging_order_materials')
        .delete()
        .eq('packaging_order_id', orderId);
        
      if (deleteMaterialsError) {
        console.error(`Error deleting materials for packaging order ${orderId}:`, deleteMaterialsError);
        throw deleteMaterialsError;
      }
      
      // إضافة مواد التعبئة الجديدة
      const materialsToInsert = orderData.packagingMaterials.map(material => ({
        packaging_order_id: orderId,
        packaging_material_code: material.code,
        packaging_material_name: material.name,
        required_quantity: material.quantity
      }));
      
      console.log(`Adding ${materialsToInsert.length} new packaging materials to order ${orderId}`);
      
      const { error: insertMaterialsError } = await supabase
        .from('packaging_order_materials')
        .insert(materialsToInsert);
        
      if (insertMaterialsError) {
        console.error(`Error inserting new materials for packaging order ${orderId}:`, insertMaterialsError);
        throw insertMaterialsError;
      }
      
      // التحقق من تحديث التكلفة بنجاح
      if (orderData.totalCost !== undefined) {
        const { data: checkOrder } = await supabase
          .from('packaging_orders')
          .select('total_cost')
          .eq('id', orderId)
          .single();
          
        console.log(`Verified updated packaging order cost: ${checkOrder?.total_cost}`);
      }
      
      console.log(`Packaging order ${orderId} updated successfully`);
      return true;
    } catch (error) {
      console.error('Error updating packaging order:', error);
      toast.error('حدث خطأ أثناء تحديث أمر التعبئة');
      return false;
    }
  }
}

export default ProductionDatabaseService;
