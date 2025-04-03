import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import {
  RawMaterialWithSalesPrice as RawMaterial,
  PackagingMaterialWithSalesPrice as PackagingMaterial,
  SemiFinishedProductWithSalesPrice as SemiFinishedProduct,
  FinishedProductWithSalesPrice as FinishedProduct
} from "@/types/inventoryTypes";

class InventoryService {
  private static instance: InventoryService;
  
  private constructor() {}
  
  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }
  
  public async getRawMaterials(): Promise<RawMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return data.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        min_stock: Number(item.min_stock),
        unit_cost: Number(item.unit_cost),
        sales_price: Number(item.sales_price) || 0
      })) || [];
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      toast.error('حدث خطأ أثناء جلب المواد الخام');
      return [];
    }
  }
  
  public async addRawMaterial(item: Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .insert([item])
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`تمت إضافة ${item.name} بنجاح`);
      return {
        ...data,
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price) || 0
      };
    } catch (error) {
      console.error('Error adding raw material:', error);
      toast.error('حدث خطأ أثناء إضافة المادة الخام');
      return null;
    }
  }
  
  public async updateRawMaterial(id: number, updates: Partial<Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>>): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`تم تحديث ${data.name} بنجاح`);
      return {
        ...data,
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price) || 0
      };
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
      
      if (error) throw error;
      
      toast.success('تم حذف المادة الخام بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting raw material:', error);
      toast.error('حدث خطأ أثناء حذف المادة الخام');
      return false;
    }
  }
  
  public async getPackagingMaterials(): Promise<PackagingMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return data.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        min_stock: Number(item.min_stock),
        unit_cost: Number(item.unit_cost),
        sales_price: Number(item.sales_price) || 0
      })) || [];
    } catch (error) {
      console.error('Error fetching packaging materials:', error);
      toast.error('حدث خطأ أثناء جلب مواد التعبئة والتغليف');
      return [];
    }
  }
  
  public async addPackagingMaterial(item: Omit<PackagingMaterial, 'id' | 'created_at' | 'updated_at'>): Promise<PackagingMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('packaging_materials')
        .insert([item])
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`تمت إضافة ${item.name} بنجاح`);
      return {
        ...data,
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price) || 0
      };
    } catch (error) {
      console.error('Error adding packaging material:', error);
      toast.error('حدث خطأ أثناء إضافة مادة التعبئة والتغليف');
      return null;
    }
  }
  
  public async updatePackagingMaterial(id: number, updates: Partial<Omit<PackagingMaterial, 'id' | 'created_at' | 'updated_at'>>): Promise<PackagingMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('packaging_materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`تم تحديث ${data.name} بنجاح`);
      return {
        ...data,
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price) || 0
      };
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
      
      if (error) throw error;
      
      toast.success('تم حذف مادة التعبئة والتغليف بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting packaging material:', error);
      toast.error('حدث خطأ أثناء حذف مادة التعبئة والتغليف');
      return false;
    }
  }
  
  public async getSemiFinishedProducts(): Promise<SemiFinishedProduct[]> {
    try {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      const productsWithIngredients = await Promise.all(
        (data || []).map(async (product) => {
          const ingredients = await this.getSemiFinishedIngredients(product.id);
          return {
            ...product,
            quantity: Number(product.quantity),
            min_stock: Number(product.min_stock),
            unit_cost: Number(product.unit_cost),
            sales_price: Number(product.sales_price) || 0,
            ingredients
          };
        })
      );
      
      return productsWithIngredients;
    } catch (error) {
      console.error('Error fetching semi-finished products:', error);
      toast.error('حدث خطأ أثناء جلب المنتجات نصف المصنعة');
      return [];
    }
  }
  
  private async getSemiFinishedIngredients(productId: number) {
    try {
      const { data, error } = await supabase
        .from('semi_finished_ingredients')
        .select(`
          id,
          percentage,
          raw_material:raw_material_id(id, code, name)
        `)
        .eq('semi_finished_id', productId);
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        code: item.raw_material.code,
        name: item.raw_material.name,
        percentage: Number(item.percentage)
      }));
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      return [];
    }
  }
  
  public async addSemiFinishedProduct(item: Omit<SemiFinishedProduct, 'id' | 'created_at' | 'updated_at' | 'ingredients'>): Promise<SemiFinishedProduct | null> {
    try {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .insert([item])
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`تمت إضافة ${item.name} بنجاح`);
      return { 
        ...data,
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price) || 0,
        ingredients: [] 
      };
    } catch (error) {
      console.error('Error adding semi-finished product:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج نصف المصنع');
      return null;
    }
  }
  
  public async updateSemiFinishedProduct(id: number, updates: Partial<Omit<SemiFinishedProduct, 'id' | 'created_at' | 'updated_at' | 'ingredients'>>): Promise<SemiFinishedProduct | null> {
    try {
      const { data, error } = await supabase
        .from('semi_finished_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(`تم تحديث ${data.name} بنجاح`);
      
      const ingredients = await this.getSemiFinishedIngredients(id);
      
      return { 
        ...data,
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price) || 0,
        ingredients 
      };
    } catch (error) {
      console.error('Error updating semi-finished product:', error);
      toast.error('حدث خطأ أثناء تحديث المنتج نصف المصنع');
      return null;
    }
  }
  
  public async deleteSemiFinishedProduct(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('semi_finished_products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف المنتج نصف المصنع بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting semi-finished product:', error);
      toast.error('حدث خطأ أثناء حذف المنتج نصف المصنع');
      return false;
    }
  }
  
  public async getFinishedProducts(): Promise<FinishedProduct[]> {
    try {
      const { data, error } = await supabase
        .from('finished_products')
        .select('*, semi_finished:semi_finished_id(id, code, name)')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      const productsWithDetails = await Promise.all(
        (data || []).map(async (product) => {
          const packaging = await this.getProductPackaging(product.id);
          
          return {
            ...product,
            quantity: Number(product.quantity),
            min_stock: Number(product.min_stock),
            unit_cost: Number(product.unit_cost),
            sales_price: Number(product.sales_price) || 0,
            semi_finished_quantity: Number(product.semi_finished_quantity),
            semiFinished: {
              code: product.semi_finished.code,
              name: product.semi_finished.name,
              quantity: Number(product.semi_finished_quantity)
            },
            packaging
          };
        })
      );
      
      return productsWithDetails;
    } catch (error) {
      console.error('Error fetching finished products:', error);
      toast.error('حدث خطأ أثناء جلب المنتجات تامة الصنع');
      return [];
    }
  }
  
  private async getProductPackaging(productId: number) {
    try {
      const { data, error } = await supabase
        .from('finished_product_packaging')
        .select(`
          id,
          quantity,
          packaging:packaging_material_id(id, code, name)
        `)
        .eq('finished_product_id', productId);
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        code: item.packaging.code,
        name: item.packaging.name,
        quantity: Number(item.quantity)
      }));
    } catch (error) {
      console.error('Error fetching product packaging:', error);
      return [];
    }
  }
  
  public async addFinishedProduct(item: Omit<FinishedProduct, 'id' | 'created_at' | 'updated_at' | 'semiFinished' | 'packaging'>): Promise<FinishedProduct | null> {
    try {
      const { data, error } = await supabase
        .from('finished_products')
        .insert([item])
        .select()
        .single();
      
      if (error) throw error;
      
      const { data: semiFinished } = await supabase
        .from('semi_finished_products')
        .select('code, name')
        .eq('id', item.semi_finished_id)
        .single();
      
      toast.success(`تمت إضافة ${item.name} بنجاح`);
      
      return { 
        ...data, 
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price) || 0,
        semi_finished_quantity: Number(data.semi_finished_quantity),
        semiFinished: {
          code: semiFinished?.code || '',
          name: semiFinished?.name || '',
          quantity: Number(item.semi_finished_quantity)
        },
        packaging: []
      };
    } catch (error) {
      console.error('Error adding finished product:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج التام الصنع');
      return null;
    }
  }
  
  public async updateFinishedProduct(id: number, updates: Partial<Omit<FinishedProduct, 'id' | 'created_at' | 'updated_at' | 'semiFinished' | 'packaging'>>): Promise<FinishedProduct | null> {
    try {
      const { data, error } = await supabase
        .from('finished_products')
        .update(updates)
        .eq('id', id)
        .select('*, semi_finished:semi_finished_id(code, name)')
        .single();
      
      if (error) throw error;
      
      const packaging = await this.getProductPackaging(id);
      
      toast.success(`تم تحديث ${data.name} بنجاح`);
      
      return { 
        ...data, 
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price) || 0,
        semi_finished_quantity: Number(data.semi_finished_quantity),
        semiFinished: {
          code: data.semi_finished.code,
          name: data.semi_finished.name,
          quantity: Number(data.semi_finished_quantity)
        },
        packaging 
      };
    } catch (error) {
      console.error('Error updating finished product:', error);
      toast.error('حدث خطأ أثناء تحديث المنتج التام الصنع');
      return null;
    }
  }
  
  public async deleteFinishedProduct(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('finished_products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف المنتج التام الصنع بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting finished product:', error);
      toast.error('حدث خطأ أثناء حذف المنتج التام الصنع');
      return false;
    }
  }

  public async recordItemMovement(movement: {
    type: string;
    category: string;
    itemName: string;
    quantity: number;
    date: Date;
    note: string;
  }): Promise<void> {
    try {
      console.log('Inventory movement recorded:', movement);
    } catch (error) {
      console.error('Error recording inventory movement:', error);
      toast.error('حدث خطأ أثناء تسجيل حركة المخزون');
    }
  }

  public async getRawMaterialByCode(code: string): Promise<{ data: RawMaterial | null, error: any }> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('code', code)
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Error getting raw material by code:', error);
      return { data: null, error };
    }
  }
  
  public async returnRawMaterials(materials: { code: string, requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const material of materials) {
        const { data: rawMaterial } = await this.getRawMaterialByCode(material.code);
        if (rawMaterial) {
          await this.updateRawMaterial(rawMaterial.id, {
            quantity: rawMaterial.quantity + material.requiredQuantity
          });
        }
      }
      return true;
    } catch (error) {
      console.error('Error returning raw materials:', error);
      return false;
    }
  }
  
  public async consumeRawMaterials(materials: { code: string, requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const material of materials) {
        const { data: rawMaterial } = await this.getRawMaterialByCode(material.code);
        if (rawMaterial) {
          if (rawMaterial.quantity < material.requiredQuantity) {
            toast.error(`المادة ${rawMaterial.name} غير متوفرة بالكمية المطلوبة`);
            return false;
          }
          
          await this.updateRawMaterial(rawMaterial.id, {
            quantity: rawMaterial.quantity - material.requiredQuantity
          });
        }
      }
      return true;
    } catch (error) {
      console.error('Error consuming raw materials:', error);
      return false;
    }
  }
  
  public async updateRawMaterialsImportance(codes: string[]): Promise<boolean> {
    try {
      for (const code of codes) {
        const { data: rawMaterial } = await this.getRawMaterialByCode(code);
        if (rawMaterial) {
          await this.updateRawMaterial(rawMaterial.id, {
            importance: (rawMaterial.importance || 0) + 1
          });
        }
      }
      return true;
    } catch (error) {
      console.error('Error updating raw materials importance:', error);
      return false;
    }
  }
  
  public async addSemiFinishedToInventory(
    code: string, 
    quantity: number, 
    unitCost?: number
  ): Promise<boolean> {
    try {
      const { data: semiFinishedProducts } = await supabase
        .from('semi_finished_products')
        .select('*')
        .eq('code', code)
        .single();
      
      if (!semiFinishedProducts) {
        toast.error('المنتج النصف مصنع غير موجود');
        return false;
      }
      
      await this.updateSemiFinishedProduct(semiFinishedProducts.id, {
        quantity: semiFinishedProducts.quantity + quantity,
        unit_cost: unitCost || semiFinishedProducts.unit_cost
      });
      
      return true;
    } catch (error) {
      console.error('Error adding semi-finished to inventory:', error);
      return false;
    }
  }
  
  public async removeSemiFinishedFromInventory(code: string, quantity: number): Promise<boolean> {
    try {
      const { data: semiFinishedProduct } = await supabase
        .from('semi_finished_products')
        .select('*')
        .eq('code', code)
        .single();
      
      if (!semiFinishedProduct) {
        toast.error('المنتج النصف مصنع غير موجود');
        return false;
      }
      
      if (semiFinishedProduct.quantity < quantity) {
        toast.error('كمية المنتج النصف مصنع غير كافية');
        return false;
      }
      
      await this.updateSemiFinishedProduct(semiFinishedProduct.id, {
        quantity: semiFinishedProduct.quantity - quantity
      });
      
      return true;
    } catch (error) {
      console.error('Error removing semi-finished from inventory:', error);
      return false;
    }
  }
  
  public async checkSemiFinishedAvailability(code: string, quantity: number): Promise<boolean> {
    try {
      const { data: semiFinishedProduct } = await supabase
        .from('semi_finished_products')
        .select('*')
        .eq('code', code)
        .single();
      
      return semiFinishedProduct && semiFinishedProduct.quantity >= quantity;
    } catch (error) {
      console.error('Error checking semi-finished availability:', error);
      return false;
    }
  }
  
  public async checkPackagingAvailability(materials: { code: string, requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const material of materials) {
        const { data: packagingMaterial } = await supabase
          .from('packaging_materials')
          .select('*')
          .eq('code', material.code)
          .single();
        
        if (!packagingMaterial || packagingMaterial.quantity < material.requiredQuantity) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking packaging availability:', error);
      return false;
    }
  }
  
  public async returnPackagingMaterials(materials: { code: string, requiredQuantity: number }[]): Promise<boolean> {
    try {
      for (const material of materials) {
        const { data: packagingMaterial } = await supabase
          .from('packaging_materials')
          .select('*')
          .eq('code', material.code)
          .single();
        
        if (packagingMaterial) {
          await this.updatePackagingMaterial(packagingMaterial.id, {
            quantity: packagingMaterial.quantity + material.requiredQuantity
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error returning packaging materials:', error);
      return false;
    }
  }
  
  public async removeFinishedFromInventory(code: string, quantity: number): Promise<boolean> {
    try {
      const { data: finishedProduct } = await supabase
        .from('finished_products')
        .select('*')
        .eq('code', code)
        .single();
      
      if (!finishedProduct) {
        toast.error('المنتج التام الصنع غير موجود');
        return false;
      }
      
      if (finishedProduct.quantity < quantity) {
        toast.error('كمية المنتج التام الصنع غير كافية');
        return false;
      }
      
      await this.updateFinishedProduct(finishedProduct.id, {
        quantity: finishedProduct.quantity - quantity
      });
      
      return true;
    } catch (error) {
      console.error('Error removing finished from inventory:', error);
      return false;
    }
  }
  
  public async produceFinishedProduct(
    productCode: string,
    quantity: number,
    semiFinishedCode: string,
    semiFinishedQuantity: number,
    packagingMaterials: { code: string, requiredQuantity: number }[]
  ): Promise<boolean> {
    try {
      const semiFinishedRemoved = await this.removeSemiFinishedFromInventory(
        semiFinishedCode, 
        semiFinishedQuantity
      );
      
      if (!semiFinishedRemoved) {
        return false;
      }
      
      for (const material of packagingMaterials) {
        const { data: packagingMaterial } = await supabase
          .from('packaging_materials')
          .select('*')
          .eq('code', material.code)
          .single();
        
        if (!packagingMaterial || packagingMaterial.quantity < material.requiredQuantity) {
          await this.addSemiFinishedToInventory(semiFinishedCode, semiFinishedQuantity);
          toast.error(`مادة التعبئة ${packagingMaterial?.name || material.code} غير متوفرة بالكمية المطلوبة`);
          return false;
        }
        
        await this.updatePackagingMaterial(packagingMaterial.id, {
          quantity: packagingMaterial.quantity - material.requiredQuantity
        });
      }
      
      const { data: finishedProduct } = await supabase
        .from('finished_products')
        .select('*')
        .eq('code', productCode)
        .single();
      
      if (!finishedProduct) {
        await this.addSemiFinishedToInventory(semiFinishedCode, semiFinishedQuantity);
        await this.returnPackagingMaterials(packagingMaterials);
        toast.error('المنتج التام الصنع غير موجود');
        return false;
      }
      
      await this.updateFinishedProduct(finishedProduct.id, {
        quantity: finishedProduct.quantity + quantity
      });
      
      return true;
    } catch (error) {
      console.error('Error producing finished product:', error);
      return false;
    }
  }

  public async getProductDetails(itemType: string, itemId: number): Promise<{ 
    name: string;
    availableQuantity: number;
    unit: string;
    sales_price: number;
  } | null> {
    try {
      let data, error;
      
      switch(itemType) {
        case 'raw_materials':
          ({ data, error } = await supabase
            .from('raw_materials')
            .select('name, quantity, unit, sales_price, unit_cost')
            .eq('id', itemId)
            .single());
          break;
        case 'packaging_materials':
          ({ data, error } = await supabase
            .from('packaging_materials')
            .select('name, quantity, unit, sales_price, unit_cost')
            .eq('id', itemId)
            .single());
          break;
        case 'semi_finished_products':
          ({ data, error } = await supabase
            .from('semi_finished_products')
            .select('name, quantity, unit, sales_price, unit_cost')
            .eq('id', itemId)
            .single());
          break;
        case 'finished_products':
          ({ data, error } = await supabase
            .from('finished_products')
            .select('name, quantity, unit, sales_price, unit_cost')
            .eq('id', itemId)
            .single());
          break;
        default:
          return null;
      }
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        name: data.name,
        availableQuantity: Number(data.quantity),
        unit: data.unit,
        sales_price: Number(data.sales_price) || Number(data.unit_cost) * 1.2
      };
    } catch (error) {
      console.error('Error fetching product details:', error);
      return null;
    }
  }
}

export default InventoryService;
