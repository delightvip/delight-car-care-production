
CREATE OR REPLACE FUNCTION public.get_all_inventory_movements()
RETURNS SETOF json AS $$
BEGIN
  RETURN QUERY 
  WITH movements AS (
    SELECT 
      im.id,
      im.item_id,
      im.item_type,
      im.movement_type,
      im.quantity,
      im.balance_after,
      im.reason,
      im.created_at,
      u.name as user_name,
      CASE 
        WHEN im.item_type = 'raw' THEN rm.name
        WHEN im.item_type = 'packaging' THEN pm.name
        WHEN im.item_type = 'semi' THEN sfp.name
        WHEN im.item_type = 'finished' THEN fp.name
        ELSE im.item_id
      END as item_name
    FROM 
      inventory_movements im
    LEFT JOIN 
      users u ON im.user_id = u.id
    LEFT JOIN 
      raw_materials rm ON im.item_type = 'raw' AND im.item_id = rm.id::text
    LEFT JOIN 
      packaging_materials pm ON im.item_type = 'packaging' AND im.item_id = pm.id::text
    LEFT JOIN 
      semi_finished_products sfp ON im.item_type = 'semi' AND im.item_id = sfp.id::text
    LEFT JOIN 
      finished_products fp ON im.item_type = 'finished' AND im.item_id = fp.id::text
    ORDER BY 
      im.created_at DESC
  )
  SELECT row_to_json(movements) FROM movements;
END;
$$ LANGUAGE plpgsql;
