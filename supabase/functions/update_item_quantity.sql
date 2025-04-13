
CREATE OR REPLACE FUNCTION public.update_item_quantity(
  p_item_id TEXT,
  p_item_type TEXT,
  p_new_quantity NUMERIC
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_item_type = 'raw' THEN
    UPDATE raw_materials SET quantity = p_new_quantity WHERE id = p_item_id::integer;
  ELSIF p_item_type = 'packaging' THEN
    UPDATE packaging_materials SET quantity = p_new_quantity WHERE id = p_item_id::integer;
  ELSIF p_item_type = 'semi' THEN
    UPDATE semi_finished_products SET quantity = p_new_quantity WHERE id = p_item_id::integer;
  ELSIF p_item_type = 'finished' THEN
    UPDATE finished_products SET quantity = p_new_quantity WHERE id = p_item_id::integer;
  ELSE
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
