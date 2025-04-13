
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

class ProductionDatabaseService {
  private static instance: ProductionDatabaseService;
  
  private constructor() {}
  
  public static getInstance(): ProductionDatabaseService {
    if (!ProductionDatabaseService.instance) {
      ProductionDatabaseService.instance = new ProductionDatabaseService();
    }
    return ProductionDatabaseService.instance;
  }
  
  // الحصول على أوامر الإنتاج
  public async getProductionOrders() {
    try {
      const { data: orders, error } = await supabase
        .from('production_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // الحصول على مكونات كل أمر إنتاج
      const ordersWithIngredients = await Promise.all(orders.map(async (order) => {
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('production_order_ingredients')
          .select('*')
          .eq('production_order_id', order.id);
        
        if (ingredientsError) throw ingredientsError;
        
        // الحصول على المعلومات الحالية للمواد من قاعدة البيانات لمعرفة توفرها
        const ingredientsWithAvailability = await Promise.all(ingredients.map(async (ingredient) => {
          const { data: rawMaterial } = await supabase
            .from('raw_materials')
            .select('quantity')
            .eq('code', ingredient.raw_material_code)
            .single();
          
          const available = rawMaterial ? rawMaterial.quantity >= ingredient.required_quantity : false;
          
          return {
            id: ingredient.id,
            code: ingredient.raw_material_code,
            name: ingredient.raw_material_name,
            requiredQuantity: ingredient.required_quantity,
            available
          };
        }));
        
        return {
          id: order.id,
          code: order.code,
          productCode: order.product_code,
          productName: order.product_name,
          quantity: order.quantity,
          unit: order.unit,
          status: order.status,
          date: order.date,
          ingredients: ingredientsWithAvailability,
          totalCost: order.total_cost
        };
      }));
      
      return ordersWithIngredients;
    } catch (error) {
      console.error('Error fetching production orders:', error);
      return [];
    }
  }
  
  // الحصول على أوامر التعبئة
  public async getPackagingOrders() {
    try {
      const { data: orders, error } = await supabase
        .from('packaging_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // الحصول على مواد التعبئة لكل أمر
      const ordersWithMaterials = await Promise.all(orders.map(async (order) => {
        const { data: materials, error: materialsError } = await supabase
          .from('packaging_order_materials')
          .select('*')
          .eq('packaging_order_id', order.id);
        
        if (materialsError) throw materialsError;
        
        // الحصول على حالة توفر المنتج النصف مصنع
        const { data: semiFinished } = await supabase
          .from('semi_finished_products')
          .select('quantity')
          .eq('code', order.semi_finished_code)
          .single();
        
        const semiFinishedAvailable = semiFinished ? 
          semiFinished.quantity >= order.semi_finished_quantity : false;
        
        // الحصول على حالة توفر مواد التعبئة
        const materialsWithAvailability = await Promise.all(materials.map(async (material) => {
          const { data: packagingMaterial } = await supabase
            .from('packaging_materials')
            .select('quantity')
            .eq('code', material.packaging_material_code)
            .single();
          
          const available = packagingMaterial ? 
            packagingMaterial.quantity >= material.required_quantity : false;
          
          return {
            code: material.packaging_material_code,
            name: material.packaging_material_name,
            quantity: material.required_quantity,
            available
          };
        }));
        
        return {
          id: order.id,
          code: order.code,
          productCode: order.product_code,
          productName: order.product_name,
          quantity: order.quantity,
          unit: order.unit,
          status: order.status,
          date: order.date,
          semiFinished: {
            code: order.semi_finished_code,
            name: order.semi_finished_name,
            quantity: order.semi_finished_quantity,
            available: semiFinishedAvailable
          },
          packagingMaterials: materialsWithAvailability,
          totalCost: order.total_cost
        };
      }));
      
      return ordersWithMaterials;
    } catch (error) {
      console.error('Error fetching packaging orders:', error);
      return [];
    }
  }
  
  // إنشاء أمر إنتاج جديد
  public async createProductionOrder(
    productCode: string,
    productName: string,
    quantity: number,
    unit: string,
    ingredients: {
      code: string;
      name: string;
      requiredQuantity: number;
    }[],
    totalCost: number = 0
  ) {
    const now = new Date();
    
    try {
      // إنشاء رمز فريد للأمر
      const { data: lastOrder } = await supabase
        .from('production_orders')
        .select('code')
        .order('id', { ascending: false })
        .limit(1);
      
      let newCode = 'PRD-00001';
      if (lastOrder && lastOrder.length > 0) {
        const lastNumber = parseInt(lastOrder[0].code.split('-')[1]);
        newCode = `PRD-${String(lastNumber + 1).padStart(5, '0')}`;
      }
      
      // إنشاء الأمر
      const { data, error } = await supabase
        .from('production_orders')
        .insert({
          code: newCode,
          product_code: productCode,
          product_name: productName,
          quantity: quantity,
          unit: unit,
          status: 'pending',
          date: now.toISOString().split('T')[0],
          total_cost: totalCost
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // إضافة المكونات
      for (const ingredient of ingredients) {
        const { error: ingredientError } = await supabase
          .from('production_order_ingredients')
          .insert({
            production_order_id: data.id,
            raw_material_code: ingredient.code,
            raw_material_name: ingredient.name,
            required_quantity: ingredient.requiredQuantity
          });
        
        if (ingredientError) throw ingredientError;
      }
      
      // استرجاع مكونات الأمر مع معلومات التوفر
      const ingredientsWithAvailability = await Promise.all(ingredients.map(async (ingredient) => {
        const { data: rawMaterial } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('code', ingredient.code)
          .single();
        
        const available = rawMaterial ? rawMaterial.quantity >= ingredient.requiredQuantity : false;
        
        return {
          code: ingredient.code,
          name: ingredient.name,
          requiredQuantity: ingredient.requiredQuantity,
          available
        };
      }));
      
      // تنسيق البيانات للإرجاع
      return {
        id: data.id,
        code: data.code,
        productCode: data.product_code,
        productName: data.product_name,
        quantity: data.quantity,
        unit: data.unit,
        status: data.status,
        date: data.date,
        ingredients: ingredientsWithAvailability,
        totalCost: data.total_cost
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
    semiFinished: {
      code: string;
      name: string;
      quantity: number;
    },
    packagingMaterials: {
      code: string;
      name: string;
      quantity: number;
      available?: boolean;
    }[],
    totalCost: number = 0
  ) {
    const now = new Date();
    
    try {
      // إنشاء رمز فريد للأمر
      const { data: lastOrder } = await supabase
        .from('packaging_orders')
        .select('code')
        .order('id', { ascending: false })
        .limit(1);
      
      let newCode = 'PKG-00001';
      if (lastOrder && lastOrder.length > 0) {
        const lastNumber = parseInt(lastOrder[0].code.split('-')[1]);
        newCode = `PKG-${String(lastNumber + 1).padStart(5, '0')}`;
      }
      
      console.log("Semi-finished quantity in createPackagingOrder:", semiFinished.quantity);
      
      // إنشاء الأمر
      const { data, error } = await supabase
        .from('packaging_orders')
        .insert({
          code: newCode,
          product_code: productCode,
          product_name: productName,
          quantity: quantity,
          unit: unit,
          status: 'pending',
          date: now.toISOString().split('T')[0],
          semi_finished_code: semiFinished.code,
          semi_finished_name: semiFinished.name,
          semi_finished_quantity: semiFinished.quantity,
          total_cost: totalCost
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // إضافة مواد التعبئة
      for (const material of packagingMaterials) {
        const { error: materialError } = await supabase
          .from('packaging_order_materials')
          .insert({
            packaging_order_id: data.id,
            packaging_material_code: material.code,
            packaging_material_name: material.name,
            required_quantity: material.quantity
          });
        
        if (materialError) throw materialError;
      }
      
      // الحصول على حالة توفر المنتج النصف مصنع
      const { data: semiFinishedProduct } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('code', semiFinished.code)
        .single();
      
      const semiFinishedAvailable = semiFinishedProduct ? 
        semiFinishedProduct.quantity >= semiFinished.quantity : false;
      
      // الحصول على حالة توفر مواد التعبئة
      const materialsWithAvailability = await Promise.all(packagingMaterials.map(async (material) => {
        const { data: packagingMaterial } = await supabase
          .from('packaging_materials')
          .select('quantity')
          .eq('code', material.code)
          .single();
        
        const available = packagingMaterial ? 
          packagingMaterial.quantity >= material.quantity : false;
        
        return {
          code: material.code,
          name: material.name,
          quantity: material.quantity,
          available
        };
      }));
      
      // تنسيق البيانات للإرجاع
      return {
        id: data.id,
        code: data.code,
        productCode: data.product_code,
        productName: data.product_name,
        quantity: data.quantity,
        unit: data.unit,
        status: data.status,
        date: data.date,
        semiFinished: {
          code: data.semi_finished_code,
          name: data.semi_finished_name,
          quantity: data.semi_finished_quantity,
          available: semiFinishedAvailable
        },
        packagingMaterials: materialsWithAvailability,
        totalCost: data.total_cost
      };
    } catch (error) {
      console.error('Error creating packaging order:', error);
      toast.error('حدث خطأ أثناء إنشاء أمر التعبئة');
      return null;
    }
  }
  
  // تحديث حالة أمر إنتاج
  public async updateProductionOrderStatus(orderId: number, status: string) {
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
  
  // تحديث حالة أمر تعبئة
  public async updatePackagingOrderStatus(orderId: number, status: string) {
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
  
  // تحديث تكلفة أمر إنتاج
  public async updateProductionOrderCost(orderId: number, totalCost: number) {
    try {
      const { error } = await supabase
        .from('production_orders')
        .update({ total_cost: totalCost, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating production order cost:', error);
      return false;
    }
  }
  
  // حذف أمر إنتاج
  public async deleteProductionOrder(orderId: number) {
    try {
      // حذف المكونات أولاً لضمان عدم حدوث أخطاء في القيود الخارجية
      const { error: ingredientsError } = await supabase
        .from('production_order_ingredients')
        .delete()
        .eq('production_order_id', orderId);
      
      if (ingredientsError) throw ingredientsError;
      
      // ثم حذف الأمر نفسه
      const { error } = await supabase
        .from('production_orders')
        .delete()
        .eq('id', orderId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting production order:', error);
      toast.error('حدث خطأ أثناء حذف أمر الإنتاج');
      return false;
    }
  }
  
  // حذف أمر تعبئة
  public async deletePackagingOrder(orderId: number) {
    try {
      // حذف مواد التعبئة أولاً لضمان عدم حدوث أخطاء في القيود الخارجية
      const { error: materialsError } = await supabase
        .from('packaging_order_materials')
        .delete()
        .eq('packaging_order_id', orderId);
      
      if (materialsError) throw materialsError;
      
      // ثم حذف الأمر نفسه
      const { error } = await supabase
        .from('packaging_orders')
        .delete()
        .eq('id', orderId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting packaging order:', error);
      toast.error('حدث خطأ أثناء حذف أمر التعبئة');
      return false;
    }
  }

  // الحصول على إحصائيات الإنتاج
  public async getProductionStats() {
    try {
      // إجمالي أوامر الإنتاج
      const { count: productionCount } = await supabase
        .from('production_orders')
        .select('*', { count: 'exact', head: true });
      
      // إجمالي أوامر التعبئة
      const { count: packagingCount } = await supabase
        .from('packaging_orders')
        .select('*', { count: 'exact', head: true });
      
      // أوامر الإنتاج حسب الحالة
      const { data: productionByStatus } = await supabase
        .from('production_orders')
        .select('status, count(*)')
        .group('status');
      
      // أوامر التعبئة حسب الحالة
      const { data: packagingByStatus } = await supabase
        .from('packaging_orders')
        .select('status, count(*)')
        .group('status');
      
      return {
        totalProductionOrders: productionCount || 0,
        totalPackagingOrders: packagingCount || 0,
        productionByStatus: productionByStatus || [],
        packagingByStatus: packagingByStatus || []
      };
    } catch (error) {
      console.error('Error getting production stats:', error);
      return {
        totalProductionOrders: 0,
        totalPackagingOrders: 0,
        productionByStatus: [],
        packagingByStatus: []
      };
    }
  }
  
  // الحصول على إحصائيات الإنتاج الشهرية
  public async getMonthlyProductionStats() {
    try {
      // أوامر الإنتاج الشهرية
      const { data: productionMonthly } = await supabase.rpc('get_monthly_production_stats');
      
      // أوامر التعبئة الشهرية
      const { data: packagingMonthly } = await supabase.rpc('get_monthly_packaging_stats');
      
      return {
        productionMonthly: productionMonthly || [],
        packagingMonthly: packagingMonthly || []
      };
    } catch (error) {
      console.error('Error getting monthly production stats:', error);
      // إذا كانت الوظائف الخاصة غير موجودة، نقوم بمحاولة الحصول على البيانات بطريقة مختلفة
      try {
        // أوامر الإنتاج حسب الشهر
        const { data: productionByMonth } = await supabase
          .from('production_orders')
          .select('date')
          .order('date', { ascending: true });
        
        // أوامر التعبئة حسب الشهر
        const { data: packagingByMonth } = await supabase
          .from('packaging_orders')
          .select('date')
          .order('date', { ascending: true });
        
        // معالجة البيانات لتجميعها حسب الشهر
        const productionMonthly = this.groupByMonth(productionByMonth || []);
        const packagingMonthly = this.groupByMonth(packagingByMonth || []);
        
        return {
          productionMonthly,
          packagingMonthly
        };
      } catch (error) {
        console.error('Error in fallback monthly stats:', error);
        return {
          productionMonthly: [],
          packagingMonthly: []
        };
      }
    }
  }
  
  // تجميع البيانات حسب الشهر
  private groupByMonth(data: { date: string }[]) {
    const monthlyData: { [key: string]: number } = {};
    
    data.forEach(item => {
      const monthYear = item.date.substring(0, 7); // استخراج السنة والشهر فقط (YYYY-MM)
      monthlyData[monthYear] = (monthlyData[monthYear] || 0) + 1;
    });
    
    // تحويل البيانات إلى صيغة قابلة للاستخدام في الرسم البياني
    return Object.entries(monthlyData).map(([month, count]) => ({
      month,
      count
    }));
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
      totalCost: number;
    }
  ) {
    try {
      // تحديث بيانات الأمر الرئيسية
      const { error } = await supabase
        .from('production_orders')
        .update({
          product_code: orderData.productCode,
          product_name: orderData.productName,
          quantity: orderData.quantity,
          unit: orderData.unit,
          total_cost: orderData.totalCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (error) throw error;
      
      // حذف المكونات الحالية
      const { error: deleteError } = await supabase
        .from('production_order_ingredients')
        .delete()
        .eq('production_order_id', orderId);
      
      if (deleteError) throw deleteError;
      
      // إضافة المكونات الجديدة
      for (const ingredient of orderData.ingredients) {
        const { error: ingredientError } = await supabase
          .from('production_order_ingredients')
          .insert({
            production_order_id: orderId,
            raw_material_code: ingredient.code,
            raw_material_name: ingredient.name,
            required_quantity: ingredient.requiredQuantity
          });
        
        if (ingredientError) throw ingredientError;
      }
      
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
      totalCost: number;
    }
  ) {
    try {
      console.log("Semi-finished quantity in updatePackagingOrder:", orderData.semiFinished.quantity);
      
      // تحديث بيانات الأمر الرئيسية
      const { error } = await supabase
        .from('packaging_orders')
        .update({
          product_code: orderData.productCode,
          product_name: orderData.productName,
          quantity: orderData.quantity,
          unit: orderData.unit,
          semi_finished_code: orderData.semiFinished.code,
          semi_finished_name: orderData.semiFinished.name,
          semi_finished_quantity: orderData.semiFinished.quantity,
          total_cost: orderData.totalCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (error) throw error;
      
      // حذف مواد التعبئة الحالية
      const { error: deleteError } = await supabase
        .from('packaging_order_materials')
        .delete()
        .eq('packaging_order_id', orderId);
      
      if (deleteError) throw deleteError;
      
      // إضافة مواد التعبئة الجديدة
      for (const material of orderData.packagingMaterials) {
        const { error: materialError } = await supabase
          .from('packaging_order_materials')
          .insert({
            packaging_order_id: orderId,
            packaging_material_code: material.code,
            packaging_material_name: material.name,
            required_quantity: material.quantity
          });
        
        if (materialError) throw materialError;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating packaging order:', error);
      toast.error('حدث خطأ أثناء تحديث أمر التعبئة');
      return false;
    }
  }
}

export default ProductionDatabaseService;
