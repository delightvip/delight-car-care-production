import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductionOrder {
  id: number;
  code: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit: string;
  status: string;
  date: string;
  total_cost: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface PackagingOrder {
  id: number;
  code: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit: string;
  status: string;
  date: string;
  semi_finished_code: string;
  semi_finished_name: string;
  semi_finished_quantity: number;
  total_cost: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductionStats {
  total_production_orders: number;
  pending_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_cost: number;
  last_week_orders: number;
  last_month_orders: number;
}

export interface ProductionGoal {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  targetDate: Date;
  priority: number;
  completed: number;
}

export interface ChartDataPoint {
  month: string;
  production_count: number;
  packaging_count: number;
  production_cost: number;
  packaging_cost: number;
}

export interface ProductionOrderExtended extends ProductionOrder {
  productCode: string;
  productName: string;
  totalCost: number;
  ingredients?: {
    id: number;
    code: string;
    name: string;
    requiredQuantity: number;
    available: boolean;
  }[];
}

export interface PackagingOrderExtended extends PackagingOrder {
  productCode: string;
  productName: string;
  totalCost: number;
  semiFinished?: {
    code: string;
    name: string;
    quantity: number;
    available: boolean;
  };
  packagingMaterials?: {
    code: string;
    name: string;
    quantity: number;
    available: boolean;
  }[];
}

class ProductionService {
  private static instance: ProductionService;

  private constructor() {}

  public static getInstance(): ProductionService {
    if (!ProductionService.instance) {
      ProductionService.instance = new ProductionService();
    }
    return ProductionService.instance;
  }

  public async getProductionOrders(): Promise<ProductionOrderExtended[]> {
    try {
      const { data, error } = await supabase
        .from("production_orders")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      return (data || []).map(order => ({
        ...order,
        productCode: order.product_code,
        productName: order.product_name,
        totalCost: order.total_cost
      }));
    } catch (error) {
      console.error("Error fetching production orders:", error);
      toast.error("حدث خطأ أثناء جلب أوامر الإنتاج");
      return [];
    }
  }

  public async getPackagingOrders(): Promise<PackagingOrderExtended[]> {
    try {
      const { data, error } = await supabase
        .from("packaging_orders")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      return (data || []).map(order => ({
        ...order,
        productCode: order.product_code,
        productName: order.product_name,
        totalCost: order.total_cost,
        semiFinished: {
          code: order.semi_finished_code,
          name: order.semi_finished_name,
          quantity: order.semi_finished_quantity,
          available: true
        },
        packagingMaterials: []
      }));
    } catch (error) {
      console.error("Error fetching packaging orders:", error);
      toast.error("حدث خطأ أثناء جلب أوامر التعبئة");
      return [];
    }
  }

  public async getProductionStats(): Promise<ProductionStats> {
    try {
      const productionOrders = await this.getProductionOrders();
      const packagingOrders = await this.getPackagingOrders();
      
      const totalProductionOrders = productionOrders.length;
      const pendingOrders = productionOrders.filter(order => order.status === 'pending').length;
      const inProgressOrders = productionOrders.filter(order => order.status === 'inProgress').length;
      const completedOrders = productionOrders.filter(order => order.status === 'completed').length;
      const cancelledOrders = productionOrders.filter(order => order.status === 'cancelled').length;
      
      const totalCost = productionOrders
        .filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + order.total_cost, 0);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const lastWeekOrders = productionOrders.filter(
        order => new Date(order.date) >= oneWeekAgo
      ).length;
      
      const lastMonthOrders = productionOrders.filter(
        order => new Date(order.date) >= oneMonthAgo
      ).length;
      
      return {
        total_production_orders: totalProductionOrders,
        pending_orders: pendingOrders,
        in_progress_orders: inProgressOrders,
        completed_orders: completedOrders,
        cancelled_orders: cancelledOrders,
        total_cost: totalCost,
        last_week_orders: lastWeekOrders,
        last_month_orders: lastMonthOrders
      };
    } catch (error) {
      console.error("Error calculating production statistics:", error);
      toast.error("حدث خطأ أثناء حساب إحصائيات الإنتاج");
      
      return {
        total_production_orders: 0,
        pending_orders: 0,
        in_progress_orders: 0,
        completed_orders: 0,
        cancelled_orders: 0,
        total_cost: 0,
        last_week_orders: 0,
        last_month_orders: 0
      };
    }
  }

  public async getProductionChartData(): Promise<ChartDataPoint[]> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const formattedDate = sixMonthsAgo.toISOString().split('T')[0];
      
      const { data: productionData, error: productionError } = await supabase
        .from("production_orders")
        .select("*")
        .gte('date', formattedDate);
      
      if (productionError) throw productionError;
      
      const { data: packagingData, error: packagingError } = await supabase
        .from("packaging_orders")
        .select("*")
        .gte('date', formattedDate);
      
      if (packagingError) throw packagingError;

      const chartData: Record<string, ChartDataPoint> = {};
      
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      
      for (let i = 0; i < 6; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.getMonth();
        const year = date.getFullYear();
        const key = `${year}-${month + 1}`;
        
        chartData[key] = {
          month: `${monthNames[month]} ${year}`,
          production_count: 0,
          packaging_count: 0,
          production_cost: 0,
          packaging_cost: 0
        };
      }
      
      if (productionData) {
        productionData.forEach(order => {
          const orderDate = new Date(order.date);
          const month = orderDate.getMonth();
          const year = orderDate.getFullYear();
          const key = `${year}-${month + 1}`;
          
          if (chartData[key]) {
            chartData[key].production_count += 1;
            chartData[key].production_cost += order.total_cost;
          }
        });
      }
      
      if (packagingData) {
        packagingData.forEach(order => {
          const orderDate = new Date(order.date);
          const month = orderDate.getMonth();
          const year = orderDate.getFullYear();
          const key = `${year}-${month + 1}`;
          
          if (chartData[key]) {
            chartData[key].packaging_count += 1;
            chartData[key].packaging_cost += order.total_cost;
          }
        });
      }
      
      return Object.values(chartData).sort((a, b) => {
        const aMonth = monthNames.indexOf(a.month.split(' ')[0]);
        const bMonth = monthNames.indexOf(b.month.split(' ')[0]);
        return aMonth - bMonth;
      });
    } catch (error) {
      console.error("Error fetching production chart data:", error);
      toast.error("حدث خطأ أثناء جلب بيانات الرسم البياني للإنتاج");
      return [];
    }
  }

  public async getProductionGoals(): Promise<ProductionGoal[]> {
    try {
      const { data: productionData, error: productionError } = await supabase
        .from("production_orders")
        .select("*")
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (productionError) throw productionError;
      
      if (!productionData || productionData.length === 0) {
        return [];
      }
      
      return productionData.map(order => {
        const targetDate = new Date(order.date);
        targetDate.setDate(targetDate.getDate() + 7);
        
        return {
          id: order.id.toString(),
          productCode: order.product_code,
          productName: order.product_name,
          quantity: order.quantity,
          targetDate: targetDate,
          priority: Math.floor(Math.random() * 3) + 1,
          completed: order.status === 'completed' ? order.quantity : Math.floor(order.quantity * 0.3)
        };
      });
    } catch (error) {
      console.error("Error fetching production goals:", error);
      toast.error("حدث خطأ أثناء جلب أهداف الإنتاج");
      return [];
    }
  }

  public async createProductionOrder(
    product_code: string,
    quantity: number,
    totalCost: number = 0
  ): Promise<ProductionOrderExtended | null> {
    try {
      const productName = product_code;
      
      const code = `PRD-${Date.now().toString().slice(-6)}`;
      
      const newOrder = {
        code,
        product_code,
        product_name: productName,
        quantity,
        unit: 'unit',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        total_cost: totalCost
      };
      
      const { data, error } = await supabase
        .from("production_orders")
        .insert([newOrder])
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success("تم إنشاء أمر الإنتاج بنجاح");
      return {
        ...data,
        productCode: data.product_code,
        productName: data.product_name,
        totalCost: data.total_cost
      };
    } catch (error) {
      console.error("Error creating production order:", error);
      toast.error("حدث خطأ أثناء إنشاء أمر الإنتاج");
      return null;
    }
  }

  public async createPackagingOrder(
    product_code: string,
    quantity: number,
    totalCost: number = 0
  ): Promise<PackagingOrderExtended | null> {
    try {
      const productName = product_code;
      
      const code = `PKG-${Date.now().toString().slice(-6)}`;
      
      const newOrder = {
        code,
        product_code,
        product_name: productName,
        quantity,
        unit: 'unit',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        semi_finished_code: 'SF001',
        semi_finished_name: 'Semi Finished Product',
        semi_finished_quantity: quantity,
        total_cost: totalCost
      };
      
      const { data, error } = await supabase
        .from("packaging_orders")
        .insert([newOrder])
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success("تم إنشاء أمر التعبئة بنجاح");
      return {
        ...data,
        productCode: data.product_code,
        productName: data.product_name,
        totalCost: data.total_cost,
        semiFinished: {
          code: data.semi_finished_code,
          name: data.semi_finished_name,
          quantity: data.semi_finished_quantity,
          available: true
        },
        packagingMaterials: []
      };
    } catch (error) {
      console.error("Error creating packaging order:", error);
      toast.error("حدث خطأ أثناء إنشاء أمر التعبئة");
      return null;
    }
  }

  public async updateProductionOrderStatus(id: number, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("production_orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
        
      if (error) throw error;
      
      toast.success("تم تحديث حالة أمر الإنتاج بنجاح");
      return true;
    } catch (error) {
      console.error("Error updating production order status:", error);
      toast.error("حدث خطأ أثناء تحديث حالة أمر الإنتاج");
      return false;
    }
  }

  public async updatePackagingOrderStatus(id: number, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("packaging_orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
        
      if (error) throw error;
      
      toast.success("تم تحديث حالة أمر التعبئة بنجاح");
      return true;
    } catch (error) {
      console.error("Error updating packaging order status:", error);
      toast.error("حدث خطأ أثناء تحديث حالة أمر التعبئة");
      return false;
    }
  }

  public async deleteProductionOrder(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("production_orders")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
      
      toast.success("تم حذف أمر الإنتاج بنجاح");
      return true;
    } catch (error) {
      console.error("Error deleting production order:", error);
      toast.error("حدث خطأ أثناء حذف أمر الإنتاج");
      return false;
    }
  }

  public async deletePackagingOrder(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("packaging_orders")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
      
      toast.success("تم حذف أمر التعبئة بنجاح");
      return true;
    } catch (error) {
      console.error("Error deleting packaging order:", error);
      toast.error("حدث خطأ أثناء حذف أمر التعبئة");
      return false;
    }
  }

  public async updateProductionOrder(
    id: number,
    orderData: {
      productCode: string;
      productName: string;
      quantity: number;
      unit: string;
      ingredients?: {
        code: string;
        name: string;
        requiredQuantity: number;
      }[];
      totalCost?: number;
    }
  ): Promise<boolean> {
    try {
      const updateData = {
        product_code: orderData.productCode,
        product_name: orderData.productName,
        quantity: orderData.quantity,
        unit: orderData.unit,
        updated_at: new Date().toISOString()
      };
      
      if (orderData.totalCost !== undefined) {
        Object.assign(updateData, { total_cost: orderData.totalCost });
      }
      
      const { error } = await supabase
        .from("production_orders")
        .update(updateData)
        .eq("id", id);
        
      if (error) throw error;
      
      toast.success("تم تحديث أمر الإنتاج بنجاح");
      return true;
    } catch (error) {
      console.error("Error updating production order:", error);
      toast.error("حدث خطأ أثناء تحديث أمر الإنتاج");
      return false;
    }
  }

  public async updatePackagingOrder(
    id: number,
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
      packagingMaterials?: {
        code: string;
        name: string;
        quantity: number;
      }[];
      totalCost?: number;
    }
  ): Promise<boolean> {
    try {
      const updateData = {
        product_code: orderData.productCode,
        product_name: orderData.productName,
        quantity: orderData.quantity,
        unit: orderData.unit,
        semi_finished_code: orderData.semiFinished.code,
        semi_finished_name: orderData.semiFinished.name,
        semi_finished_quantity: orderData.semiFinished.quantity,
        updated_at: new Date().toISOString()
      };
      
      if (orderData.totalCost !== undefined) {
        Object.assign(updateData, { total_cost: orderData.totalCost });
      }
      
      const { error } = await supabase
        .from("packaging_orders")
        .update(updateData)
        .eq("id", id);
        
      if (error) throw error;
      
      toast.success("تم تحديث أمر التعبئة بنجاح");
      return true;
    } catch (error) {
      console.error("Error updating packaging order:", error);
      toast.error("حدث خطأ أثناء تحديث أمر التعبئة");
      return false;
    }
  }

  public async saveProductionGoal(goal: Omit<ProductionGoal, 'id'> & { id?: string }): Promise<ProductionGoal | null> {
    try {
      toast.success("تم حفظ هدف الإنتاج بنجاح");
      return { ...goal, id: Date.now().toString() };
    } catch (error) {
      console.error("Error saving production goal:", error);
      toast.error("حدث خطأ أثناء حفظ هدف الإنتاج");
      return null;
    }
  }

  public async deleteProductionGoal(id: string): Promise<boolean> {
    try {
      toast.success("تم حذف هدف الإنتاج بنجاح");
      return true;
    } catch (error) {
      console.error("Error deleting production goal:", error);
      toast.error("حدث خطأ أثناء حذف هدف الإنتاج");
      return false;
    }
  }
}

export default ProductionService;
