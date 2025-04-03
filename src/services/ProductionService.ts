
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InventoryService from "./InventoryService";

interface ProductionOrder {
  id?: number;
  code: string;
  product_code: string;
  product_name: string;
  date: string;
  quantity: number;
  unit: string;
  status: string;
  total_cost?: number;
  created_at?: string;
  updated_at?: string;
}

interface ProductionOrderIngredient {
  id?: number;
  production_order_id?: number;
  raw_material_code: string;
  raw_material_name: string;
  required_quantity: number;
}

interface PackagingOrder {
  id?: number;
  code: string;
  product_code: string;
  product_name: string;
  date: string;
  quantity: number;
  unit: string;
  status: string;
  semi_finished_code: string;
  semi_finished_name: string;
  semi_finished_quantity: number;
  total_cost?: number;
  created_at?: string;
  updated_at?: string;
}

interface PackagingOrderMaterial {
  id?: number;
  packaging_order_id?: number;
  packaging_material_code: string;
  packaging_material_name: string;
  required_quantity: number;
}

interface Production {
  // Add any other properties needed for production
}

class ProductionService {
  private static instance: ProductionService;
  private inventoryService: InventoryService;
  
  private constructor() {
    this.inventoryService = InventoryService.getInstance();
  }
  
  public static getInstance(): ProductionService {
    if (!ProductionService.instance) {
      ProductionService.instance = new ProductionService();
    }
    return ProductionService.instance;
  }
  
  // Production Orders methods
  async getProductionOrders(): Promise<ProductionOrder[]> {
    try {
      const { data, error } = await supabase
        .from('production_orders')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as ProductionOrder[];
    } catch (error) {
      console.error('Error fetching production orders:', error);
      toast.error('حدث خطأ أثناء جلب أوامر الإنتاج');
      return [];
    }
  }
  
  async getProductionOrderById(id: number): Promise<{order: ProductionOrder, ingredients: ProductionOrderIngredient[]} | null> {
    try {
      // Get order
      const { data: order, error } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Get ingredients
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('production_order_ingredients')
        .select('*')
        .eq('production_order_id', id);
      
      if (ingredientsError) throw ingredientsError;
      
      return {
        order: order as ProductionOrder,
        ingredients: ingredients as ProductionOrderIngredient[]
      };
    } catch (error) {
      console.error('Error fetching production order:', error);
      toast.error('حدث خطأ أثناء جلب تفاصيل أمر الإنتاج');
      return null;
    }
  }
  
