
CREATE OR REPLACE FUNCTION public.get_movements_by_type(
  p_item_type TEXT
)
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
      u.name as user_name
    FROM 
      inventory_movements im
    LEFT JOIN 
      users u ON im.user_id = u.id
    WHERE 
      im.item_type = p_item_type
    ORDER BY 
      im.created_at DESC
  )
  SELECT row_to_json(movements) FROM movements;
END;
$$ LANGUAGE plpgsql;
