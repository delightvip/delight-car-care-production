
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ProductionOrder, 
  PackagingOrder 
} from "../production/types/ProductionTypes";

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
        
      if (error) throw error;
      
      // جلب المكونات لكل أمر إنتاج
      const ordersWithIngredients = await Promise.all(orders.map(async (order) => {
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('production_order_ingredients')
          .select('*')
          .eq('production_order_id', order.id);
          
        if (ingredientsError) throw ingredientsError;
        
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
        
      if (error) throw error;
      
      // جلب المكونات لكل أمر تعبئة
      const ordersWithMaterials = await Promise.all(orders.map(async (order) => {
        const { data: materials, error: materialsError } = await supabase
          .from('packaging_order_materials')
          .select('*')
          .eq('packaging_order_id', order.id);
          
        if (materialsError) throw materialsError;
        
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
        
      if (orderError) throw orderError;
      
      // إضافة المكونات
      const ingredientsToInsert = ingredients.map(ingredient => ({
        production_order_id: orderData.id,
        raw_material_code: ingredient.code,
        raw_material_name: ingredient.name,
        required_quantity: ingredient.requiredQuantity
      }));
      
      const { error: ingredientsError } = await supabase
        .from('production_order_ingredients')
        .insert(ingredientsToInsert);
        
      if (ingredientsError) throw ingredientsError;
      
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
        
      if (orderError) throw orderError;
      
      // إضافة مواد التعبئة
      const materialsToInsert = packagingMaterials.map(material => ({
        packaging_order_id: orderData.id,
        packaging_material_code: material.code,
        packaging_material_name: material.name,
        required_quantity: material.quantity
      }));
      
      const { error: materialsError } = await supabase
        .from('packaging_order_materials')
        .insert(materialsToInsert);
        
      if (materialsError) throw materialsError;
      
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
      const { error } = await supabase
        .from('packaging_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
        
      if (error) throw error;
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
      const { error } = await supabase
        .from('production_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating production order status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة أمر الإنتاج');
      return false;
    }
  }

  // تحديث تكلفة أمر الإنتاج
  public async updateProductionOrderCost(orderId: number, totalCost: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('production_orders')
        .update({ total_cost: totalCost, updated_at: new Date().toISOString() })
        .eq('id', orderId);
        
      if (error) throw error;
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
      // حذف المكونات أولاً
      const { error: ingredientsError } = await supabase
        .from('production_order_ingredients')
        .delete()
        .eq('production_order_id', orderId);
        
      if (ingredientsError) throw ingredientsError;
      
      // ثم حذف الأمر نفسه
      const { error: orderError } = await supabase
        .from('production_orders')
        .delete()
        .eq('id', orderId);
        
      if (orderError) throw orderError;
      
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
      // حذف مواد التعبئة أولاً
      const { error: materialsError } = await supabase
        .from('packaging_order_materials')
        .delete()
        .eq('packaging_order_id', orderId);
        
      if (materialsError) throw materialsError;
      
      // ثم حذف الأمر نفسه
      const { error: orderError } = await supabase
        .from('packaging_orders')
        .delete()
        .eq('id', orderId);
        
      if (orderError) throw orderError;
      
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
      // استخدام استعلام خاص بدلاً من RPC لتجنب مشاكل التوافق
      const { data, error } = await supabase
        .from('production_orders')
        .select('status, total_cost')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // معالجة البيانات يدوياً
      const stats = {
        total_production_orders: data.length,
        completed_orders: data.filter(order => order.status === 'completed').length,
        pending_orders: data.filter(order => order.status === 'pending').length,
        total_cost: data
          .filter(order => order.status === 'completed')
          .reduce((sum, order) => sum + (order.total_cost || 0), 0)
      };
      
      return stats;
    } catch (error) {
      console.error('Error fetching production stats:', error);
      return { total_production_orders: 0, completed_orders: 0, pending_orders: 0, total_cost: 0 };
    }
  }

  // جلب بيانات شهرية للإنتاج
  public async getMonthlyProductionStats() {
    try {
      // استخدام استعلام خاص بدلاً من RPC
      const { data, error } = await supabase
        .from('production_orders')
        .select('date, status, quantity')
        .order('date', { ascending: true });
        
      if (error) throw error;
      
      // معالجة البيانات لتجميعها حسب الشهر
      const monthlyData: Record<string, { month: string, completed: number, pending: number }> = {};
      
      data.forEach(order => {
        // استخراج الشهر والسنة من التاريخ (مثل 2023-05)
        const monthKey = order.date.substring(0, 7);
        
        // إنشاء مدخل جديد للشهر إذا لم يكن موجوداً
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            completed: 0,
            pending: 0
          };
        }
        
        // تحديث الإحصائيات حسب حالة الأمر
        if (order.status === 'completed') {
          monthlyData[monthKey].completed += order.quantity || 0;
        } else if (order.status === 'pending') {
          monthlyData[monthKey].pending += order.quantity || 0;
        }
      });
      
      // تحويل النتائج إلى مصفوفة
      return Object.values(monthlyData);
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
    }
  ): Promise<boolean> {
    try {
      // تحديث بيانات الأمر
      const { error: orderError } = await supabase
        .from('production_orders')
        .update({
          product_code: orderData.productCode,
          product_name: orderData.productName,
          quantity: orderData.quantity,
          unit: orderData.unit,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
        
      if (orderError) throw orderError;
      
      // حذف المكونات القديمة
      const { error: deleteIngredientsError } = await supabase
        .from('production_order_ingredients')
        .delete()
        .eq('production_order_id', orderId);
        
      if (deleteIngredientsError) throw deleteIngredientsError;
      
      // إضافة المكونات الجديدة
      const ingredientsToInsert = orderData.ingredients.map(ingredient => ({
        production_order_id: orderId,
        raw_material_code: ingredient.code,
        raw_material_name: ingredient.name,
        required_quantity: ingredient.requiredQuantity
      }));
      
      const { error: insertIngredientsError } = await supabase
        .from('production_order_ingredients')
        .insert(ingredientsToInsert);
        
      if (insertIngredientsError) throw insertIngredientsError;
      
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
    }
  ): Promise<boolean> {
    try {
      // تحديث بيانات الأمر
      const { error: orderError } = await supabase
        .from('packaging_orders')
        .update({
          product_code: orderData.productCode,
          product_name: orderData.productName,
          quantity: orderData.quantity,
          unit: orderData.unit,
          semi_finished_code: orderData.semiFinished.code,
          semi_finished_name: orderData.semiFinished.name,
          semi_finished_quantity: orderData.semiFinished.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
        
      if (orderError) throw orderError;
      
      // حذف مواد التعبئة القديمة
      const { error: deleteMaterialsError } = await supabase
        .from('packaging_order_materials')
        .delete()
        .eq('packaging_order_id', orderId);
        
      if (deleteMaterialsError) throw deleteMaterialsError;
      
      // إضافة مواد التعبئة الجديدة
      const materialsToInsert = orderData.packagingMaterials.map(material => ({
        packaging_order_id: orderId,
        packaging_material_code: material.code,
        packaging_material_name: material.name,
        required_quantity: material.quantity
      }));
      
      const { error: insertMaterialsError } = await supabase
        .from('packaging_order_materials')
        .insert(materialsToInsert);
        
      if (insertMaterialsError) throw insertMaterialsError;
      
      return true;
    } catch (error) {
      console.error('Error updating packaging order:', error);
      toast.error('حدث خطأ أثناء تحديث أمر التعبئة');
      return false;
    }
  }
}

export default ProductionDatabaseService;
