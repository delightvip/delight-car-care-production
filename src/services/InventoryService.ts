import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// أنواع البيانات للمواد الخام
export interface RawMaterial {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
  importance: number | null;
}

// أنواع بيانات المنتجات النصف مصنعة
export interface SemiFinishedProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
  ingredients: {
    code: string;
    name: string;
    percentage: number;
  }[];
}

// أنواع بيانات مواد التعبئة
export interface PackagingMaterial {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
}

// أنواع بيانات المنتجات النهائية
export interface FinishedProduct {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
  semiFinished: {
    code: string;
    name: string;
    quantity: number;
  };
  packaging: {
    code: string;
    name: string;
    quantity: number;
  }[];
}

class InventoryService {
  private static instance: InventoryService;
  
  private constructor() {}
  
  // الحصول على كائن وحيد من الخدمة (نمط Singleton)
  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }
  
  // جلب جميع المواد الخام
  public async getRawMaterials(): Promise<RawMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return data.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unitCost: item.unit_cost,
        importance: item.importance
      }));
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      toast.error('حدث خطأ أثناء جلب المواد الخام');
      return [];
    }
  }
  
  // جلب جميع المنتجات النصف مصنعة
  public async getSemiFinishedProducts(): Promise<SemiFinishedProduct[]> {
    try {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      // جلب المكونات لكل منتج نصف مصنع
      const productsWithIngredients = await Promise.all(data.map(async (product) => {
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('semi_finished_product_ingredients')
          .select('*')
          .eq('semi_finished_product_id', product.id);
        
        if (ingredientsError) throw ingredientsError;
        
        return {
          id: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          quantity: product.quantity,
          unitCost: product.unit_cost,
          ingredients: ingredients.map(ingredient => ({
            code: ingredient.raw_material_code,
            name: ingredient.raw_material_name,
            percentage: ingredient.percentage
          }))
        };
      }));
      
      return productsWithIngredients;
    } catch (error) {
      console.error('Error fetching semi-finished products:', error);
      toast.error('حدث خطأ أثناء جلب المنتجات النصف مصنعة');
      return [];
    }
  }
  
  // جلب جميع مواد التعبئة
  public async getPackagingMaterials(): Promise<PackagingMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return data.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity
      }));
    } catch (error) {
      console.error('Error fetching packaging materials:', error);
      toast.error('حدث خطأ أثناء جلب مواد التعبئة');
      return [];
    }
  }
  
  // جلب جميع المنتجات النهائية
  public async getFinishedProducts(): Promise<FinishedProduct[]> {
    try {
      const { data, error } = await supabase
        .from('finished_products')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      // جلب المكونات لكل منتج نهائي
      const productsWithComponents = await Promise.all(data.map(async (product) => {
        // جلب معلومات المنتج النصف مصنع
        const { data: semiFinished, error: semiFinishedError } = await supabase
          .from('semi_finished_products')
          .select('code, name')
          .eq('id', product.semi_finished_product_id)
          .single();
        
        if (semiFinishedError) throw semiFinishedError;
        
        // جلب مواد التعبئة
        const { data: packaging, error: packagingError } = await supabase
          .from('finished_product_packaging')
          .select('*')
          .eq('finished_product_id', product.id);
        
        if (packagingError) throw packagingError;
        
        return {
          id: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          quantity: product.quantity,
          unitCost: product.unit_cost,
          semiFinished: {
            code: semiFinished.code,
            name: semiFinished.name,
            quantity: product.semi_finished_quantity
          },
          packaging: packaging.map(pkg => ({
            code: pkg.packaging_material_code,
            name: pkg.packaging_material_name,
            quantity: pkg.quantity
          }))
        };
      }));
      
      return productsWithComponents;
    } catch (error) {
      console.error('Error fetching finished products:', error);
      toast.error('حدث خطأ أثناء جلب المنتجات النهائية');
      return [];
    }
  }
  
  // استهلاك المواد الخام من المخزون
  public async consumeRawMaterials(requirements: { code: string; requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const req of requirements) {
        // جلب بيانات المادة الخام الحالية
        const { data: rawMaterial, error: fetchError } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('code', req.code)
          .single();
        
        if (fetchError) {
          toast.error(`المادة الخام ${req.code} غير موجودة`);
          return false;
        }
        
        if (rawMaterial.quantity < req.requiredQuantity) {
          toast.error(`الكمية المطلوبة من ${req.code} غير متوفرة`);
          return false;
        }
        
        // حساب الكمية الجديدة
        const newQuantity = rawMaterial.quantity - req.requiredQuantity;
        
        // تحديث المخزون
        const { error: updateError } = await supabase
          .from('raw_materials')
          .update({ quantity: newQuantity })
          .eq('code', req.code);
        
        if (updateError) {
          toast.error(`حدث خطأ أثناء تحديث كمية ${req.code}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error consuming raw materials:', error);
      toast.error('حدث خطأ أثناء استهلاك المواد الخام');
      return false;
    }
  }
  
  // التحقق من توفر المنتج النصف مصنع
  public async checkSemiFinishedAvailability(code: string, requiredQuantity: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('code', code)
        .single();
      
      if (error) {
        toast.error(`المنتج النصف مصنع ${code} غير موجود`);
        return false;
      }
      
      if (data.quantity < requiredQuantity) {
        toast.error(`الكمية المطلوبة من ${code} غير متوفرة`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking semi-finished availability:', error);
      toast.error('حدث خطأ أثناء التحقق من توفر المنتج النصف مصنع');
      return false;
    }
  }
  
  // التحقق من توفر مواد التعبئة
  public async checkPackagingAvailability(requirements: { code: string; requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const req of requirements) {
        const { data, error } = await supabase
          .from('packaging_materials')
          .select('quantity')
          .eq('code', req.code)
          .single();
        
        if (error) {
          toast.error(`مادة التعبئة ${req.code} غير موجودة`);
          return false;
        }
        
        if (data.quantity < req.requiredQuantity) {
          toast.error(`الكمية المطلوبة من ${req.code} غير متوفرة`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking packaging availability:', error);
      toast.error('حدث خطأ أثناء التحقق من توفر مواد التعبئة');
      return false;
    }
  }
  
  // تنفيذ عملية إنتاج المنتج النهائي
  public async produceFinishedProduct(
    finishedProductCode: string,
    quantity: number,
    semiFinishedCode: string,
    semiFinishedQuantity: number,
    packagingReqs: { code: string; requiredQuantity: number }[]
  ): Promise<boolean> {
    try {
      // سحب المنتج النصف مصنع من المخزون
      const { data: semiFinished, error: semiError } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('code', semiFinishedCode)
        .single();
      
      if (semiError) {
        toast.error(`المنتج النصف مصنع ${semiFinishedCode} غير موجود`);
        return false;
      }
      
      if (semiFinished.quantity < semiFinishedQuantity * quantity) {
        toast.error(`الكمية المطلوبة من ${semiFinishedCode} غير متوفرة`);
        return false;
      }
      
      const newSemiQuantity = semiFinished.quantity - (semiFinishedQuantity * quantity);
      
      const { error: updateSemiError } = await supabase
        .from('semi_finished_products')
        .update({ quantity: newSemiQuantity })
        .eq('code', semiFinishedCode);
      
      if (updateSemiError) {
        toast.error(`حدث خطأ أثناء تحديث كمية ${semiFinishedCode}`);
        return false;
      }
      
      // سحب مواد التعبئة من المخزون
      for (const req of packagingReqs) {
        const { data: packagingMaterial, error: pkgError } = await supabase
          .from('packaging_materials')
          .select('quantity')
          .eq('code', req.code)
          .single();
        
        if (pkgError) {
          toast.error(`مادة التعبئة ${req.code} غير موجودة`);
          return false;
        }
        
        if (packagingMaterial.quantity < req.requiredQuantity * quantity) {
          toast.error(`الكمية المطلوبة من ${req.code} غير متوفرة`);
          return false;
        }
        
        const newPkgQuantity = packagingMaterial.quantity - (req.requiredQuantity * quantity);
        
        const { error: updatePkgError } = await supabase
          .from('packaging_materials')
          .update({ quantity: newPkgQuantity })
          .eq('code', req.code);
        
        if (updatePkgError) {
          toast.error(`حدث خطأ أثناء تحديث كمية ${req.code}`);
          return false;
        }
      }
      
      // إضافة المنتج النهائي للمخزون
      const { data: finishedProduct, error: finishedError } = await supabase
        .from('finished_products')
        .select('quantity')
        .eq('code', finishedProductCode)
        .single();
      
      let newFinishedQuantity = quantity;
      if (!finishedProduct) {
        // إذا كان المنتج غير موجود، يتم إضافته
        const { error: insertError } = await supabase
          .from('finished_products')
          .insert({
            code: finishedProductCode,
            name: finishedProductCode, // يمكنك تعديل الاسم لاحقًا
            unit: 'وحدة', // يمكنك تعديل الوحدة لاحقًا
            quantity: quantity,
            semi_finished_product_id: 1, // يمكنك تعديل هذه القيم لاحقًا
            semi_finished_quantity: semiFinishedQuantity,
            unit_cost: 0 // يمكنك تعديل هذه القيم لاحقًا
          });
        
        if (insertError) {
          toast.error(`حدث خطأ أثناء إضافة المنتج النهائي ${finishedProductCode}`);
          return false;
        }
      } else {
        // إذا كان المنتج موجودًا، يتم تحديث الكمية
        newFinishedQuantity = finishedProduct.quantity + quantity;
        
        const { error: updateFinishedError } = await supabase
          .from('finished_products')
          .update({ quantity: newFinishedQuantity })
          .eq('code', finishedProductCode);
        
        if (updateFinishedError) {
          toast.error(`حدث خطأ أثناء تحديث كمية ${finishedProductCode}`);
          return false;
        }
      }
      
      toast.success(`تم إنتاج ${quantity} وحدة من ${finishedProductCode} بنجاح`);
      return true;
    } catch (error) {
      console.error('Error producing finished product:', error);
      toast.error('حدث خطأ أثناء إنتاج المنتج النهائي');
      return false;
    }
  }

  // دالة للحصول على مادة خام عن طريق الكود
  public async getRawMaterialByCode(code: string) {
    try {
      return await supabase
        .from('raw_materials')
        .select('*')
        .eq('code', code)
        .single();
    } catch (error) {
      console.error('Error fetching raw material by code:', error);
      return { data: null, error };
    }
  }

  // تحديث أهمية المواد الخام المستخدمة
  public async updateRawMaterialsImportance(materialCodes: string[]): Promise<boolean> {
    try {
      // نحدد المواد التي ستتأثر
      for (const code of materialCodes) {
        const { data: material, error } = await supabase
          .from('raw_materials')
          .select('importance')
          .eq('code', code)
          .single();
        
        if (error) continue;
        
        // زيادة أهمية المادة الخام
        const newImportance = (material.importance || 0) + 1;
        
        await supabase
          .from('raw_materials')
          .update({ importance: newImportance })
          .eq('code', code);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating raw material importance:', error);
      return false;
    }
  }

  // إضافة منتج نصف مصنع للمخزون مع تحديث التكلفة
  public async addSemiFinishedToInventory(
    code: string, 
    quantity: number,
    unitCost?: number
  ): Promise<boolean> {
    try {
      // جلب بيانات المنتج الحالية
      const { data: product, error: fetchError } = await supabase
        .from('semi_finished_products')
        .select('quantity, unit_cost')
        .eq('code', code)
        .single();
      
      if (fetchError) {
        toast.error('لم يتم العثور على المنتج النصف مصنع');
        return false;
      }
      
      // حساب الكمية الجديدة
      const newQuantity = product.quantity + quantity;
      
      // حساب التكلفة الجديدة (إذا تم توفيرها)
      let updateData: any = { quantity: newQuantity };
      
      if (unitCost !== undefined) {
        // حساب متوسط التكلفة بناءً على المخزون الحالي والكمية الجديدة
        const currentTotalCost = product.quantity * (product.unit_cost || 0);
        const newItemsTotalCost = quantity * unitCost;
        const newAverageCost = (currentTotalCost + newItemsTotalCost) / newQuantity;
        
        updateData.unit_cost = newAverageCost;
      }
      
      // تحديث المخزون
      const { error: updateError } = await supabase
        .from('semi_finished_products')
        .update(updateData)
        .eq('code', code);
      
      if (updateError) {
        toast.error('حدث خطأ أثناء تحديث المخزون');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error adding semi-finished to inventory:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج للمخزون');
      return false;
    }
  }

  // سحب منتج نصف مصنع من المخزون
  public async removeSemiFinishedFromInventory(code: string, quantity: number): Promise<boolean> {
    try {
      // جلب بيانات المنتج الحالية
      const { data: product, error: fetchError } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('code', code)
        .single();
      
      if (fetchError) {
        toast.error('لم يتم العثور على المنتج النصف مصنع');
        return false;
      }
      
      // حساب الكمية الجديدة
      const newQuantity = Math.max(0, product.quantity - quantity);
      
      // تحديث المخزون
      const { error: updateError } = await supabase
        .from('semi_finished_products')
        .update({ quantity: newQuantity })
        .eq('code', code);
      
      if (updateError) {
        toast.error('حدث خطأ أثناء تحديث المخزون');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error removing semi-finished from inventory:', error);
      toast.error('حدث خطأ أثناء سحب المنتج من المخزون');
      return false;
    }
  }

  // إعادة المواد الأولية للمخزون
  public async returnRawMaterials(materials: { code: string; requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const material of materials) {
        // جلب بيانات المادة الخام الحالية
        const { data: rawMaterial, error: fetchError } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('code', material.code)
          .single();
        
        if (fetchError) continue;
        
        // حساب الكمية الجديدة
        const newQuantity = rawMaterial.quantity + material.requiredQuantity;
        
        // تحديث المخزون
        await supabase
          .from('raw_materials')
          .update({ quantity: newQuantity })
          .eq('code', material.code);
      }
      
      return true;
    } catch (error) {
      console.error('Error returning raw materials to inventory:', error);
      return false;
    }
  }

  // إعادة مواد التعبئة للمخزون
  public async returnPackagingMaterials(materials: { code: string; requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const material of materials) {
        // جلب بيانات مادة التعبئة الحالية
        const { data: packagingMaterial, error: fetchError } = await supabase
          .from('packaging_materials')
          .select('quantity')
          .eq('code', material.code)
          .single();
        
        if (fetchError) continue;
        
        // حساب الكمية الجديدة
        const newQuantity = packagingMaterial.quantity + material.requiredQuantity;
        
        // تحديث المخزون
        await supabase
          .from('packaging_materials')
          .update({ quantity: newQuantity })
          .eq('code', material.code);
      }
      
      return true;
    } catch (error) {
      console.error('Error returning packaging materials to inventory:', error);
      return false;
    }
  }

  // سحب منتج نهائي من المخزون
  public async removeFinishedFromInventory(code: string, quantity: number): Promise<boolean> {
    try {
      // جلب بيانات المنتج الحالية
      const { data: product, error: fetchError } = await supabase
        .from('finished_products')
        .select('quantity')
        .eq('code', code)
        .single();
      
      if (fetchError) {
        toast.error('لم يتم العثور على المنتج النهائي');
        return false;
      }
      
      // حساب الكمية الجديدة
      const newQuantity = Math.max(0, product.quantity - quantity);
      
      // تحديث المخزون
      const { error: updateError } = await supabase
        .from('finished_products')
        .update({ quantity: newQuantity })
        .eq('code', code);
      
      if (updateError) {
        toast.error('حدث خطأ أثناء تحديث المخزون');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error removing finished product from inventory:', error);
      toast.error('حدث خطأ أثناء سحب المنتج من المخزون');
      return false;
    }
  }
}

export default InventoryService;
