import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
   */
  public async updateSemiFinishedCost(semiFinishedId: number): Promise<boolean> {
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
   */
  public async updateAllSemiFinishedCosts(): Promise<number> {
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
      
      toast.success(`تم تحديث تكاليف ${updatedCount} منتج نصف مصنع`);
      return updatedCount;
    } catch (error) {
      console.error('خطأ في تحديث تكاليف جميع المنتجات النصف مصنعة:', error);
      toast.error('حدث خطأ أثناء تحديث تكاليف المنتجات النصف مصنعة');
      return 0;
    }
  }
}

export default CostUpdateService;
