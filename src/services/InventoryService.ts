
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// أنواع البيانات للمواد المختلفة
export interface RawMaterial {
  id: number;
  code: string;
  name: string;
  quantity: number;
  minStock: number;
  unit: string;
  unitCost: number;
}

export interface SemiFinishedProduct {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  ingredients: {
    id: number;
    code: string;
    name: string;
    percentage: number;
  }[];
  unitCost: number;
  minStock: number;
}

export interface FinishedProduct {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
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
  unitCost: number;
  minStock: number;
}

export interface PackagingMaterial {
  id: number;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  minStock: number;
}

// الفئة الخدمية للمخزون
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
  
  // الحصول على جميع المواد الأولية من قاعدة البيانات
  public async getRawMaterials(): Promise<RawMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      return data.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        quantity: item.quantity,
        minStock: item.min_stock,
        unit: item.unit,
        unitCost: item.unit_cost
      }));
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      return [];
    }
  }
  
  // الحصول على جميع المنتجات النصف مصنعة من قاعدة البيانات
  public async getSemiFinishedProducts(): Promise<SemiFinishedProduct[]> {
    try {
      // جلب المنتجات النصف مصنعة
      const { data: products, error } = await supabase
        .from('semi_finished_products')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      // جلب مكونات كل منتج
      const semiFinishedProducts = await Promise.all(products.map(async (product) => {
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('semi_finished_ingredients')
          .select(`
            id,
            percentage,
            raw_materials:raw_material_id(id, code, name)
          `)
          .eq('semi_finished_id', product.id);
          
        if (ingredientsError) throw ingredientsError;
        
        return {
          id: product.id,
          code: product.code,
          name: product.name,
          quantity: product.quantity,
          unit: product.unit,
          unitCost: product.unit_cost,
          minStock: product.min_stock,
          ingredients: ingredients.map(ing => ({
            id: ing.raw_materials.id,
            code: ing.raw_materials.code,
            name: ing.raw_materials.name,
            percentage: ing.percentage
          }))
        };
      }));
      
      return semiFinishedProducts;
    } catch (error) {
      console.error('Error fetching semi-finished products:', error);
      return [];
    }
  }
  
  // الحصول على جميع مواد التعبئة من قاعدة البيانات
  public async getPackagingMaterials(): Promise<PackagingMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      return data.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unit_cost,
        minStock: item.min_stock
      }));
    } catch (error) {
      console.error('Error fetching packaging materials:', error);
      return [];
    }
  }
  
  // الحصول على جميع المنتجات النهائية من قاعدة البيانات
  public async getFinishedProducts(): Promise<FinishedProduct[]> {
    try {
      const { data: finishedProducts, error } = await supabase
        .from('finished_products')
        .select(`
          *,
          semi_finished:semi_finished_id(id, code, name)
        `)
        .order('name');
        
      if (error) throw error;
      
      const productsWithPackaging = await Promise.all(finishedProducts.map(async (product) => {
        const { data: packagingItems, error: pkgError } = await supabase
          .from('finished_product_packaging')
          .select(`
            quantity,
            packaging_materials:packaging_material_id(id, code, name)
          `)
          .eq('finished_product_id', product.id);
          
        if (pkgError) throw pkgError;
        
        return {
          id: product.id,
          code: product.code,
          name: product.name,
          quantity: product.quantity,
          unit: product.unit,
          semiFinished: {
            code: product.semi_finished.code,
            name: product.semi_finished.name,
            quantity: product.semi_finished_quantity
          },
          packaging: packagingItems.map(item => ({
            code: item.packaging_materials.code,
            name: item.packaging_materials.name,
            quantity: item.quantity
          })),
          unitCost: product.unit_cost,
          minStock: product.min_stock
        };
      }));
      
      return productsWithPackaging;
    } catch (error) {
      console.error('Error fetching finished products:', error);
      return [];
    }
  }
  
  // الحصول على المواد ذات المخزون المنخفض
  public async getLowStockItems() {
    try {
      // Changed approach to avoid using rpc with 'least' function
      const [rawMaterialsData, semiFinishedData, packagingData, finishedData] = await Promise.all([
        // المواد الأولية
        supabase.from('raw_materials').select('*'),
        // المنتجات النصف مصنعة
        supabase.from('semi_finished_products').select('*'),
        // مواد التعبئة
        supabase.from('packaging_materials').select('*'),
        // المنتجات النهائية
        supabase.from('finished_products').select('*')
      ]);
      
      if (rawMaterialsData.error || semiFinishedData.error || packagingData.error || finishedData.error) {
        throw new Error('فشل في جلب بيانات المخزون المنخفض');
      }
      
      // Filter for low stock items in memory instead of using DB function
      const lowStockRaw = rawMaterialsData.data
        .filter(item => item.quantity <= item.min_stock)
        .map(item => ({ 
          ...item, 
          minStock: item.min_stock,
          unitCost: item.unit_cost,
          type: 'rawMaterial' as const 
        }));
      
      const lowStockSemi = semiFinishedData.data
        .filter(item => item.quantity <= item.min_stock)
        .map(item => ({ 
          ...item, 
          minStock: item.min_stock,
          unitCost: item.unit_cost,
          type: 'semiFinished' as const 
        }));
      
      const lowStockPackaging = packagingData.data
        .filter(item => item.quantity <= item.min_stock)
        .map(item => ({ 
          ...item, 
          minStock: item.min_stock,
          unitCost: item.unit_cost,
          type: 'packaging' as const 
        }));
      
      const lowStockFinished = finishedData.data
        .filter(item => item.quantity <= item.min_stock)
        .map(item => ({ 
          ...item, 
          minStock: item.min_stock,
          unitCost: item.unit_cost,
          type: 'finished' as const 
        }));
      
      return [...lowStockRaw, ...lowStockSemi, ...lowStockPackaging, ...lowStockFinished];
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      return [];
    }
  }
  
  // التحقق من توفر المواد الأولية
  public async checkRawMaterialsAvailability(requirements: { code: string, requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const req of requirements) {
        const { data, error } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('code', req.code)
          .single();
          
        if (error || !data || data.quantity < req.requiredQuantity) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking raw materials availability:', error);
      return false;
    }
  }
  
  // التحقق من توفر المنتجات النصف مصنعة
  public async checkSemiFinishedAvailability(code: string, requiredQuantity: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('code', code)
        .single();
        
      if (error || !data) return false;
      return data.quantity >= requiredQuantity;
    } catch (error) {
      console.error('Error checking semi-finished availability:', error);
      return false;
    }
  }
  
  // التحقق من توفر مواد التعبئة
  public async checkPackagingAvailability(requirements: { code: string, requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const req of requirements) {
        const { data, error } = await supabase
          .from('packaging_materials')
          .select('quantity')
          .eq('code', req.code)
          .single();
          
        if (error || !data || data.quantity < req.requiredQuantity) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking packaging availability:', error);
      return false;
    }
  }
  
  // استهلاك المواد الأولية لإنتاج منتج نصف مصنع
  public async consumeRawMaterials(requirements: { code: string, requiredQuantity: number }[]): Promise<boolean> {
    // التحقق من التوفر أولاً
    const isAvailable = await this.checkRawMaterialsAvailability(requirements);
    if (!isAvailable) {
      toast.error('المواد الأولية غير متوفرة بالكميات المطلوبة');
      return false;
    }
    
    try {
      // استهلاك المواد
      for (const req of requirements) {
        const { data, error } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('code', req.code)
          .single();
          
        if (error) throw error;
        
        const newQuantity = data.quantity - req.requiredQuantity;
        
        const { error: updateError } = await supabase
          .from('raw_materials')
          .update({ quantity: newQuantity })
          .eq('code', req.code);
          
        if (updateError) throw updateError;
      }
      
      toast.success('تم استهلاك المواد الأولية بنجاح');
      return true;
    } catch (error) {
      console.error('Error consuming raw materials:', error);
      toast.error('حدث خطأ أثناء استهلاك المواد الأولية');
      return false;
    }
  }
  
  // إضافة منتج نصف مصنع للمخزون
  public async addSemiFinishedToInventory(code: string, quantity: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('*')
        .eq('code', code)
        .single();
        
      if (error) throw error;
      
      const newQuantity = data.quantity + quantity;
      
      const { error: updateError } = await supabase
        .from('semi_finished_products')
        .update({ quantity: newQuantity })
        .eq('code', code);
        
      if (updateError) throw updateError;
      
      toast.success(`تمت إضافة ${quantity} ${data.unit} من ${data.name} للمخزون`);
      return true;
    } catch (error) {
      console.error('Error adding semi-finished to inventory:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج النصف مصنع للمخزون');
      return false;
    }
  }
  
  // استهلاك منتج نصف مصنع ومواد تعبئة لإنتاج منتج نهائي
  public async produceFinishedProduct(
    finishedProductCode: string,
    quantity: number,
    semiFinishedCode: string,
    semiFinishedQuantity: number,
    packagingRequirements: { code: string, requiredQuantity: number }[]
  ): Promise<boolean> {
    // التحقق من توفر المنتج النصف مصنع
    const isSemiFinishedAvailable = await this.checkSemiFinishedAvailability(semiFinishedCode, semiFinishedQuantity * quantity);
    if (!isSemiFinishedAvailable) {
      toast.error('المنتج النصف مصنع غير متوفر بالكمية المطلوبة');
      return false;
    }
    
    // التحقق من توفر مواد التعبئة
    const totalPackagingReqs = packagingRequirements.map(req => ({
      code: req.code,
      requiredQuantity: req.requiredQuantity * quantity
    }));
    
    const isPackagingAvailable = await this.checkPackagingAvailability(totalPackagingReqs);
    if (!isPackagingAvailable) {
      toast.error('مواد التعبئة غير متوفرة بالكميات المطلوبة');
      return false;
    }
    
    try {
      // استهلاك المنتج النصف مصنع
      const { data: semiFinished, error: semiError } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('code', semiFinishedCode)
        .single();
        
      if (semiError) throw semiError;
      
      const newSemiQuantity = semiFinished.quantity - (semiFinishedQuantity * quantity);
      
      const { error: updateSemiError } = await supabase
        .from('semi_finished_products')
        .update({ quantity: newSemiQuantity })
        .eq('code', semiFinishedCode);
        
      if (updateSemiError) throw updateSemiError;
      
      // استهلاك مواد التعبئة
      for (const req of totalPackagingReqs) {
        const { data: material, error: matError } = await supabase
          .from('packaging_materials')
          .select('quantity')
          .eq('code', req.code)
          .single();
          
        if (matError) throw matError;
        
        const newQuantity = material.quantity - req.requiredQuantity;
        
        const { error: updateMatError } = await supabase
          .from('packaging_materials')
          .update({ quantity: newQuantity })
          .eq('code', req.code);
          
        if (updateMatError) throw updateMatError;
      }
      
      // إضافة المنتج النهائي للمخزون
      const { data: finishedProduct, error: fpError } = await supabase
        .from('finished_products')
        .select('quantity')
        .eq('code', finishedProductCode)
        .single();
        
      if (fpError) throw fpError;
      
      const newQuantity = finishedProduct.quantity + quantity;
      
      const { error: updateFpError } = await supabase
        .from('finished_products')
        .update({ quantity: newQuantity })
        .eq('code', finishedProductCode);
        
      if (updateFpError) throw updateFpError;
      
      toast.success(`تم إنتاج ${quantity} وحدة من المنتج النهائي بنجاح`);
      return true;
    } catch (error) {
      console.error('Error producing finished product:', error);
      toast.error('حدث خطأ أثناء إنتاج المنتج النهائي');
      return false;
    }
  }
  
  // الحصول على بيانات للرسم البياني لتوزيع المخزون
  public async getInventoryDistributionData() {
    try {
      // جلب بيانات المواد الأولية
      const { data: rawMaterialsData, error: rawMaterialsError } = await supabase
        .from('raw_materials')
        .select('quantity, unit_cost');
      
      if (rawMaterialsError) throw rawMaterialsError;
      
      // جلب بيانات المنتجات النصف مصنعة
      const { data: semiFinishedData, error: semiFinishedError } = await supabase
        .from('semi_finished_products')
        .select('quantity, unit_cost');
      
      if (semiFinishedError) throw semiFinishedError;
      
      // جلب بيانات مستلزمات التعبئة
      const { data: packagingData, error: packagingError } = await supabase
        .from('packaging_materials')
        .select('quantity, unit_cost');
      
      if (packagingError) throw packagingError;
      
      // جلب بيانات المنتجات النهائية
      const { data: finishedData, error: finishedError } = await supabase
        .from('finished_products')
        .select('quantity, unit_cost');
      
      if (finishedError) throw finishedError;
      
      // حساب القيم الإجمالية لكل نوع
      const rawMaterialsValue = rawMaterialsData.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
      const semiFinishedValue = semiFinishedData.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
      const packagingValue = packagingData.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
      const finishedProductsValue = finishedData.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
      
      return [
        { name: 'المواد الأولية', value: rawMaterialsValue },
        { name: 'المنتجات النصف مصنعة', value: semiFinishedValue },
        { name: 'مواد التعبئة', value: packagingValue },
        { name: 'المنتجات النهائية', value: finishedProductsValue }
      ];
    } catch (error) {
      console.error('Error fetching inventory distribution data:', error);
      return [];
    }
  }
  
  // الحصول على إحصائيات عامة للمخزون
  public async getInventoryStats() {
    try {
      const [rawCountData, semiCountData, packagingCountData, finishedCountData, lowStockItems] = await Promise.all([
        // عدد المواد الأولية
        supabase.from('raw_materials').select('id', { count: 'exact', head: true }),
        
        // عدد المنتجات النصف مصنعة
        supabase.from('semi_finished_products').select('id', { count: 'exact', head: true }),
        
        // عدد مواد التعبئة
        supabase.from('packaging_materials').select('id', { count: 'exact', head: true }),
        
        // عدد المنتجات النهائية
        supabase.from('finished_products').select('id', { count: 'exact', head: true }),
        
        // العناصر ذات المخزون المنخفض
        this.getLowStockItems()
      ]);
      
      // حساب القيمة الإجمالية للمخزون
      const distributionData = await this.getInventoryDistributionData();
      const totalValue = distributionData.reduce((sum, item) => sum + item.value, 0);
      
      return {
        totalItems: (rawCountData.count || 0) + (semiCountData.count || 0) + (packagingCountData.count || 0) + (finishedCountData.count || 0),
        lowStockItems: lowStockItems.length,
        totalValue,
        categories: {
          rawMaterials: rawCountData.count || 0,
          semiFinished: semiCountData.count || 0,
          packaging: packagingCountData.count || 0,
          finished: finishedCountData.count || 0
        }
      };
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      return {
        totalItems: 0,
        lowStockItems: 0,
        totalValue: 0,
        categories: {
          rawMaterials: 0,
          semiFinished: 0,
          packaging: 0,
          finished: 0
        }
      };
    }
  }
}

export default InventoryService;
