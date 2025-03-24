import { supabase } from "@/integrations/supabase/client";
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
          id: 0, // سيتم تحديثها لاحقاً
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
          status: 'pending' as "pending",
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

  // تحديث حالة أمر الإنتاج
  public async updateProductionOrderStatus(orderId: number, newStatus: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('production_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
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
      toast.error('حدث خطأ أثناء تحديث تكلفة أمر الإنتا��');
      return false;
    }
  }
  
  // تحديث بيانات أمر الإنتاج
  public async updateProductionOrder(
    orderId: number,
    data: {
      productCode?: string;
      productName?: string;
      quantity?: number;
      unit?: string;
      ingredients?: {
        code: string;
        name: string;
        requiredQuantity: number;
      }[];
    }
  ): Promise<boolean> {
    try {
      // تحديث بيانات أمر الإنتاج
      if (data.productCode || data.productName || data.quantity || data.unit) {
        const updateData: any = {};
        if (data.productCode) updateData.product_code = data.productCode;
        if (data.productName) updateData.product_name = data.productName;
        if (data.quantity) updateData.quantity = data.quantity;
        if (data.unit) updateData.unit = data.unit;
        
        const { error: orderError } = await supabase
          .from('production_orders')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', orderId);
          
        if (orderError) throw orderError;
      }
      
      // تحديث مكونات أمر الإنتاج
      if (data.ingredients && data.ingredients.length > 0) {
        // حذف المكونات القديمة
        const { error: deleteError } = await supabase
          .from('production_order_ingredients')
          .delete()
          .eq('production_order_id', orderId);
          
        if (deleteError) throw deleteError;
        
        // إضافة المكونات الجديدة
        const ingredientsToInsert = data.ingredients.map(ingredient => ({
          production_order_id: orderId,
          raw_material_code: ingredient.code,
          raw_material_name: ingredient.name,
          required_quantity: ingredient.requiredQuantity
        }));
        
        const { error: ingredientsError } = await supabase
          .from('production_order_ingredients')
          .insert(ingredientsToInsert);
          
        if (ingredientsError) throw ingredientsError;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating production order:', error);
      toast.error('حدث خطأ أثناء تحديث أمر الإنتاج');
      return false;
    }
  }
  
  // تحديث بيانات أمر التعبئة
  public async updatePackagingOrder(
    orderId: number,
    data: {
      productCode?: string;
      productName?: string;
      quantity?: number;
      unit?: string;
      semiFinished?: {
        code: string;
        name: string;
        quantity: number;
      };
      packagingMaterials?: {
        code: string;
        name: string;
        quantity: number;
      }[];
    }
  ): Promise<boolean> {
    try {
      // تحديث بيانات أمر التعبئة
      const updateData: any = {};
      if (data.productCode) updateData.product_code = data.productCode;
      if (data.productName) updateData.product_name = data.productName;
      if (data.quantity) updateData.quantity = data.quantity;
      if (data.unit) updateData.unit = data.unit;
      
      if (data.semiFinished) {
        updateData.semi_finished_code = data.semiFinished.code;
        updateData.semi_finished_name = data.semiFinished.name;
        updateData.semi_finished_quantity = data.semiFinished.quantity;
      }
      
      if (Object.keys(updateData).length > 0) {
        const { error: orderError } = await supabase
          .from('packaging_orders')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', orderId);
          
        if (orderError) throw orderError;
      }
      
      // تحديث مواد التعبئة
      if (data.packagingMaterials && data.packagingMaterials.length > 0) {
        // حذف المواد القديمة
        const { error: deleteError } = await supabase
          .from('packaging_order_materials')
          .delete()
          .eq('packaging_order_id', orderId);
          
        if (deleteError) throw deleteError;
        
        // إضافة المواد الجديدة
        const materialsToInsert = data.packagingMaterials.map(material => ({
          packaging_order_id: orderId,
          packaging_material_code: material.code,
          packaging_material_name: material.name,
          required_quantity: material.quantity
        }));
        
        const { error: materialsError } = await supabase
          .from('packaging_order_materials')
          .insert(materialsToInsert);
          
        if (materialsError) throw materialsError;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating packaging order:', error);
      toast.error('حدث خطأ أثناء تحديث أمر التعبئة');
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

  // الحصول على بيانات إحصائية للإنتاج
  public async getProductionStats() {
    try {
      const { data: productionOrders, error: productionError } = await supabase
        .from('production_orders')
        .select('status');
        
      if (productionError) throw productionError;
      
      const { data: packagingOrders, error: packagingError } = await supabase
        .from('packaging_orders')
        .select('status');
        
      if (packagingError) throw packagingError;
      
      const totalOrders = productionOrders.length;
      const pendingOrders = productionOrders.filter(order => order.status === 'pending').length;
      const inProgressOrders = productionOrders.filter(order => order.status === 'inProgress').length;
      const completedOrders = productionOrders.filter(order => order.status === 'completed').length;
      
      const totalPackagingOrders = packagingOrders.length;
      const pendingPackagingOrders = packagingOrders.filter(order => order.status === 'pending').length;
      const inProgressPackagingOrders = packagingOrders.filter(order => order.status === 'inProgress').length;
      const completedPackagingOrders = packagingOrders.filter(order => order.status === 'completed').length;
      
      return {
        production: {
          total: totalOrders,
          pending: pendingOrders,
          inProgress: inProgressOrders,
          completed: completedOrders
        },
        packaging: {
          total: totalPackagingOrders,
          pending: pendingPackagingOrders,
          inProgress: inProgressPackagingOrders,
          completed: completedPackagingOrders
        }
      };
    } catch (error) {
      console.error('Error fetching production stats:', error);
      return {
        production: { total: 0, pending: 0, inProgress: 0, completed: 0 },
        packaging: { total: 0, pending: 0, inProgress: 0, completed: 0 }
      };
    }
  }

  // جلب إحصائيات شهرية للإنتاج والتعبئة
  public async getMonthlyProductionStats() {
    try {
      // جلب أوامر الإنتاج المكتملة خلال آخر 6 أشهر
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoDate = sixMonthsAgo.toISOString().split('T')[0];
      
      const { data: productionOrders, error: productionError } = await supabase
        .from('production_orders')
        .select('date, quantity')
        .gte('date', sixMonthsAgoDate);
        
      if (productionError) throw productionError;
      
      const { data: packagingOrders, error: packagingError } = await supabase
        .from('packaging_orders')
        .select('date, quantity')
        .gte('date', sixMonthsAgoDate);
        
      if (packagingError) throw packagingError;
      
      // تحويل البيانات إلى تجميع شهري
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      
      // تهيئة مصفوفة لآخر 6 أشهر
      const lastSixMonths = [];
      const currentDate = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(currentDate.getMonth() - i);
        const monthYear = monthDate.getFullYear();
        const monthIndex = monthDate.getMonth();
        
        lastSixMonths.push({
          month: months[monthIndex],
          year: monthYear,
          monthIndex: monthIndex,
          production: 0,
          packaging: 0
        });
      }
      
      // تجميع كميات الإنتاج حسب الشهر
      productionOrders.forEach(order => {
        const orderDate = new Date(order.date);
        const monthIndex = orderDate.getMonth();
        const year = orderDate.getFullYear();
        
        const monthEntry = lastSixMonths.find(m => m.monthIndex === monthIndex && m.year === year);
        if (monthEntry) {
          monthEntry.production += Number(order.quantity);
        }
      });
      
      // تجميع كميات التعبئة حسب الشهر
      packagingOrders.forEach(order => {
        const orderDate = new Date(order.date);
        const monthIndex = orderDate.getMonth();
        const year = orderDate.getFullYear();
        
        const monthEntry = lastSixMonths.find(m => m.monthIndex === monthIndex && m.year === year);
        if (monthEntry) {
          monthEntry.packaging += Number(order.quantity);
        }
      });
      
      // تنسيق البيانات للرسم البياني
      return lastSixMonths.map(entry => ({
        month: entry.month,
        production: entry.production,
        packaging: entry.packaging
      }));
    } catch (error) {
      console.error('Error fetching monthly production stats:', error);
      return [
        { month: 'يناير', production: 0, packaging: 0 },
        { month: 'فبراير', production: 0, packaging: 0 },
        { month: 'مارس', production: 0, packaging: 0 },
        { month: 'أبريل', production: 0, packaging: 0 },
        { month: 'مايو', production: 0, packaging: 0 },
        { month: 'يونيو', production: 0, packaging: 0 }
      ];
    }
  }

  // توليد كود جديد للأمر
  private generateOrderCode(type: 'production' | 'packaging'): string {
    const date = new Date();
    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(5, '0');
    
    const prefix = type === 'production' ? 'PROD' : 'PACK';
    return `${prefix}-${year}${month}${day}-${random}`;
  }
}

export default ProductionDatabaseService;
