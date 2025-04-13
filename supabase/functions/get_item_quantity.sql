
CREATE OR REPLACE FUNCTION public.get_item_quantity(
  p_item_id TEXT,
  p_item_type TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_quantity NUMERIC;
BEGIN
  IF p_item_type = 'raw' THEN
    SELECT quantity INTO v_quantity FROM raw_materials WHERE id = p_item_id::integer;
  ELSIF p_item_type = 'packaging' THEN
    SELECT quantity INTO v_quantity FROM packaging_materials WHERE id = p_item_id::integer;
  ELSIF p_item_type = 'semi' THEN
    SELECT quantity INTO v_quantity FROM semi_finished_products WHERE id = p_item_id::integer;
  ELSIF p_item_type = 'finished' THEN
    SELECT quantity INTO v_quantity FROM finished_products WHERE id = p_item_id::integer;
  ELSE
    v_quantity := 0;
  END IF;
  
  RETURN COALESCE(v_quantity, 0);
END;
$$ LANGUAGE plpgsql;
