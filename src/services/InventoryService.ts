import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

class InventoryService {
  private static instance: InventoryService;

  private constructor() {}

  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  public async getRawMaterials() {
    try {
      let { data: raw_materials, error } = await supabase
        .from("raw_materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return raw_materials;
    } catch (error) {
      console.error("Error fetching raw materials:", error);
      toast.error("حدث خطأ أثناء جلب المواد الخام");
      return [];
    }
  }

  public async getPackagingMaterials() {
    try {
      let { data: packaging_materials, error } = await supabase
        .from("packaging_materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return packaging_materials;
    } catch (error) {
      console.error("Error fetching packaging materials:", error);
      toast.error("حدث خطأ أثناء جلب مواد التعبئة والتغليف");
      return [];
    }
  }

  public async getSemiFinishedProducts() {
    try {
      let { data: semi_finished_products, error } = await supabase
        .from("semi_finished_products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return semi_finished_products;
    } catch (error) {
      console.error("Error fetching semi-finished products:", error);
      toast.error("حدث خطأ أثناء جلب المنتجات نصف المصنعة");
      return [];
    }
  }

  public async getFinishedProducts() {
    try {
      let { data: finished_products, error } = await supabase
        .from("finished_products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return finished_products;
    } catch (error) {
      console.error("Error fetching finished products:", error);
      toast.error("حدث خطأ أثناء جلب المنتجات التامة الصنع");
      return [];
    }
  }

  public async createRawMaterial(values: any) {
    try {
      const { data, error } = await supabase
        .from("raw_materials")
        .insert([values])
        .select();

      if (error) throw error;
      toast.success("تمت إضافة المادة الخام بنجاح");
      return data;
    } catch (error) {
      console.error("Error creating raw material:", error);
      toast.error("حدث خطأ أثناء إضافة المادة الخام");
      return null;
    }
  }

  public async createPackagingMaterial(values: any) {
    try {
      const { data, error } = await supabase
        .from("packaging_materials")
        .insert([values])
        .select();

      if (error) throw error;
      toast.success("تمت إضافة مادة التعبئة والتغليف بنجاح");
      return data;
    } catch (error) {
      console.error("Error creating packaging material:", error);
      toast.error("حدث خطأ أثناء إضافة مادة التعبئة والتغليف");
      return null;
    }
  }

  public async createSemiFinishedProduct(values: any) {
    try {
      const { data, error } = await supabase
        .from("semi_finished_products")
        .insert([values])
        .select();

      if (error) throw error;
      toast.success("تمت إضافة المنتج نصف المصنع بنجاح");
      return data;
    } catch (error) {
      console.error("Error creating semi-finished product:", error);
      toast.error("حدث خطأ أثناء إضافة المنتج نصف المصنع");
      return null;
    }
  }

  public async createFinishedProduct(values: any) {
    try {
      const { data, error } = await supabase
        .from("finished_products")
        .insert([values])
        .select();

      if (error) throw error;
      toast.success("تمت إضافة المنتج التام الصنع بنجاح");
      return data;
    } catch (error) {
      console.error("Error creating finished product:", error);
      toast.error("حدث خطأ أثناء إضافة المنتج التام الصنع");
      return null;
    }
  }

  public async updateRawMaterial(id: number, values: any) {
    try {
      const { data, error } = await supabase
        .from("raw_materials")
        .update(values)
        .eq("id", id)
        .select();

      if (error) throw error;
      toast.success("تم تحديث المادة الخام بنجاح");
      return true;
    } catch (error) {
      console.error(`Error updating raw material with id ${id}:`, error);
      toast.error("حدث خطأ أثناء تحديث المادة الخام");
      return false;
    }
  }

  public async updatePackagingMaterial(id: number, values: any) {
    try {
      const { data, error } = await supabase
        .from("packaging_materials")
        .update(values)
        .eq("id", id)
        .select();

      if (error) throw error;
      toast.success("تم تحديث مادة التعبئة والتغليف بنجاح");
      return true;
    } catch (error) {
      console.error(
        `Error updating packaging material with id ${id}:`,
        error
      );
      toast.error("حدث خطأ أثناء تحديث مادة التعبئة والتغليف");
      return false;
    }
  }

  public async updateSemiFinishedProduct(id: number, values: any) {
    try {
      const { data, error } = await supabase
        .from("semi_finished_products")
        .update(values)
        .eq("id", id)
        .select();

      if (error) throw error;
      toast.success("تم تحديث المنتج نصف المصنع بنجاح");
      return true;
    } catch (error) {
      console.error(
        `Error updating semi-finished product with id ${id}:`,
        error
      );
      toast.error("حدث خطأ أثناء تحديث المنتج نصف المصنع");
      return false;
    }
  }

  public async updateFinishedProduct(id: number, values: any) {
    try {
      const { data, error } = await supabase
        .from("finished_products")
        .update(values)
        .eq("id", id)
        .select();

      if (error) throw error;
      toast.success("تم تحديث المنتج التام الصنع بنجاح");
      return true;
    } catch (error) {
      console.error(`Error updating finished product with id ${id}:`, error);
      toast.error("حدث خطأ أثناء تحديث المنتج التام الصنع");
      return false;
    }
  }

  public async deleteRawMaterial(id: number) {
    try {
      const { error } = await supabase
        .from("raw_materials")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("تم حذف المادة الخام بنجاح");
      return true;
    } catch (error) {
      console.error(`Error deleting raw material with id ${id}:`, error);
      toast.error("حدث خطأ أثناء حذف المادة الخام");
      return false;
    }
  }

  public async deletePackagingMaterial(id: number) {
    try {
      const { error } = await supabase
        .from("packaging_materials")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("تم حذف مادة التعبئة والتغليف بنجاح");
      return true;
    } catch (error) {
      console.error(
        `Error deleting packaging material with id ${id}:`,
        error
      );
      toast.error("حدث خطأ أثناء حذف مادة التعبئة والتغليف");
      return false;
    }
  }

  public async deleteSemiFinishedProduct(id: number) {
    try {
      const { error } = await supabase
        .from("semi_finished_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("تم حذف المنتج نصف المصنع بنجاح");
      return true;
    } catch (error) {
      console.error(
        `Error deleting semi-finished product with id ${id}:`,
        error
      );
      toast.error("حدث خطأ أثناء حذف المنتج نصف المصنع");
      return false;
    }
  }

  public async deleteFinishedProduct(id: number) {
    try {
      const { error } = await supabase
        .from("finished_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("تم حذف المنتج التام الصنع بنجاح");
      return true;
    } catch (error) {
      console.error(`Error deleting finished product with id ${id}:`, error);
      toast.error("حدث خطأ أثناء حذف المنتج التام الصنع");
      return false;
    }
  }

  /**
   * Update inventory level for any item type
   */
  public async updateInventoryLevel(
    itemId: number,
    itemType: string,
    quantity: number
  ): Promise<boolean> {
    try {
      let table;
      switch (itemType) {
        case "raw_materials":
          return await this.updateRawMaterial(itemId, { quantity });
        case "packaging_materials":
          return await this.updatePackagingMaterial(itemId, { quantity });
        case "semi_finished_products":
          return await this.updateSemiFinishedProduct(itemId, { quantity });
        case "finished_products":
          return await this.updateFinishedProduct(itemId, { quantity });
        default:
          console.error(`Invalid item type: ${itemType}`);
          return false;
      }
    } catch (error) {
      console.error(
        `Error updating inventory level for ${itemType} with id ${itemId}:`,
        error
      );
      return false;
    }
  }
}

export default InventoryService.getInstance();
