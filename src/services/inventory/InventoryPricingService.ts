
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * خدمة مخصصة لحساب ومعالجة تسعير المخزون
 */
class InventoryPricingService {
  private static instance: InventoryPricingService;
  
  private constructor() {}
  
  public static getInstance(): InventoryPricingService {
    if (!InventoryPricingService.instance) {
      InventoryPricingService.instance = new InventoryPricingService();
    }
    return InventoryPricingService.instance;
  }
  
  /**
   * حساب سعر التكلفة الجديد بعد الإضافة للمخزون (المتوسط المرجح)
   * @param currentQuantity الكمية الحالية
   * @param currentCost التكلفة الحالية
   * @param newQuantity الكمية الجديدة
   * @param newCost سعر الوحدة للكمية الجديدة
   * @returns سعر التكلفة الجديد للوحدة
   */
  public calculateNewWeightedAverage(
    currentQuantity: number,
    currentCost: number,
    newQuantity: number,
    newCost: number
  ): number {
    // عندما تكون الكمية الحالية صفر، استخدم السعر الجديد فقط
    if (currentQuantity <= 0) {
      return newCost;
    }
    
    // القيمة الإجمالية الحالية
    const currentTotalValue = currentQuantity * currentCost;
    
    // القيمة الإجمالية للمشتريات الجديدة
    const newTotalValue = newQuantity * newCost;
    
    // إجمالي الكمية بعد الإضافة
    const totalQuantity = currentQuantity + newQuantity;
    
    // إجمالي القيمة بعد الإضافة
    const totalValue = currentTotalValue + newTotalValue;
    
    // متوسط تكلفة الوحدة الجديد
    const newAverageCost = totalValue / totalQuantity;
    
    // تقريب النتيجة لرقمين عشريين
    return parseFloat(newAverageCost.toFixed(2));
  }
  
  /**
   * تحديث متوسط تكلفة مادة خام
   */
  public async updateRawMaterialCost(
    itemId: number,
    newQuantity: number,
    newCost: number
  ): Promise<boolean> {
    try {
      // جلب المعلومات الحالية عن المادة
      const { data: rawMaterial, error } = await supabase
        .from('raw_materials')
        .select('quantity, unit_cost')
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      
      if (!rawMaterial) {
        console.error('Raw material not found', itemId);
        return false;
      }
      
      // حساب متوسط التكلفة الجديد
      const newAverageCost = this.calculateNewWeightedAverage(
        rawMaterial.quantity,
        rawMaterial.unit_cost,
        newQuantity,
        newCost
      );
      
      console.log('متوسط التكلفة الجديد للمادة الخام:', newAverageCost);
      
      // تحديث سعر التكلفة في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('raw_materials')
        .update({ unit_cost: newAverageCost })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error('Error updating raw material cost:', error);
      return false;
    }
  }
  
  /**
   * تحديث متوسط تكلفة مواد التعبئة
   */
  public async updatePackagingMaterialCost(
    itemId: number,
    newQuantity: number,
    newCost: number
  ): Promise<boolean> {
    try {
      // جلب المعلومات الحالية عن المادة
      const { data: packagingMaterial, error } = await supabase
        .from('packaging_materials')
        .select('quantity, unit_cost')
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      
      if (!packagingMaterial) {
        console.error('Packaging material not found', itemId);
        return false;
      }
      
      // حساب متوسط التكلفة الجديد
      const newAverageCost = this.calculateNewWeightedAverage(
        packagingMaterial.quantity,
        packagingMaterial.unit_cost,
        newQuantity,
        newCost
      );
      
      console.log('متوسط التكلفة الجديد لمادة التعبئة:', newAverageCost);
      
      // تحديث سعر التكلفة في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('packaging_materials')
        .update({ unit_cost: newAverageCost })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error('Error updating packaging material cost:', error);
      return false;
    }
  }
  
  /**
   * تحديث متوسط تكلفة منتج نصف مصنع
   */
  public async updateSemiFinishedProductCost(
    itemId: number,
    newQuantity: number,
    newCost: number
  ): Promise<boolean> {
    try {
      // جلب المعلومات الحالية عن المنتج
      const { data: semiFinished, error } = await supabase
        .from('semi_finished_products')
        .select('quantity, unit_cost')
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      
      if (!semiFinished) {
        console.error('Semi-finished product not found', itemId);
        return false;
      }
      
      // حساب متوسط التكلفة الجديد
      const newAverageCost = this.calculateNewWeightedAverage(
        semiFinished.quantity,
        semiFinished.unit_cost,
        newQuantity,
        newCost
      );
      
      console.log('متوسط التكلفة الجديد للمنتج نصف المصنع:', newAverageCost);
      
      // تحديث سعر التكلفة في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('semi_finished_products')
        .update({ unit_cost: newAverageCost })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error('Error updating semi-finished product cost:', error);
      return false;
    }
  }
  
  /**
   * تحديث متوسط تكلفة منتج نهائي
   */
  public async updateFinishedProductCost(
    itemId: number,
    newQuantity: number,
    newCost: number
  ): Promise<boolean> {
    try {
      // جلب المعلومات الحالية عن المنتج
      const { data: finishedProduct, error } = await supabase
        .from('finished_products')
        .select('quantity, unit_cost')
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      
      if (!finishedProduct) {
        console.error('Finished product not found', itemId);
        return false;
      }
      
      // حساب متوسط التكلفة الجديد
      const newAverageCost = this.calculateNewWeightedAverage(
        finishedProduct.quantity,
        finishedProduct.unit_cost,
        newQuantity,
        newCost
      );
      
      console.log('متوسط التكلفة الجديد للمنتج النهائي:', newAverageCost);
      
      // تحديث سعر التكلفة في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('finished_products')
        .update({ unit_cost: newAverageCost })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error('Error updating finished product cost:', error);
      return false;
    }
  }
}

export default InventoryPricingService;