  async createProductionOrder(orderData: ProductionOrder, ingredients: ProductionOrderIngredient[]): Promise<number | null> {
    try {
      // Insert order
      const { data: order, error } = await supabase
        .from('production_orders')
        .insert({
          code: orderData.code,
          product_code: orderData.product_code,
          product_name: orderData.product_name,
          date: orderData.date,
          quantity: orderData.quantity,
          unit: orderData.unit,
          status: orderData.status || 'pending',
          total_cost: orderData.total_cost || 0
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Insert ingredients
      if (ingredients.length > 0) {
        const orderIngredients = ingredients.map(ingredient => ({
          production_order_id: order.id,
          raw_material_code: ingredient.raw_material_code,
          raw_material_name: ingredient.raw_material_name,
          required_quantity: ingredient.required_quantity
        }));
        
        const { error: ingredientsError } = await supabase
          .from('production_order_ingredients')
          .insert(orderIngredients);
        
        if (ingredientsError) throw ingredientsError;
      }
      
      toast.success('تم إنشاء أمر إنتاج جديد بنجاح');
      return order.id;
    } catch (error) {
      console.error('Error creating production order:', error);
      toast.error('حدث خطأ أثناء إنشاء أمر إنتاج جديد');
      return null;
    }
  }
  
  async startProductionOrder(id: number, ingredients: ProductionOrderIngredient[]): Promise<boolean> {
    try {
      // Update raw materials quantities (deduct used quantities)
      for (const ingredient of ingredients) {
        const { data: rawMaterial, error: fetchError } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('code', ingredient.raw_material_code)
          .single();
        
        if (fetchError) throw fetchError;
        
        const newQuantity = Math.max(0, (rawMaterial?.quantity || 0) - ingredient.required_quantity);
        
        const { error: updateError } = await supabase
          .from('raw_materials')
          .update({ quantity: newQuantity })
          .eq('code', ingredient.raw_material_code);
        
        if (updateError) throw updateError;
      }
      
      // Update order status
      const { error } = await supabase
        .from('production_orders')
        .update({ status: 'in_progress' })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم بدء تنفيذ أمر الإنتاج بنجاح');
      return true;
    } catch (error) {
      console.error('Error starting production order:', error);
      toast.error('حدث خطأ أثناء بدء تنفيذ أمر الإنتاج');
      return false;
    }
  }
  
  async completeProductionOrder(id: number, orderData: ProductionOrder): Promise<boolean> {
    try {
      // Add semi-finished product to inventory
      await this.inventoryService.addSemiFinishedProduct({
        code: orderData.product_code,
        name: orderData.product_name,
        quantity: orderData.quantity,
        unit: orderData.unit,
        unit_cost: (orderData.total_cost || 0) / orderData.quantity
      });
      
      // Update order status
      const { error } = await supabase
        .from('production_orders')
        .update({ status: 'completed' })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم إتمام أمر الإنتاج بنجاح');
      return true;
    } catch (error) {
      console.error('Error completing production order:', error);
      toast.error('حدث خطأ أثناء إتمام أمر الإنتاج');
      return false;
    }
  }
  
  // Packaging Orders methods
  async getPackagingOrders(): Promise<PackagingOrder[]> {
    try {
      const { data, error } = await supabase
        .from('packaging_orders')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as PackagingOrder[];
    } catch (error) {
      console.error('Error fetching packaging orders:', error);
      toast.error('حدث خطأ أثناء جلب أوامر التعبئة');
      return [];
    }
  }
  
  async getPackagingOrderById(id: number): Promise<{order: PackagingOrder, materials: PackagingOrderMaterial[]} | null> {
    try {
      // Get order
      const { data: order, error } = await supabase
        .from('packaging_orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Get materials
      const { data: materials, error: materialsError } = await supabase
        .from('packaging_order_materials')
        .select('*')
        .eq('packaging_order_id', id);
      
      if (materialsError) throw materialsError;
      
      return {
        order: order as PackagingOrder,
        materials: materials as PackagingOrderMaterial[]
      };
    } catch (error) {
      console.error('Error fetching packaging order:', error);
      toast.error('حدث خطأ أثناء جلب تفاصيل أمر التعبئة');
      return null;
    }
  }
  
  async createPackagingOrder(orderData: PackagingOrder, materials: PackagingOrderMaterial[]): Promise<number | null> {
    try {
      // Insert order
      const { data: order, error } = await supabase
        .from('packaging_orders')
        .insert({
          code: orderData.code,
          product_code: orderData.product_code,
          product_name: orderData.product_name,
          date: orderData.date,
          quantity: orderData.quantity,
          unit: orderData.unit,
          status: orderData.status || 'pending',
          semi_finished_code: orderData.semi_finished_code,
          semi_finished_name: orderData.semi_finished_name,
          semi_finished_quantity: orderData.semi_finished_quantity,
          total_cost: orderData.total_cost || 0
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Insert materials
      if (materials.length > 0) {
        const orderMaterials = materials.map(material => ({
          packaging_order_id: order.id,
          packaging_material_code: material.packaging_material_code,
          packaging_material_name: material.packaging_material_name,
          required_quantity: material.required_quantity
        }));
        
        const { error: materialsError } = await supabase
          .from('packaging_order_materials')
          .insert(orderMaterials);
        
        if (materialsError) throw materialsError;
      }
      
      toast.success('تم إنشاء أمر تعبئة جديد بنجاح');
      return order.id;
    } catch (error) {
      console.error('Error creating packaging order:', error);
      toast.error('حدث خطأ أثناء إنشاء أمر تعبئة جديد');
      return null;
    }
  }
  
  async startPackagingOrder(id: number, orderData: PackagingOrder, materials: PackagingOrderMaterial[]): Promise<boolean> {
    try {
      // Deduct semi-finished product from inventory
      const { data: semiFinished, error: fetchSemiFinishedError } = await supabase
        .from('semi_finished_products')
        .select('quantity, unit_cost')
        .eq('code', orderData.semi_finished_code)
        .single();
      
      if (fetchSemiFinishedError) throw fetchSemiFinishedError;
      
      const newSemiFinishedQuantity = Math.max(0, (semiFinished?.quantity || 0) - orderData.semi_finished_quantity);
      
      const { error: updateSemiFinishedError } = await supabase
        .from('semi_finished_products')
        .update({ quantity: newSemiFinishedQuantity })
        .eq('code', orderData.semi_finished_code);
      
      if (updateSemiFinishedError) throw updateSemiFinishedError;
      
      // Update packaging materials quantities (deduct used quantities)
      for (const material of materials) {
        const { data: packagingMaterial, error: fetchError } = await supabase
          .from('packaging_materials')
          .select('quantity')
          .eq('code', material.packaging_material_code)
          .single();
        
        if (fetchError) throw fetchError;
        
        const newQuantity = Math.max(0, (packagingMaterial?.quantity || 0) - material.required_quantity);
        
        const { error: updateError } = await supabase
          .from('packaging_materials')
          .update({ quantity: newQuantity })
          .eq('code', material.packaging_material_code);
        
        if (updateError) throw updateError;
      }
      
      // Update order status
      const { error } = await supabase
        .from('packaging_orders')
        .update({ status: 'in_progress' })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم بدء تنفيذ أمر التعبئة بنجاح');
      return true;
    } catch (error) {
      console.error('Error starting packaging order:', error);
      toast.error('حدث خطأ أثناء بدء تنفيذ أمر التعبئة');
      return false;
    }
  }
  
  async completePackagingOrder(id: number, orderData: PackagingOrder): Promise<boolean> {
    try {
      // Get semi-finished product unit cost to calculate finished product cost
      const { data: semiFinished } = await supabase
        .from('semi_finished_products')
        .select('unit_cost')
        .eq('code', orderData.semi_finished_code)
        .single();
      
      const semiFinishedCost = (semiFinished?.unit_cost || 0) * orderData.semi_finished_quantity;
      const totalCost = orderData.total_cost || semiFinishedCost;
      const unitCost = totalCost / orderData.quantity;
      
      // Get finished product by code
      const { data: existingProduct } = await supabase
        .from('finished_products')
        .select('*')
        .eq('code', orderData.product_code)
        .single();
      
      if (existingProduct) {
        // Update existing product
        const newQuantity = existingProduct.quantity + orderData.quantity;
        // Calculate weighted average cost
        const newUnitCost = ((existingProduct.quantity * existingProduct.unit_cost) + (orderData.quantity * unitCost)) / newQuantity;
        
        await supabase
          .from('finished_products')
          .update({
            quantity: newQuantity,
            unit_cost: newUnitCost
          })
          .eq('code', orderData.product_code);
      } else {
        // Add new finished product to inventory
        await supabase
          .from('finished_products')
          .insert({
            code: orderData.product_code,
            name: orderData.product_name,
            quantity: orderData.quantity,
            unit: orderData.unit,
            unit_cost: unitCost,
            semi_finished_id: 0, // Placeholder, needs to be updated
            semi_finished_quantity: orderData.semi_finished_quantity
          });
      }
      
      // Update order status
      const { error } = await supabase
        .from('packaging_orders')
        .update({ status: 'completed' })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم إتمام أمر التعبئة بنجاح');
      return true;
    } catch (error) {
      console.error('Error completing packaging order:', error);
      toast.error('حدث خطأ أثناء إتمام أمر التعبئة');
      return false;
    }
  }
}

export default ProductionService;
