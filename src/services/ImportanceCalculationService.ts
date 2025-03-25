
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * خدمة حساب أهمية المكونات في المخزون
 * تقوم بتحليل استخدام المكونات في المنتجات وتحديد أهميتها
 */
class ImportanceCalculationService {
  private static instance: ImportanceCalculationService;
  
  private constructor() {
    // Private constructor to enforce singleton pattern
  }
  
  public static getInstance(): ImportanceCalculationService {
    if (!ImportanceCalculationService.instance) {
      ImportanceCalculationService.instance = new ImportanceCalculationService();
    }
    return ImportanceCalculationService.instance;
  }
  
  /**
   * حساب أهمية المواد الأولية
   * يتم حساب الأهمية بناءاً على عدد المنتجات نصف المصنعة التي تستخدم المادة
   * وكذلك نسبة الاستخدام في كل منتج
   * @returns وعد بنتيجة العملية
   */
  public async calculateRawMaterialsImportance(): Promise<boolean> {
    try {
      console.log("بدء حساب أهمية المواد الأولية...");
      
      // الحصول على جميع المواد الأولية
      const { data: rawMaterials, error: rawMaterialsError } = await supabase
        .from('raw_materials')
        .select('id, code');
        
      if (rawMaterialsError) {
        throw rawMaterialsError;
      }
      
      // الحصول على جميع مكونات المنتجات نصف المصنعة
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('semi_finished_ingredients')
        .select('raw_material_id, percentage, semi_finished_id');
        
      if (ingredientsError) {
        throw ingredientsError;
      }
      
      // حساب أهمية كل مادة أولية
      for (const material of rawMaterials) {
        // البحث عن جميع المكونات التي تستخدم هذه المادة
        const materialUsages = ingredients.filter(ing => ing.raw_material_id === material.id);
        
        // عدد المنتجات النصف مصنعة التي تستخدم هذه المادة
        const uniqueProducts = new Set(materialUsages.map(usage => usage.semi_finished_id));
        
        // حساب متوسط نسبة الاستخدام
        const totalPercentage = materialUsages.reduce((sum, usage) => sum + Number(usage.percentage), 0);
        const avgPercentage = materialUsages.length > 0 ? totalPercentage / materialUsages.length : 0;
        
        // حساب قيمة الأهمية: عدد المنتجات × متوسط نسبة الاستخدام / 10
        // نقسم على 10 للحصول على قيمة أصغر وأكثر قابلية للمقارنة
        const importanceValue = Math.round((uniqueProducts.size * avgPercentage) / 10);
        
        // تحديث قيمة الأهمية في قاعدة البيانات
        const { error: updateError } = await supabase
          .from('raw_materials')
          .update({ importance: importanceValue })
          .eq('id', material.id);
          
        if (updateError) {
          console.error(`خطأ في تحديث أهمية المادة ${material.code}:`, updateError);
        }
      }
      
      console.log("تم الانتهاء من حساب أهمية المواد الأولية");
      return true;
    } catch (error) {
      console.error("خطأ في حساب أهمية المواد الأولية:", error);
      toast.error("حدث خطأ أثناء حساب أهمية المواد الأولية");
      return false;
    }
  }
  
  /**
   * حساب أهمية مستلزمات التعبئة
   * يتم حساب الأهمية بناءاً على عدد المنتجات النهائية التي تستخدم المستلزم
   * @returns وعد بنتيجة العملية
   */
  public async calculatePackagingMaterialsImportance(): Promise<boolean> {
    try {
      console.log("بدء حساب أهمية مستلزمات التعبئة...");
      
      // الحصول على جميع مستلزمات التعبئة
      const { data: packagingMaterials, error: materialsError } = await supabase
        .from('packaging_materials')
        .select('id, code');
        
      if (materialsError) {
        throw materialsError;
      }
      
      // الحصول على علاقات المنتجات النهائية بمستلزمات التعبئة
      const { data: packagingRelations, error: relationsError } = await supabase
        .from('finished_product_packaging')
        .select('packaging_material_id, finished_product_id, quantity');
        
      if (relationsError) {
        throw relationsError;
      }
      
      // حساب أهمية كل مستلزم تعبئة
      for (const material of packagingMaterials) {
        // البحث عن جميع العلاقات التي تستخدم هذا المستلزم
        const materialUsages = packagingRelations.filter(rel => rel.packaging_material_id === material.id);
        
        // عدد المنتجات النهائية التي تستخدم هذا المستلزم
        const uniqueProducts = new Set(materialUsages.map(usage => usage.finished_product_id));
        
        // حساب متوسط كمية الاستخدام
        const totalQuantity = materialUsages.reduce((sum, usage) => sum + Number(usage.quantity), 0);
        const avgQuantity = materialUsages.length > 0 ? totalQuantity / materialUsages.length : 0;
        
        // حساب قيمة الأهمية: عدد المنتجات × متوسط كمية الاستخدام
        const importanceValue = Math.round(uniqueProducts.size * avgQuantity);
        
        // تحديث قيمة الأهمية في قاعدة البيانات
        const { error: updateError } = await supabase
          .from('packaging_materials')
          .update({ importance: importanceValue })
          .eq('id', material.id);
          
        if (updateError) {
          console.error(`خطأ في تحديث أهمية المستلزم ${material.code}:`, updateError);
        }
      }
      
      console.log("تم الانتهاء من حساب أهمية مستلزمات التعبئة");
      return true;
    } catch (error) {
      console.error("خطأ في حساب أهمية مستلزمات التعبئة:", error);
      toast.error("حدث خطأ أثناء حساب أهمية مستلزمات التعبئة");
      return false;
    }
  }
  
  /**
   * تشغيل إعادة حساب الأهمية لجميع المكونات
   * @returns وعد بنتيجة العملية
   */
  public async recalculateAllImportance(): Promise<boolean> {
    try {
      toast.info("جارٍ إعادة حساب أهمية المكونات...", { id: 'importance-calc' });
      
      // حساب أهمية المواد الأولية
      const rawMaterialsResult = await this.calculateRawMaterialsImportance();
      
      // حساب أهمية مستلزمات التعبئة
      const packagingResult = await this.calculatePackagingMaterialsImportance();
      
      if (rawMaterialsResult && packagingResult) {
        toast.success("تم إعادة حساب أهمية جميع المكونات بنجاح", { id: 'importance-calc' });
        return true;
      } else {
        toast.error("حدث خطأ أثناء إعادة حساب الأهمية", { id: 'importance-calc' });
        return false;
      }
    } catch (error) {
      console.error("خطأ في إعادة حساب الأهمية:", error);
      toast.error("حدث خطأ أثناء إعادة حساب الأهمية", { id: 'importance-calc' });
      return false;
    }
  }
}

export default ImportanceCalculationService;
