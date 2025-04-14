import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculateFinishedProductCost } from '@/components/inventory/common/InventoryDataFormatter';

/**
 * خدمة تحديث تكاليف المنتجات النصف مصنعة والمنتجات النهائية
 */
class CostUpdateService {
  private static instance: CostUpdateService;

  public static getInstance(): CostUpdateService {
    if (!CostUpdateService.instance) {
      CostUpdateService.instance = new CostUpdateService();
    }
    return CostUpdateService.instance;
  }

  /**
   * تحديث تكلفة منتج نصف مصنع بناء على مكوناته
   * @param semiFinishedId معرف المنتج النصف مصنع
   * @returns نجاح العملية
   */  public async updateSemiFinishedCost(semiFinishedId: number): Promise<boolean> {
    try {
      // جلب مكونات المنتج النصف مصنع
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('semi_finished_ingredients')
        .select(`
          percentage,
          raw_material:raw_material_id(id, name, unit_cost)
        `)
        .eq('semi_finished_id', semiFinishedId);
        
      if (ingredientsError) throw ingredientsError;
      
      if (!ingredients || ingredients.length === 0) {
        console.warn(`لا توجد مكونات للمنتج النصف مصنع رقم ${semiFinishedId}`);
        return false;
      }
      
      // حساب التكلفة الجديدة بناء على المكونات
      let newTotalCost = 0;
      ingredients.forEach(ingredient => {
        const rawMaterialCost = ingredient.raw_material?.unit_cost || 0;
        const contributionCost = rawMaterialCost * (ingredient.percentage / 100);
        newTotalCost += contributionCost;
      });
      
      // الحصول على اسم المنتج للتنبيهات
      const { data: semiFinished, error: semiFinishedError } = await supabase
        .from('semi_finished_products')
        .select('name, unit_cost')
        .eq('id', semiFinishedId)
        .single();
        
      if (semiFinishedError) throw semiFinishedError;
      
      const oldCost = semiFinished.unit_cost;
      
      // تحديث تكلفة المنتج النصف مصنع
      const { error: updateError } = await supabase
        .from('semi_finished_products')
        .update({ 
          unit_cost: newTotalCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', semiFinishedId);
        
      if (updateError) throw updateError;
      
      console.log(`تم تحديث تكلفة المنتج النصف مصنع "${semiFinished.name}" من ${oldCost} إلى ${newTotalCost}`);
      
      // تحديث تكلفة المنتجات النهائية التي تستخدم هذا المنتج النصف مصنع
      await this.updateFinishedProductsForSemiFinished(semiFinishedId);
      
      return true;
    } catch (error) {
      console.error('خطأ في تحديث تكلفة المنتج النصف مصنع:', error);
      return false;
    }
  }
  
  /**
   * تحديث تكلفة جميع المنتجات النصف مصنعة المرتبطة بمادة خام محددة
   * @param rawMaterialId معرف المادة الخام
   * @returns عدد المنتجات التي تم تحديثها
   */
  public async updateSemiFinishedCostsForRawMaterial(rawMaterialId: number): Promise<number> {
    try {
      // الحصول على جميع المنتجات النصف مصنعة التي تستخدم المادة الخام
      const { data: affectedProducts, error } = await supabase
        .from('semi_finished_ingredients')
        .select('semi_finished_id')
        .eq('raw_material_id', rawMaterialId);
        
      if (error) throw error;
      
      if (!affectedProducts || affectedProducts.length === 0) {
        return 0; // لا توجد منتجات تستخدم هذه المادة الخام
      }
      
      // إزالة التكرار من قائمة المنتجات المتأثرة
      const uniqueProductIds = [...new Set(affectedProducts.map(p => p.semi_finished_id))];
      
      // تحديث كل منتج
      let updatedCount = 0;
      for (const productId of uniqueProductIds) {
        const success = await this.updateSemiFinishedCost(productId);
        if (success) updatedCount++;
      }
      
      return updatedCount;
    } catch (error) {
      console.error('خطأ في تحديث تكاليف المنتجات النصف مصنعة:', error);
      return 0;
    }
  }

  /**
   * تحديث تكاليف جميع المنتجات النصف مصنعة
   * @returns عدد المنتجات التي تم تحديثها
   */  public async updateAllSemiFinishedCosts(): Promise<number> {
    try {
      // الحصول على قائمة بجميع المنتجات النصف مصنعة
      const { data: products, error } = await supabase
        .from('semi_finished_products')
        .select('id');
        
      if (error) throw error;
      
      if (!products || products.length === 0) {
        return 0;
      }
      
      // تحديث تكلفة كل منتج
      let updatedCount = 0;
      for (const product of products) {
        const success = await this.updateSemiFinishedCost(product.id);
        if (success) updatedCount++;
      }
      
      toast.success(`تم تحديث تكاليف ${updatedCount} منتج نصف مصنع والمنتجات النهائية المرتبطة`);
      return updatedCount;
    } catch (error) {
      console.error('خطأ في تحديث تكاليف جميع المنتجات النصف مصنعة:', error);
      toast.error('حدث خطأ أثناء تحديث تكاليف المنتجات النصف مصنعة');
      return 0;
    }
  }

  /**
   * تحديث تكلفة منتج نهائي بناء على مكوناته (المنتج النصف مصنع ومواد التغليف)
   * @param finishedProductId معرف المنتج النهائي
   * @returns نجاح العملية
   */
  public async updateFinishedProductCost(finishedProductId: number): Promise<boolean> {
    try {
      // جلب بيانات المنتج النهائي مع المنتج النصف مصنع ومواد التغليف
      const { data: finishedProduct, error: productError } = await supabase
        .from('finished_products')
        .select(`
          id, 
          name, 
          unit_cost,
          semi_finished_id,
          semi_finished_quantity,
          semi_finished:semi_finished_products(id, name, unit_cost),
          packaging:finished_product_packaging(
            id,
            quantity,
            packaging_material_id,
            packaging_material:packaging_materials(id, name, unit_cost)
          )
        `)
        .eq('id', finishedProductId)
        .single();
        
      if (productError) throw productError;
      
      if (!finishedProduct) {
        console.warn(`المنتج النهائي رقم ${finishedProductId} غير موجود`);
        return false;
      }
      
      // حساب التكلفة الجديدة باستخدام نفس الدالة المستخدمة في واجهة المستخدم
      const newUnitCost = calculateFinishedProductCost(
        finishedProduct.semi_finished,
        finishedProduct.packaging,
        finishedProduct.semi_finished_quantity
      );
      
      const oldCost = finishedProduct.unit_cost;
      
      // تحديث تكلفة المنتج النهائي في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('finished_products')
        .update({ 
          unit_cost: newUnitCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', finishedProductId);
        
      if (updateError) throw updateError;
      
      console.log(`تم تحديث تكلفة المنتج النهائي "${finishedProduct.name}" من ${oldCost} إلى ${newUnitCost}`);
      return true;
    } catch (error) {
      console.error('خطأ في تحديث تكلفة المنتج النهائي:', error);
      return false;
    }
  }
  
  /**
   * تحديث تكلفة جميع المنتجات النهائية التي تستخدم منتج نصف مصنع محدد
   * @param semiFinishedId معرف المنتج النصف مصنع
   * @returns عدد المنتجات التي تم تحديثها
   */
  public async updateFinishedProductsForSemiFinished(semiFinishedId: number): Promise<number> {
    try {
      // الحصول على جميع المنتجات النهائية التي تستخدم المنتج النصف مصنع
      const { data: affectedProducts, error } = await supabase
        .from('finished_products')
        .select('id')
        .eq('semi_finished_id', semiFinishedId);
        
      if (error) throw error;
      
      if (!affectedProducts || affectedProducts.length === 0) {
        return 0; // لا توجد منتجات تستخدم هذا المنتج النصف مصنع
      }
      
      // تحديث كل منتج نهائي
      let updatedCount = 0;
      for (const product of affectedProducts) {
        const success = await this.updateFinishedProductCost(product.id);
        if (success) updatedCount++;
      }
      
      if (updatedCount > 0) {
        console.log(`تم تحديث ${updatedCount} منتج نهائي يستخدم المنتج النصف مصنع رقم ${semiFinishedId}`);
      }
      
      return updatedCount;
    } catch (error) {
      console.error('خطأ في تحديث المنتجات النهائية:', error);
      return 0;
    }
  }
  
  /**
   * تحديث تكلفة جميع المنتجات النهائية التي تستخدم مادة تغليف محددة
   * @param packagingMaterialId معرف مادة التغليف
   * @returns عدد المنتجات التي تم تحديثها
   */
  public async updateFinishedProductsForPackagingMaterial(packagingMaterialId: number): Promise<number> {
    try {
      // الحصول على جميع المنتجات النهائية التي تستخدم مادة التغليف
      const { data: packagingRelations, error } = await supabase
        .from('finished_product_packaging')
        .select('finished_product_id')
        .eq('packaging_material_id', packagingMaterialId);
        
      if (error) throw error;
      
      if (!packagingRelations || packagingRelations.length === 0) {
        return 0; // لا توجد منتجات تستخدم هذه المادة
      }
      
      // إزالة التكرار من قائمة المنتجات المتأثرة
      const uniqueProductIds = [...new Set(packagingRelations.map(p => p.finished_product_id))];
      
      // تحديث كل منتج نهائي
      let updatedCount = 0;
      for (const productId of uniqueProductIds) {
        const success = await this.updateFinishedProductCost(productId);
        if (success) updatedCount++;
      }
      
      if (updatedCount > 0) {
        console.log(`تم تحديث ${updatedCount} منتج نهائي يستخدم مادة التغليف رقم ${packagingMaterialId}`);
      }
      
      return updatedCount;
    } catch (error) {
      console.error('خطأ في تحديث المنتجات النهائية:', error);
      return 0;
    }
  }

  /**
   * تحديث تكاليف جميع المنتجات النهائية
   * @returns عدد المنتجات التي تم تحديثها
   */
  public async updateAllFinishedProductsCosts(): Promise<number> {
    try {
      // الحصول على قائمة بجميع المنتجات النهائية
      const { data: products, error } = await supabase
        .from('finished_products')
        .select('id');
        
      if (error) throw error;
      
      if (!products || products.length === 0) {
        return 0;
      }
      
      // تحديث تكلفة كل منتج
      let updatedCount = 0;
      for (const product of products) {
        const success = await this.updateFinishedProductCost(product.id);
        if (success) updatedCount++;
      }
      
      toast.success(`تم تحديث تكاليف ${updatedCount} منتج نهائي`);
      return updatedCount;
    } catch (error) {
      console.error('خطأ في تحديث تكاليف جميع المنتجات النهائية:', error);
      toast.error('حدث خطأ أثناء تحديث تكاليف المنتجات النهائية');
      return 0;
    }
  }

  /**
   * تحديث تكلفة المنتجات النهائية بعد تغيير سعر مادة تغليف
   * @param packagingMaterialId معرف مادة التغليف
   * @param newCost السعر الجديد (اختياري)
   * @returns نجاح العملية
   */
  public async updateForPackagingMaterialChange(packagingMaterialId: number, newCost?: number): Promise<boolean> {
    try {
      // إذا تم تقديم سعر جديد، قم بتحديثه في قاعدة البيانات أولاً
      if (newCost !== undefined) {
        const { data: packagingMaterial, error: getMaterialError } = await supabase
          .from('packaging_materials')
          .select('name, unit_cost')
          .eq('id', packagingMaterialId)
          .single();
          
        if (getMaterialError) throw getMaterialError;
        
        const oldCost = packagingMaterial.unit_cost;
        
        // تحديث سعر مادة التغليف
        const { error: updateError } = await supabase
          .from('packaging_materials')
          .update({ 
            unit_cost: newCost,
            updated_at: new Date().toISOString()
          })
          .eq('id', packagingMaterialId);
          
        if (updateError) throw updateError;
        
        console.log(`تم تحديث سعر مادة التغليف "${packagingMaterial.name}" من ${oldCost} إلى ${newCost}`);
      }
      
      // تحديث جميع المنتجات النهائية التي تستخدم مادة التغليف
      const updatedCount = await this.updateFinishedProductsForPackagingMaterial(packagingMaterialId);
      
      if (updatedCount > 0) {
        console.log(`تم تحديث ${updatedCount} منتج نهائي مرتبط بمادة التغليف رقم ${packagingMaterialId}`);
        return true;
      }
      
      return updatedCount > 0;
    } catch (error) {
      console.error('خطأ في تحديث المنتجات النهائية بعد تغيير سعر مادة التغليف:', error);
      return false;
    }
  }
}

export default CostUpdateService;
