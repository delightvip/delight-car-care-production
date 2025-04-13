import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RawMaterial {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  category: string;
  supplier: string;
  min_stock: number;
  importance: number;
}

interface SemiFinishedProduct {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  ingredients: {
    code: string;
    name: string;
    percentage: number;
  }[];
}

interface PackagingMaterial {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit_cost: number;
}

interface FinishedProduct {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  sales_price: number;
  min_stock: number;
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

interface InventoryMovement {
  itemId: string;
  itemType: 'raw_material' | 'semi_finished' | 'finished' | 'packaging';
  quantity: number;
  movementType: 'addition' | 'consumption';
  reason: string;
  date?: string;
}

class InventoryService {
  private static instance: InventoryService;
  
  private constructor() {}
  
  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }
  
  // المواد الخام
  public async getRawMaterials(): Promise<RawMaterial[]> {
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching raw materials:', error);
      toast.error('حدث خطأ أثناء جلب المواد الخام');
      return [];
    }
    
    return data || [];
  }
  
  public async getRawMaterialByCode(code: string) {
    return await supabase
      .from('raw_materials')
      .select('*')
      .eq('code', code)
      .single();
  }
  
  public async createRawMaterial(material: Omit<RawMaterial, 'id'>): Promise<RawMaterial | null> {
    try {
      const { data: maxCode } = await supabase
        .from('raw_materials')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);
      
      let newCode = 'RM-00001';
      if (maxCode && maxCode.length > 0) {
        const lastCode = maxCode[0].code;
        const lastNum = parseInt(lastCode.split('-')[1]);
        newCode = `RM-${String(lastNum + 1).padStart(5, '0')}`;
      }
      
      const { data, error } = await supabase
        .from('raw_materials')
        .insert({
          ...material,
          code: newCode
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating raw material:', error);
        toast.error('حدث خطأ أثناء إنشاء المادة الخام');
        return null;
      }
      
      toast.success(`تم إنشاء المادة الخام ${material.name} بنجاح`);
      return data;
    } catch (error) {
      console.error('Error creating raw material:', error);
      toast.error('حدث خطأ أثناء إنشاء المادة الخام');
      return null;
    }
  }
  
  public async updateRawMaterial(id: number, updates: Partial<RawMaterial>): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating raw material:', error);
        toast.error('حدث خطأ أثناء تحديث المادة الخام');
        return null;
      }
      
      toast.success(`تم تحديث المادة الخام ${data.name} بنجاح`);
      return data;
    } catch (error) {
      console.error('Error updating raw material:', error);
      toast.error('حدث خطأ أثناء تحديث المادة الخام');
      return null;
    }
  }
  
  public async deleteRawMaterial(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting raw material:', error);
        toast.error('حدث خطأ أثناء حذف المادة الخام');
        return false;
      }
      
      toast.success('تم حذف المادة الخام بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting raw material:', error);
      toast.error('حدث خطأ أثناء حذف المادة الخام');
      return false;
    }
  }
  
  // المواد النصف مصنعة
  public async getSemiFinishedProducts(): Promise<SemiFinishedProduct[]> {
    const { data, error } = await supabase
      .from('semi_finished_products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching semi-finished products:', error);
      toast.error('حدث خطأ أثناء جلب المواد النصف مصنعة');
      return [];
    }
    
    return data || [];
  }
  
  public async getSemiFinishedProductByCode(code: string) {
    return await supabase
      .from('semi_finished_products')
      .select('*')
      .eq('code', code)
      .single();
  }
  
  public async createSemiFinishedProduct(product: Omit<SemiFinishedProduct, 'id'>): Promise<SemiFinishedProduct | null> {
    try {
      const { data: maxCode } = await supabase
        .from('semi_finished_products')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);
      
      let newCode = 'SFIN-00001';
      if (maxCode && maxCode.length > 0) {
        const lastCode = maxCode[0].code;
        const lastNum = parseInt(lastCode.split('-')[1]);
        newCode = `SFIN-${String(lastNum + 1).padStart(5, '0')}`;
      }
      
      const { data, error } = await supabase
        .from('semi_finished_products')
        .insert({
          ...product,
          code: newCode
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating semi-finished product:', error);
        toast.error('حدث خطأ أثناء إنشاء المادة النصف مصنعة');
        return null;
      }
      
      toast.success(`تم إنشاء المادة النصف مصنعة ${product.name} بنجاح`);
      return data;
    } catch (error) {
      console.error('Error creating semi-finished product:', error);
      toast.error('حدث خطأ أثناء إنشاء المادة النصف مصنعة');
      return null;
    }
  }
  
  public async updateSemiFinishedProduct(id: number, updates: Partial<SemiFinishedProduct>): Promise<SemiFinishedProduct | null> {
    try {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating semi-finished product:', error);
        toast.error('حدث خطأ أثناء تحديث المادة النصف مصنعة');
        return null;
      }
      
      toast.success(`تم تحديث المادة النصف مصنعة ${data.name} بنجاح`);
      return data;
    } catch (error) {
      console.error('Error updating semi-finished product:', error);
      toast.error('حدث خطأ أثناء تحديث المادة النصف مصنعة');
      return null;
    }
  }
  
  public async deleteSemiFinishedProduct(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('semi_finished_products')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting semi-finished product:', error);
        toast.error('حدث خطأ أثناء حذف المادة النصف مصنعة');
        return false;
      }
      
      toast.success('تم حذف المادة النصف مصنعة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting semi-finished product:', error);
      toast.error('حدث خطأ أثناء حذف المادة النصف مصنعة');
      return false;
    }
  }
  
  // مواد التعبئة والتغليف
  public async getPackagingMaterials(): Promise<PackagingMaterial[]> {
    const { data, error } = await supabase
      .from('packaging_materials')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching packaging materials:', error);
      toast.error('حدث خطأ أثناء جلب مواد التعبئة والتغليف');
      return [];
    }
    
    return data || [];
  }
  
  public async getPackagingMaterialByCode(code: string) {
    return await supabase
      .from('packaging_materials')
      .select('*')
      .eq('code', code)
      .single();
  }
  
  public async createPackagingMaterial(material: Omit<PackagingMaterial, 'id'>): Promise<PackagingMaterial | null> {
    try {
      const { data: maxCode } = await supabase
        .from('packaging_materials')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);
      
      let newCode = 'PACK-00001';
      if (maxCode && maxCode.length > 0) {
        const lastCode = maxCode[0].code;
        const lastNum = parseInt(lastCode.split('-')[1]);
        newCode = `PACK-${String(lastNum + 1).padStart(5, '0')}`;
      }
      
      const { data, error } = await supabase
        .from('packaging_materials')
        .insert({
          ...material,
          code: newCode
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating packaging material:', error);
        toast.error('حدث خطأ أثناء إنشاء مادة التعبئة والتغليف');
        return null;
      }
      
      toast.success(`تم إنشاء مادة التعبئة والتغليف ${material.name} بنجاح`);
      return data;
    } catch (error) {
      console.error('Error creating packaging material:', error);
      toast.error('حدث خطأ أثناء إنشاء مادة التعبئة والتغليف');
      return null;
    }
  }
  
  public async updatePackagingMaterial(id: number, updates: Partial<PackagingMaterial>): Promise<PackagingMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('packaging_materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating packaging material:', error);
        toast.error('حدث خطأ أثناء تحديث مادة التعبئة والتغليف');
        return null;
      }
      
      toast.success(`تم تحديث مادة التعبئة والتغليف ${data.name} بنجاح`);
      return data;
    } catch (error) {
      console.error('Error updating packaging material:', error);
      toast.error('حدث خطأ أثناء تحديث مادة التعبئة والتغليف');
      return null;
    }
  }
  
  public async deletePackagingMaterial(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('packaging_materials')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting packaging material:', error);
        toast.error('حدث خطأ أثناء حذف مادة التعبئة والتغليف');
        return false;
      }
      
      toast.success('تم حذف مادة التعبئة والتغليف بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting packaging material:', error);
      toast.error('حدث خطأ أثناء حذف مادة التعبئة والتغليف');
      return false;
    }
  }
  
  // المنتجات النهائية
  public async getFinishedProducts(): Promise<FinishedProduct[]> {
    const { data, error } = await supabase
      .from('finished_products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching finished products:', error);
      toast.error('حدث خطأ أثناء جلب المنتجات النهائية');
      return [];
    }
    
    return data || [];
  }
  
  public async getFinishedProductByCode(code: string) {
    return await supabase
      .from('finished_products')
      .select('*')
      .eq('code', code)
      .single();
  }
  
  public async createFinishedProduct(product: Omit<FinishedProduct, 'id'>): Promise<FinishedProduct | null> {
    try {
      const { data: maxCode } = await supabase
        .from('finished_products')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);
      
      let newCode = 'FIN-00001';
      if (maxCode && maxCode.length > 0) {
        const lastCode = maxCode[0].code;
        const lastNum = parseInt(lastCode.split('-')[1]);
        newCode = `FIN-${String(lastNum + 1).padStart(5, '0')}`;
      }
      
      const { data, error } = await supabase
        .from('finished_products')
        .insert({
          ...product,
          code: newCode
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating finished product:', error);
        toast.error('حدث خطأ أثناء إنشاء المنتج النهائي');
        return null;
      }
      
      toast.success(`تم إنشاء المنتج النهائي ${product.name} بنجاح`);
      return data;
    } catch (error) {
      console.error('Error creating finished product:', error);
      toast.error('حدث خطأ أثناء إنشاء المنتج النهائي');
      return null;
    }
  }
  
  public async updateFinishedProduct(id: number, updates: Partial<FinishedProduct>): Promise<FinishedProduct | null> {
    try {
      const { data, error } = await supabase
        .from('finished_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating finished product:', error);
        toast.error('حدث خطأ أثناء تحديث المنتج النهائي');
        return null;
      }
      
      toast.success(`تم تحديث المنتج النهائي ${data.name} بنجاح`);
      return data;
    } catch (error) {
      console.error('Error updating finished product:', error);
      toast.error('حدث خطأ أثناء تحديث المنتج النهائي');
      return null;
    }
  }
  
  public async deleteFinishedProduct(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('finished_products')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting finished product:', error);
        toast.error('حدث خطأ أثناء حذف المنتج النهائي');
        return false;
      }
      
      toast.success('تم حذف المنتج النهائي بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting finished product:', error);
      toast.error('حدث خطأ أثناء حذف المنتج النهائي');
      return false;
    }
  }
  
  // دوال مساعدة
  public async checkRawMaterialsAvailability(requirements: { code: string; requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const req of requirements) {
        const { data: rawMaterial } = await this.getRawMaterialByCode(req.code);
        if (!rawMaterial || rawMaterial.quantity < req.requiredQuantity) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking raw materials availability:', error);
      return false;
    }
  }
  
  public async consumeRawMaterials(requirements: { code: string; requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const req of requirements) {
        const { data: rawMaterial } = await this.getRawMaterialByCode(req.code);
        if (!rawMaterial) {
          toast.error(`المادة الخام ${req.code} غير موجودة`);
          return false;
        }
        
        const newQuantity = rawMaterial.quantity - req.requiredQuantity;
        if (newQuantity < 0) {
          toast.error(`الكمية المطلوبة من ${req.code} غير متوفرة`);
          return false;
        }
        
        const { error } = await supabase
          .from('raw_materials')
          .update({ quantity: newQuantity })
          .eq('id', rawMaterial.id);
        
        if (error) {
          console.error(`Error consuming raw material ${req.code}:`, error);
          toast.error(`حدث خطأ أثناء استهلاك المادة الخام ${req.code}`);
          return false;
        }
        
        // تسجيل حركة المخزون
        await this.logInventoryMovement({
          itemId: req.code,
          itemType: 'raw_material',
          quantity: -req.requiredQuantity,
          movementType: 'consumption',
          reason: 'استهلاك في أمر إنتاج'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error consuming raw materials:', error);
      toast.error('حدث خطأ أثناء استهلاك المواد الخام');
      return false;
    }
  }
  
  public async returnRawMaterials(materials: { code: string; requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const material of materials) {
        const { data: rawMaterial } = await this.getRawMaterialByCode(material.code);
        if (!rawMaterial) {
          toast.error(`المادة الخام ${material.code} غير موجودة`);
          return false;
        }
        
        const newQuantity = rawMaterial.quantity + material.requiredQuantity;
        
        const { error } = await supabase
          .from('raw_materials')
          .update({ quantity: newQuantity })
          .eq('id', rawMaterial.id);
        
        if (error) {
          console.error(`Error returning raw material ${material.code}:`, error);
          toast.error(`حدث خطأ أثناء إرجاع المادة الخام ${material.code}`);
          return false;
        }
        
        // تسجيل حركة المخزون
        await this.logInventoryMovement({
          itemId: material.code,
          itemType: 'raw_material',
          quantity: material.requiredQuantity,
          movementType: 'addition',
          reason: 'إرجاع من أمر إنتاج ملغي'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error returning raw materials:', error);
      toast.error('حدث خطأ أثناء إرجاع المواد الخام');
      return false;
    }
  }
  
  public async updateRawMaterialsImportance(codes: string[]): Promise<boolean> {
    try {
      for (const code of codes) {
        const { data: rawMaterial } = await this.getRawMaterialByCode(code);
        if (rawMaterial) {
          const newImportance = Math.min(10, rawMaterial.importance + 1);
          
          const { error } = await supabase
            .from('raw_materials')
            .update({ importance: newImportance })
            .eq('id', rawMaterial.id);
          
          if (error) {
            console.error(`Error updating importance for raw material ${code}:`, error);
            toast.warning(`حدث خطأ أثناء تحديث الأهمية للمادة الخام ${code}`);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating raw materials importance:', error);
      return false;
    }
  }
  
  public async checkSemiFinishedAvailability(code: string, requiredQuantity: number): Promise<boolean> {
    try {
      const { data: semiFinished } = await this.getSemiFinishedProductByCode(code);
      if (!semiFinished || semiFinished.quantity < requiredQuantity) {
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking semi-finished availability:', error);
      return false;
    }
  }
  
  public async addSemiFinishedToInventory(code: string, quantity: number, unitCost?: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('id, quantity, unit_cost')
        .eq('code', code)
        .single();
      
      if (error) {
        console.error('Error fetching semi-finished product:', error);
        toast.error('حدث خطأ أثناء جلب بيانات المنتج النصف مصنع');
        return false;
      }
      
      const newQuantity = Number(data.quantity) + Number(quantity);
      
      // تحديث تكلفة الوحدة أيضًا إذا تم تمريرها
      const updateData: any = { quantity: newQuantity };
      if (unitCost !== undefined) {
        updateData.unit_cost = Number(unitCost);
      }
      
      const { error: updateError } = await supabase
        .from('semi_finished_products')
        .update(updateData)
        .eq('id', data.id);
      
      if (updateError) {
        console.error('Error updating semi-finished product quantity:', updateError);
        toast.error('حدث خطأ أثناء تحديث كمية المنتج النصف مصنع');
        return false;
      }
      
      // تسجيل حركة المخزون
      await this.logInventoryMovement({
        itemId: code,
        itemType: 'semi_finished',
        quantity: Number(quantity),
        movementType: 'addition',
        reason: 'إضافة من أمر إنتاج'
      });
      
      return true;
    } catch (error) {
      console.error('Error adding semi-finished to inventory:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج النصف مصنع للمخزون');
      return false;
    }
  }
  
  public async removeSemiFinishedFromInventory(code: string, quantity: number): Promise<boolean> {
    try {
      const { data: semiFinished } = await this.getSemiFinishedProductByCode(code);
      if (!semiFinished) {
        toast.error(`المنتج النصف مصنع ${code} غير موجود`);
        return false;
      }
      
      const newQuantity = semiFinished.quantity - quantity;
      if (newQuantity < 0) {
        toast.error(`لا يمكن إزالة كمية أكبر من الموجودة في المخزون للمنتج ${code}`);
        return false;
      }
      
      const { error } = await supabase
        .from('semi_finished_products')
        .update({ quantity: newQuantity })
        .eq('id', semiFinished.id);
      
      if (error) {
        console.error(`Error removing semi-finished ${code} from inventory:`, error);
        toast.error(`حدث خطأ أثناء إزالة المنتج النصف مصنع ${code} من المخزون`);
        return false;
      }
      
      // تسجيل حركة المخزون
      await this.logInventoryMovement({
        itemId: code,
        itemType: 'semi_finished',
        quantity: -quantity,
        movementType: 'consumption',
        reason: 'إزالة من المخزون'
      });
      
      return true;
    } catch (error) {
      console.error('Error removing semi-finished from inventory:', error);
      toast.error('حدث خطأ أثناء إزالة المنتج النصف مصنع من المخزون');
      return false;
    }
  }
  
  public async checkPackagingAvailability(requirements: { code: string; requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const req of requirements) {
        const { data: packaging } = await this.getPackagingMaterialByCode(req.code);
        if (!packaging || packaging.quantity < req.requiredQuantity) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking packaging availability:', error);
      return false;
    }
  }
  
  public async consumePackagingMaterials(requirements: { code: string; requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const req of requirements) {
        const { data: packaging } = await this.getPackagingMaterialByCode(req.code);
        if (!packaging) {
          toast.error(`مادة التعبئة ${req.code} غير موجودة`);
          return false;
        }
        
        const newQuantity = packaging.quantity - req.requiredQuantity;
        if (newQuantity < 0) {
          toast.error(`الكمية المطلوبة من ${req.code} غير متوفرة`);
          return false;
        }
        
        const { error } = await supabase
          .from('packaging_materials')
          .update({ quantity: newQuantity })
          .eq('id', packaging.id);
        
        if (error) {
          console.error(`Error consuming packaging material ${req.code}:`, error);
          toast.error(`حدث خطأ أثناء استهلاك مادة التعبئة ${req.code}`);
          return false;
        }
        
        // تسجيل حركة المخزون
        await this.logInventoryMovement({
          itemId: req.code,
          itemType: 'packaging',
          quantity: -req.requiredQuantity,
          movementType: 'consumption',
          reason: 'استهلاك في أمر تعبئة'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error consuming packaging materials:', error);
      toast.error('حدث خطأ أثناء استهلاك مواد التعبئة');
      return false;
    }
  }
  
  public async returnPackagingMaterials(materials: { code: string; requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const material of materials) {
        const { data: packaging } = await this.getPackagingMaterialByCode(material.code);
        if (!packaging) {
          toast.error(`مادة التعبئة ${material.code} غير موجودة`);
          return false;
        }
        
        const newQuantity = packaging.quantity + material.requiredQuantity;
        
        const { error } = await supabase
          .from('packaging_materials')
          .update({ quantity: newQuantity })
          .eq('id', packaging.id);
        
        if (error) {
          console.error(`Error returning packaging material ${material.code}:`, error);
          toast.error(`حدث خطأ أثناء إرجاع مادة التعبئة ${material.code}`);
          return false;
        }
        
        // تسجيل حركة المخزون
        await this.logInventoryMovement({
          itemId: material.code,
          itemType: 'packaging',
          quantity: material.requiredQuantity,
          movementType: 'addition',
          reason: 'إرجاع من أمر تعبئة ملغي'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error returning packaging materials:', error);
      toast.error('حدث خطأ أثناء إرجاع مواد التعبئة');
      return false;
    }
  }
  
  public async addFinishedToInventory(code: string, quantity: number, unitCost?: number): Promise<boolean> {
    try {
      const { data: finishedProduct } = await this.getFinishedProductByCode(code);
      if (!finishedProduct) {
        toast.error(`المنتج النهائي ${code} غير موجود`);
        return false;
      }
      
      const newQuantity = finishedProduct.quantity + quantity;
      
      const { error } = await supabase
        .from('finished_products')
        .update({ 
          quantity: newQuantity,
          unit_cost: unitCost // You might want to update the unit cost here as well
        })
        .eq('id', finishedProduct.id);
      
      if (error) {
        console.error(`Error adding finished product ${code} to inventory:`, error);
        toast.error(`حدث خطأ أثناء إضافة المنتج النهائي ${code} إلى المخزون`);
        return false;
      }
      
      // تسجيل حركة المخزون
      await this.logInventoryMovement({
        itemId: code,
        itemType: 'finished',
        quantity: quantity,
        movementType: 'addition',
        reason: 'إضافة إلى المخزون'
      });
      
      return true;
    } catch (error) {
      console.error('Error adding finished product to inventory:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج النهائي إلى المخزون');
      return false;
    }
  }
  
  public async removeFinishedFromInventory(code: string, quantity: number): Promise<boolean> {
    try {
      const { data: finishedProduct } = await this.getFinishedProductByCode(code);
      if (!finishedProduct) {
        toast.error(`المنتج النهائي ${code} غير موجود`);
        return false;
      }
      
      const newQuantity = finishedProduct.quantity - quantity;
      if (newQuantity < 0) {
        toast.error(`لا يمكن إزالة كمية أكبر من الموجودة في المخزون للمنتج ${code}`);
        return false;
      }
      
      const { error } = await supabase
        .from('finished_products')
        .update({ quantity: newQuantity })
        .eq('id', finishedProduct.id);
      
      if (error) {
        console.error(`Error removing finished product ${code} from inventory:`, error);
        toast.error(`حدث خطأ أثناء إزالة المنتج النهائي ${code} من المخزون`);
        return false;
      }
      
      // تسجيل حركة المخزون
      await this.logInventoryMovement({
        itemId: code,
        itemType: 'finished',
        quantity: -quantity,
        movementType: 'consumption',
        reason: 'إزالة من المخزون'
      });
      
      return true;
    } catch (error) {
      console.error('Error removing finished product from inventory:', error);
      toast.error('حدث خطأ أثناء إزالة المنتج النهائي من المخزون');
      return false;
    }
  }
  
  // تسجيل حركة المخزون
  private async logInventoryMovement(movement: InventoryMovement): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('inventory_movements')
        .insert(movement);
      
      if (error) {
        console.error('Error logging inventory movement:', error);
        toast.warning('حدث خطأ أثناء تسجيل حركة المخزون');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error logging inventory movement:', error);
      toast.warning('حدث خطأ أثناء تسجيل حركة المخزون');
      return false;
    }
  }

  // إنتاج منتج نهائي (استهلاك منتج نصف مصنع ومواد تعبئة وإضافة منتج نهائي)
  public async produceFinishedProduct(
    finishedProductCode: string,
    quantity: number,
    semiFinishedCode: string,
    semiFinishedQuantity: number,
    packagingMaterials: { code: string; requiredQuantity: number }[]
  ): Promise<boolean> {
    try {
      // الحصول على المنتج النهائي
      const { data: finishedProductData, error: finishedError } = await supabase
        .from('finished_products')
        .select('id, quantity')
        .eq('code', finishedProductCode)
        .single();
      
      if (finishedError) {
        console.error('Error fetching finished product:', finishedError);
        toast.error('حدث خطأ أثناء جلب بيانات المنتج النهائي');
        return false;
      }
      
      // الحصول على المنتج النصف مصنع
      const { data: semiFinishedData, error: semiFinishedError } = await supabase
        .from('semi_finished_products')
        .select('id, quantity, unit_cost')
        .eq('code', semiFinishedCode)
        .single();
      
      if (semiFinishedError) {
        console.error('Error fetching semi-finished product:', semiFinishedError);
        toast.error('حدث خطأ أثناء جلب بيانات المنتج النصف مصنع');
