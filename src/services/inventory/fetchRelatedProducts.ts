// Utility for fetching related products for a raw material
import { supabase } from '@/integrations/supabase/client';

interface SemiIngredient {
  semi_finished_id: number;
  percentage: number;
  raw_material?: {
    id: number;
    code: string;
    name: string;
  };
}

/**
 * Fetch products (semi-finished and finished) that use a given raw material code.
 * Returns an object: { semiFinished: [...], finished: [...] }
 */
export async function fetchRelatedProductsByRawMaterialCode(rawMaterialCode: string) {
  // 1. Get semi-finished products where this raw material is an ingredient
  const { data: semiIngredients, error: semiError } = await supabase
    .from('semi_finished_ingredients')
    .select(
      `semi_finished_id, percentage, raw_material:raw_material_id(id,code,name)`
    );

  // Filter by code in JS in case the DB only links by id
  const filteredIngredients = (semiIngredients || []).filter(
    (i: SemiIngredient) => i.raw_material?.code === rawMaterialCode
  );

  let semiFinishedProducts = [];
  if (filteredIngredients.length > 0) {
    const semiIds = filteredIngredients.map(i => i.semi_finished_id);
    const { data: semiProducts } = await supabase
      .from('semi_finished_products')
      .select('id, code, name, unit')
      .in('id', semiIds);
    semiFinishedProducts = semiProducts?.map(product => {
      const ingredient = filteredIngredients.find(i => i.semi_finished_id === product.id);
      return {
        ...product,
        percentage: ingredient?.percentage
      };
    }) || [];
  }

  // 2. Get finished products that use semi-finished products (optional, for extended relation)
  const { data: finishedProducts } = await supabase
    .from('finished_products')
    .select('id, code, name, unit, semi_finished_id');

  // Find finished products whose semi_finished_id is in semiFinishedProducts
  const relatedFinished = (finishedProducts || []).filter(fp =>
    semiFinishedProducts.some(sf => sf.id === fp.semi_finished_id)
  );

  return {
    semiFinished: semiFinishedProducts,
    finished: relatedFinished
  };
}
