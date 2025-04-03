import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  RawMaterial, 
  PackagingMaterial,
  SemiFinishedProduct,
  FinishedProduct
} from '@/types/inventoryTypes';
import { generateCode, generateOrderCode } from '@/utils/generateCode';

class InventoryService {
  private static instance: InventoryService | null = null;
  
  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }
  
  // Raw Materials Methods
  
  /**
   * Get all raw materials
   */
  async getRawMaterials(): Promise<RawMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      // Ensure all numeric fields are properly typed
      return data.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        min_stock: Number(item.min_stock),
        unit_cost: Number(item.unit_cost),
        sales_price: Number(item.sales_price || 0),
        importance: item.importance || 0,
      }));
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      toast.error('حدث خطأ أثناء جلب المواد الخام');
      return [];
    }
  }
  
  /**
   * Add a new raw material
   */
  async addRawMaterial(rawMaterial: Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .insert({
          ...rawMaterial,
          code: rawMaterial.code || generateCode('raw', 0), // Fixed: use named export
          sales_price: rawMaterial.sales_price || (rawMaterial.unit_cost * 1.2),
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Ensure all numeric fields are properly typed
      return {
        ...data,
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price || 0),
        importance: data.importance || 0,
      };
    } catch (error) {
      console.error('Error adding raw material:', error);
      toast.error('حدث خطأ أثناء إضافة المادة الخام');
      return null;
    }
  }
  
  /**
   * Update a raw material
   */
  async updateRawMaterial(id: number, updates: Partial<RawMaterial>): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Ensure all numeric fields are properly typed
      return {
        ...data,
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price || 0),
        importance: data.importance || 0,
      };
    } catch (error) {
      console.error('Error updating raw material:', error);
      toast.error('حدث خطأ أثناء تحديث المادة الخام');
      return null;
    }
  }
  
  // Packaging Materials Methods
  
  /**
   * Get all packaging materials
   */
  async getPackagingMaterials(): Promise<PackagingMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      // Ensure all numeric fields are properly typed
      return data.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        min_stock: Number(item.min_stock),
        unit_cost: Number(item.unit_cost),
        sales_price: Number(item.sales_price || 0),
        importance: item.importance || 0,
      }));
    } catch (error) {
      console.error('Error fetching packaging materials:', error);
      toast.error('حدث خطأ أثناء جلب مواد التعبئة');
      return [];
    }
  }
  
  /**
   * Add a new packaging material
   */
  async addPackagingMaterial(packagingMaterial: Omit<PackagingMaterial, 'id' | 'created_at' | 'updated_at'>): Promise<PackagingMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('packaging_materials')
        .insert({
          ...packagingMaterial,
          code: packagingMaterial.code || generateCode('packaging', 0), // Fixed: use named export
          sales_price: packagingMaterial.sales_price || (packagingMaterial.unit_cost * 1.2),
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Ensure all numeric fields are properly typed
      return {
        ...data,
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price || 0),
        importance: data.importance || 0,
      };
    } catch (error) {
      console.error('Error adding packaging material:', error);
      toast.error('حدث خطأ أثناء إضافة مادة التعبئة');
      return null;
    }
  }
  
  /**
   * Update a packaging material
   */
  async updatePackagingMaterial(id: number, updates: Partial<PackagingMaterial>): Promise<PackagingMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('packaging_materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Ensure all numeric fields are properly typed
      return {
        ...data,
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price || 0),
        importance: data.importance || 0,
      };
    } catch (error) {
      console.error('Error updating packaging material:', error);
      toast.error('حدث خطأ أثناء تحديث مادة التعبئة');
      return null;
    }
  }
  
  // Semi-finished Products Methods
  
  /**
   * Get all semi-finished products
   */
  async getSemiFinishedProducts(): Promise<SemiFinishedProduct[]> {
    try {
      // First, get the semi-finished products data
      const { data: products, error: productsError } = await supabase
        .from('semi_finished_products')
        .select('*')
        .order('name', { ascending: true });
      
      if (productsError) throw productsError;
      
      // Prepare an array to hold the complete products with ingredients
      const productsWithIngredients: SemiFinishedProduct[] = [];
      
      // For each product, get its ingredients
      for (const product of products) {
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('semi_finished_ingredients')
          .select(`
            id, percentage,
            raw_material_id,
            raw_materials (id, code, name)
          `)
          .eq('semi_finished_id', product.id);
        
        if (ingredientsError) {
          console.error(`Error fetching ingredients for product ${product.id}:`, ingredientsError);
          continue;
        }
        
        // Format the ingredients as needed
        const formattedIngredients = ingredients.map(item => ({
          id: item.raw_material_id,
          code: item.raw_materials.code,
          name: item.raw_materials.name,
          percentage: Number(item.percentage)
        }));
        
        // Add the product with its ingredients to the result array
        productsWithIngredients.push({
          ...product,
          quantity: Number(product.quantity),
          min_stock: Number(product.min_stock),
          unit_cost: Number(product.unit_cost),
          sales_price: Number(product.sales_price || 0),
          ingredients: formattedIngredients
        });
      }
      
      return productsWithIngredients;
    } catch (error) {
      console.error('Error fetching semi-finished products:', error);
      toast.error('حدث خطأ أثناء جلب المنتجات نصف المصنعة');
      return [];
    }
  }
  
  /**
   * Get a semi-finished product by ID
   */
  async getSemiFinishedProductById(id: number): Promise<SemiFinishedProduct | null> {
    try {
      const { data: product, error: productError } = await supabase
        .from('semi_finished_products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (productError) throw productError;
      
      // Get the product's ingredients
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('semi_finished_ingredients')
        .select(`
          id, percentage,
          raw_material_id,
          raw_materials (id, code, name)
        `)
        .eq('semi_finished_id', id);
      
      if (ingredientsError) throw ingredientsError;
      
      // Format the ingredients as needed
      const formattedIngredients = ingredients.map(item => ({
        id: item.raw_material_id,
        code: item.raw_materials.code,
        name: item.raw_materials.name,
        percentage: Number(item.percentage)
      }));
      
      // Return the complete product with ingredients
      return {
        ...product,
        quantity: Number(product.quantity),
        min_stock: Number(product.min_stock),
        unit_cost: Number(product.unit_cost),
        sales_price: Number(product.sales_price || 0),
        ingredients: formattedIngredients
      };
    } catch (error) {
      console.error('Error fetching semi-finished product:', error);
      toast.error('حدث خطأ أثناء جلب المنتج نصف المصنع');
      return null;
    }
  }
  
  /**
   * Add a new semi-finished product
   */
  async addSemiFinishedProduct(
    product: Omit<SemiFinishedProduct, 'id' | 'created_at' | 'updated_at'>,
    ingredients: { raw_material_id: number, percentage: number }[]
  ): Promise<SemiFinishedProduct | null> {
    try {
      // First, insert the product
      const { data: newProduct, error: productError } = await supabase
        .from('semi_finished_products')
        .insert({
          code: product.code || generateCode('semi', 0),
          name: product.name,
          unit: product.unit,
          quantity: product.quantity,
          min_stock: product.min_stock,
          unit_cost: product.unit_cost,
          sales_price: product.sales_price || (product.unit_cost * 1.3),
        })
        .select()
        .single();
      
      if (productError) throw productError;
      
      // Then, insert its ingredients
      if (ingredients.length > 0) {
        const ingredientRecords = ingredients.map(ing => ({
          semi_finished_id: newProduct.id,
          raw_material_id: ing.raw_material_id,
          percentage: ing.percentage
        }));
        
        const { error: ingredientsError } = await supabase
          .from('semi_finished_ingredients')
          .insert(ingredientRecords);
        
        if (ingredientsError) throw ingredientsError;
      }
      
      // Return the new product with ingredients
      return await this.getSemiFinishedProductById(newProduct.id);
    } catch (error) {
      console.error('Error adding semi-finished product:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج نصف المصنع');
      return null;
    }
  }
  
  /**
   * Update a semi-finished product
   */
  async updateSemiFinishedProduct(
    id: number,
    updates: Partial<SemiFinishedProduct>,
    ingredients?: { raw_material_id: number, percentage: number }[]
  ): Promise<SemiFinishedProduct | null> {
    try {
      // Update the product details
      const { data: updatedProduct, error: productError } = await supabase
        .from('semi_finished_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (productError) throw productError;
      
      // If ingredients are provided, update them
      if (ingredients) {
        // First, delete all existing ingredients
        const { error: deleteError } = await supabase
          .from('semi_finished_ingredients')
          .delete()
          .eq('semi_finished_id', id);
        
        if (deleteError) throw deleteError;
        
        // Then, insert the new ingredients
        if (ingredients.length > 0) {
          const ingredientRecords = ingredients.map(ing => ({
            semi_finished_id: id,
            raw_material_id: ing.raw_material_id,
            percentage: ing.percentage
          }));
          
          const { error: insertError } = await supabase
            .from('semi_finished_ingredients')
            .insert(ingredientRecords);
          
          if (insertError) throw insertError;
        }
      }
      
      // Return the updated product with ingredients
      return await this.getSemiFinishedProductById(id);
    } catch (error) {
      console.error('Error updating semi-finished product:', error);
      toast.error('حدث خطأ أثناء تحديث المنتج نصف المصنع');
      return null;
    }
  }
  
  // Finished Products Methods
  
  /**
   * Get all finished products
   */
  async getFinishedProducts(): Promise<FinishedProduct[]> {
    try {
      // First, get the finished products data
      const { data: products, error: productsError } = await supabase
        .from('finished_products')
        .select(`
          *,
          semi_finished_products (id, code, name, quantity)
        `)
        .order('name', { ascending: true });
      
      if (productsError) throw productsError;
      
      // Prepare an array to hold the complete products with packaging materials
      const productsWithPackaging: FinishedProduct[] = [];
      
      // For each product, get its packaging materials
      for (const product of products) {
        const { data: packaging, error: packagingError } = await supabase
          .from('finished_product_packaging')
          .select(`
            id, quantity,
            packaging_material_id,
            packaging_materials (id, code, name)
          `)
          .eq('finished_product_id', product.id);
        
        if (packagingError) {
          console.error(`Error fetching packaging for product ${product.id}:`, packagingError);
          continue;
        }
        
        // Format the packaging materials as needed
        const formattedPackaging = packaging.map(item => ({
          code: item.packaging_materials.code,
          name: item.packaging_materials.name,
          quantity: Number(item.quantity)
        }));
        
        // Add the product with its packaging to the result array
        productsWithPackaging.push({
          ...product,
          semiFinished: {
            code: product.semi_finished_products.code,
            name: product.semi_finished_products.name,
            quantity: Number(product.semi_finished_products.quantity)
          },
          packaging: formattedPackaging,
          quantity: Number(product.quantity),
          min_stock: Number(product.min_stock),
          unit_cost: Number(product.unit_cost),
          sales_price: Number(product.sales_price || 0),
          semi_finished_quantity: Number(product.semi_finished_quantity)
        });
      }
      
      return productsWithPackaging;
    } catch (error) {
      console.error('Error fetching finished products:', error);
      toast.error('حدث خطأ أثناء جلب المنتجات النهائية');
      return [];
    }
  }
  
  /**
   * Get a finished product by ID
   */
  async getFinishedProductById(id: number): Promise<FinishedProduct | null> {
    try {
      const { data: product, error: productError } = await supabase
        .from('finished_products')
        .select(`
          *,
          semi_finished_products (id, code, name, quantity)
        `)
        .eq('id', id)
        .single();
      
      if (productError) throw productError;
      
      // Get the product's packaging materials
      const { data: packaging, error: packagingError } = await supabase
        .from('finished_product_packaging')
        .select(`
          id, quantity,
          packaging_material_id,
          packaging_materials (id, code, name)
        `)
        .eq('finished_product_id', id);
      
      if (packagingError) throw packagingError;
      
      // Format the packaging materials as needed
      const formattedPackaging = packaging.map(item => ({
        code: item.packaging_materials.code,
        name: item.packaging_materials.name,
        quantity: Number(item.quantity)
      }));
      
      // Return the complete product with packaging
      return {
        ...product,
        semiFinished: {
          code: product.semi_finished_products.code,
          name: product.semi_finished_products.name,
          quantity: Number(product.semi_finished_products.quantity)
        },
        packaging: formattedPackaging,
        quantity: Number(product.quantity),
        min_stock: Number(product.min_stock),
        unit_cost: Number(product.unit_cost),
        sales_price: Number(product.sales_price || 0),
        semi_finished_quantity: Number(product.semi_finished_quantity)
      };
    } catch (error) {
      console.error('Error fetching finished product:', error);
      toast.error('حدث خطأ أثناء جلب المنتج النهائي');
      return null;
    }
  }
  
  /**
   * Add a new finished product
   */
  async addFinishedProduct(
    product: Omit<FinishedProduct, 'id' | 'created_at' | 'updated_at' | 'semiFinished' | 'packaging'>,
    packagingMaterials: { packaging_material_id: number, quantity: number }[]
  ): Promise<FinishedProduct | null> {
    try {
      // First, insert the product
      const { data: newProduct, error: productError } = await supabase
        .from('finished_products')
        .insert({
          code: product.code || generateCode('finished', 0),
          name: product.name,
          unit: product.unit,
          quantity: product.quantity,
          min_stock: product.min_stock,
          unit_cost: product.unit_cost,
          sales_price: product.sales_price || (product.unit_cost * 1.5),
          semi_finished_id: product.semi_finished_id,
          semi_finished_quantity: product.semi_finished_quantity
        })
        .select()
        .single();
      
      if (productError) throw productError;
      
      // Then, insert its packaging materials
      if (packagingMaterials.length > 0) {
        const packagingRecords = packagingMaterials.map(pkg => ({
          finished_product_id: newProduct.id,
          packaging_material_id: pkg.packaging_material_id,
          quantity: pkg.quantity
        }));
        
        const { error: packagingError } = await supabase
          .from('finished_product_packaging')
          .insert(packagingRecords);
        
        if (packagingError) throw packagingError;
      }
      
      // Return the new product with packaging
      return await this.getFinishedProductById(newProduct.id);
    } catch (error) {
      console.error('Error adding finished product:', error);
      toast.error('حدث خطأ أثناء إضافة المنتج النهائي');
      return null;
    }
  }
  
  /**
   * Update a finished product
   */
  async updateFinishedProduct(
    id: number,
    updates: Partial<FinishedProduct>,
    packagingMaterials?: { packaging_material_id: number, quantity: number }[]
  ): Promise<FinishedProduct | null> {
    try {
      // Update the product details
      const { data: updatedProduct, error: productError } = await supabase
        .from('finished_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (productError) throw productError;
      
      // If packaging materials are provided, update them
      if (packagingMaterials) {
        // First, delete all existing packaging materials
        const { error: deleteError } = await supabase
          .from('finished_product_packaging')
          .delete()
          .eq('finished_product_id', id);
        
        if (deleteError) throw deleteError;
        
        // Then, insert the new packaging materials
        if (packagingMaterials.length > 0) {
          const packagingRecords = packagingMaterials.map(pkg => ({
            finished_product_id: id,
            packaging_material_id: pkg.packaging_material_id,
            quantity: pkg.quantity
          }));
          
          const { error: insertError } = await supabase
            .from('finished_product_packaging')
            .insert(packagingRecords);
          
          if (insertError) throw insertError;
        }
      }
      
      // Return the updated product with packaging
      return await this.getFinishedProductById(id);
    } catch (error) {
      console.error('Error updating finished product:', error);
      toast.error('حدث خطأ أثناء تحديث المنتج النهائي');
      return null;
    }
  }

  // Additional utility methods as needed
}

export default InventoryService;
