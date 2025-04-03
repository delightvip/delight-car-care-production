import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  RawMaterial, 
  PackagingMaterial,
  SemiFinishedProduct,
  FinishedProduct,
  InventoryMovement
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
          code: rawMaterial.code || generateCode('raw', 0),
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
  
  /**
   * Get raw material by code
   */
  async getRawMaterialByCode(code: string): Promise<RawMaterial | null> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('code', code)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        quantity: Number(data.quantity),
        min_stock: Number(data.min_stock),
        unit_cost: Number(data.unit_cost),
        sales_price: Number(data.sales_price || 0),
        importance: data.importance || 0,
      };
    } catch (error) {
      console.error(`Error fetching raw material with code ${code}:`, error);
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
          code: packagingMaterial.code || generateCode('packaging', 0),
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

  // Additional methods needed for other services

  /**
   * Record an item movement in inventory
   */
  async recordItemMovement(movement: { 
    type: 'in' | 'out', 
    category: string, 
    itemName: string, 
    quantity: number, 
    date: Date, 
    note: string 
  }): Promise<void> {
    try {
      // Log the inventory movement
      console.log(`Recording ${movement.type} movement: ${movement.quantity} of ${movement.itemName} in ${movement.category}`);
      
      // Add record to inventory_movements table if it exists
      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          movement_type: movement.type === 'in' ? 'add' : 'subtract',
          item_type: movement.category,
          item_id: movement.itemName, // Using item name as its ID for now
          quantity: movement.quantity,
          reason: movement.note,
          balance_after: 0, // This will need to be calculated before insertion
          created_at: movement.date.toISOString()
        });
      
      if (error) {
        console.error('Failed to record inventory movement:', error);
      }
    } catch (error) {
      console.error('Error recording inventory movement:', error);
    }
  }

  /**
   * Add quantity to semi-finished product inventory
   */
  async addSemiFinishedToInventory(id: string | number, quantity: number): Promise<boolean> {
    try {
      const numericId = typeof id === 'string' ? parseInt(id) : id;
      
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('id', numericId)
        .single();
      
      if (error) throw error;
      
      const newQuantity = Number(data.quantity) + quantity;
      
      const { error: updateError } = await supabase
        .from('semi_finished_products')
        .update({ quantity: newQuantity })
        .eq('id', numericId);
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error(`Error adding quantity to semi-finished product ${id}:`, error);
      return false;
    }
  }

  /**
   * Remove quantity from semi-finished product inventory
   */
  async removeSemiFinishedFromInventory(id: string | number, quantity: number): Promise<boolean> {
    try {
      const numericId = typeof id === 'string' ? parseInt(id) : id;
      
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('id', numericId)
        .single();
      
      if (error) throw error;
      
      const currentQuantity = Number(data.quantity);
      if (currentQuantity < quantity) {
        toast.error('الكمية المطلوبة أكبر من الكمية المتاحة');
        return false;
      }
      
      const newQuantity = currentQuantity - quantity;
      
      const { error: updateError } = await supabase
        .from('semi_finished_products')
        .update({ quantity: newQuantity })
        .eq('id', numericId);
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error(`Error removing quantity from semi-finished product ${id}:`, error);
      return false;
    }
  }

  /**
   * Remove quantity from finished product inventory
   */
  async removeFinishedFromInventory(id: string | number, quantity: number): Promise<boolean> {
    try {
      const numericId = typeof id === 'string' ? parseInt(id) : id;
      
      const { data, error } = await supabase
        .from('finished_products')
        .select('quantity')
        .eq('id', numericId)
        .single();
      
      if (error) throw error;
      
      const currentQuantity = Number(data.quantity);
      if (currentQuantity < quantity) {
        toast.error('الكمية المطلوبة أكبر من الكمية المتاحة');
        return false;
      }
      
      const newQuantity = currentQuantity - quantity;
      
      const { error: updateError } = await supabase
        .from('finished_products')
        .update({ quantity: newQuantity })
        .eq('id', numericId);
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error(`Error removing quantity from finished product ${id}:`, error);
      return false;
    }
  }

  /**
   * Check if there's enough semi-finished product available
   */
  async checkSemiFinishedAvailability(id: string | number, requiredQuantity: number): Promise<boolean> {
    try {
      const numericId = typeof id === 'string' ? parseInt(id) : id;
      
      const { data, error } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('id', numericId)
        .single();
      
      if (error) throw error;
      
      return Number(data.quantity) >= requiredQuantity;
    } catch (error) {
      console.error(`Error checking availability for semi-finished product ${id}:`, error);
      return false;
    }
  }

  /**
   * Check if there's enough packaging material available
   */
  async checkPackagingAvailability(id: string | number, requiredQuantity: number): Promise<boolean> {
    try {
      const numericId = typeof id === 'string' ? parseInt(id) : id;
      
      const { data, error } = await supabase
        .from('packaging_materials')
        .select('quantity')
        .eq('id', numericId)
        .single();
      
      if (error) throw error;
      
      return Number(data.quantity) >= requiredQuantity;
    } catch (error) {
      console.error(`Error checking availability for packaging material ${id}:`, error);
      return false;
    }
  }

  /**
   * Consume raw materials for production
   */
  async consumeRawMaterials(materials: {id: number, quantity: number}[]): Promise<boolean> {
    try {
      for (const material of materials) {
        const { data, error } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('id', material.id)
          .single();
        
        if (error) throw error;
        
        const currentQuantity = Number(data.quantity);
        if (currentQuantity < material.quantity) {
          toast.error(`المادة الخام غير متوفرة بالكمية المطلوبة`);
          return false;
        }
        
        const { error: updateError } = await supabase
          .from('raw_materials')
          .update({ quantity: currentQuantity - material.quantity })
          .eq('id', material.id);
        
        if (updateError) throw updateError;
      }
      
      return true;
    } catch (error) {
      console.error('Error consuming raw materials:', error);
      return false;
    }
  }

  /**
   * Return raw materials to inventory
   */
  async returnRawMaterials(materials: {id: number, quantity: number}[]): Promise<boolean> {
    try {
      for (const material of materials) {
        const { data, error } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('id', material.id)
          .single();
        
        if (error) throw error;
        
        const currentQuantity = Number(data.quantity);
        
        const { error: updateError } = await supabase
          .from('raw_materials')
          .update({ quantity: currentQuantity + material.quantity })
          .eq('id', material.id);
        
        if (updateError) throw updateError;
      }
      
      return true;
    } catch (error) {
      console.error('Error returning raw materials:', error);
      return false;
    }
  }

  /**
   * Return packaging materials to inventory
   */
  async returnPackagingMaterials(materials: {id: number, quantity: number}[]): Promise<boolean> {
    try {
      for (const material of materials) {
        const { data, error } = await supabase
          .from('packaging_materials')
          .select('quantity')
          .eq('id', material.id)
          .single();
        
        if (error) throw error;
        
        const currentQuantity = Number(data.quantity);
        
        const { error: updateError } = await supabase
          .from('packaging_materials')
          .update({ quantity: currentQuantity + material.quantity })
          .eq('id', material.id);
        
        if (updateError) throw updateError;
      }
      
      return true;
    } catch (error) {
      console.error('Error returning packaging materials:', error);
      return false;
    }
  }

  /**
   * Produce finished product
   */
  async produceFinishedProduct(productId: number, quantity: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('finished_products')
        .select('quantity')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      
      const currentQuantity = Number(data.quantity);
      
      const { error: updateError } = await supabase
        .from('finished_products')
        .update({ quantity: currentQuantity + quantity })
        .eq('id', productId);
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error(`Error producing finished product ${productId}:`, error);
      return false;
    }
  }

  /**
   * Update raw materials importance
   */
  async updateRawMaterialsImportance(): Promise<void> {
    try {
      const { data: rawMaterials, error } = await supabase
        .from('raw_materials')
        .select('*');
      
      if (error) throw error;
      
      for (const material of rawMaterials) {
        // Calculate importance based on usage, min_stock, etc.
        const importance = this.calculateImportance(material);
        
        await supabase
          .from('raw_materials')
          .update({ importance })
          .eq('id', material.id);
      }
    } catch (error) {
      console.error('Error updating raw materials importance:', error);
    }
  }

  /**
   * Calculate importance of a material
   */
  private calculateImportance(material: any): number {
    // Example algorithm: if stock is below min_stock, high importance
    if (material.quantity <= material.min_stock) {
      return 5; // High importance
    } else if (material.quantity <= material.min_stock * 1.5) {
      return 3; // Medium importance
    } else {
      return 1; // Low importance
    }
  }
}

export default InventoryService;
export { RawMaterial, PackagingMaterial, SemiFinishedProduct, FinishedProduct };
