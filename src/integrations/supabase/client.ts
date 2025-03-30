
import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are properly loaded or provide default values for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// RPC functions - these are placeholders for the database functions
export const rpcFunctions = {
  getInventoryMovementsByItem: async (itemId: string, itemType: string) => {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select(`
        *,
        users (name)
      `)
      .eq('item_id', itemId)
      .eq('item_type', itemType)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },
  
  // Add missing RPC functions
  getProductionStats: async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_production_stats');
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error getting production stats:", error);
      return { data: null, error };
    }
  },
  
  getMonthlyProductionStats: async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_monthly_production_stats');
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error getting monthly production stats:", error);
      return { data: null, error };
    }
  }
};

// Low stock queries - these are placeholders for the database functions
export const lowStockQueries = {
  // Function to fetch all low stock items
  getAllLowStockItems: async () => {
    try {
      // For now, we'll just use a simple query to get all items with quantity < min_stock
      // In a real implementation, this would use the database function
      const { data, error } = await supabase
        .rpc('get_all_low_stock_items');
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      console.error("Error getting low stock items:", error);
      return { data: [], error };
    }
  },
  // Fallback individual queries
  rawMaterials: async () => {
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*')
      .lt('quantity', 'min_stock')
      .gt('min_stock', 0);
    
    return { data, error };
  },
  semiFinishedProducts: async () => {
    const { data, error } = await supabase
      .from('semi_finished_products')
      .select('*')
      .lt('quantity', 'min_stock')
      .gt('min_stock', 0);
    
    return { data, error };
  },
  packagingMaterials: async () => {
    const { data, error } = await supabase
      .from('packaging_materials')
      .select('*')
      .lt('quantity', 'min_stock')
      .gt('min_stock', 0);
    
    return { data, error };
  },
  finishedProducts: async () => {
    const { data, error } = await supabase
      .from('finished_products')
      .select('*')
      .lt('quantity', 'min_stock')
      .gt('min_stock', 0);
    
    return { data, error };
  }
};
