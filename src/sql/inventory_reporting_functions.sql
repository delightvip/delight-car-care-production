
CREATE OR REPLACE FUNCTION get_inventory_movements_by_time(
  p_item_id TEXT,
  p_item_type TEXT,
  p_period TEXT DEFAULT 'month',
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
)
RETURNS TABLE (
  period TEXT,
  in_quantity NUMERIC,
  out_quantity NUMERIC,
  balance NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
  date_format TEXT;
BEGIN
  -- تحديد شكل التاريخ بناءً على الفترة المطلوبة
  CASE p_period
    WHEN 'day' THEN date_format := 'YYYY-MM-DD';
    WHEN 'week' THEN date_format := 'YYYY-WW';
    WHEN 'month' THEN date_format := 'YYYY-MM';
    WHEN 'year' THEN date_format := 'YYYY';
    ELSE date_format := 'YYYY-MM-DD';
  END CASE;

  -- تاريخ البدء الافتراضي
  IF p_start_date IS NULL THEN
    p_start_date := CURRENT_TIMESTAMP - INTERVAL '12 months';
  END IF;

  RETURN QUERY
  WITH movements AS (
    SELECT 
      TO_CHAR(created_at, date_format) AS time_period,
      CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END AS in_qty,
      CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END AS out_qty
    FROM inventory_movements
    WHERE item_id = p_item_id
    AND item_type = p_item_type
    AND created_at BETWEEN p_start_date AND p_end_date
  ),
  aggregated AS (
    SELECT 
      time_period,
      SUM(in_qty) AS total_in,
      SUM(out_qty) AS total_out
    FROM movements
    GROUP BY time_period
    ORDER BY time_period
  ),
  running_balance AS (
    SELECT
      time_period AS period,
      total_in,
      total_out,
      SUM(total_in - total_out) OVER (ORDER BY time_period) AS balance
    FROM aggregated
  )
  SELECT 
    rb.period,
    rb.total_in AS in_quantity,
    rb.total_out AS out_quantity,
    rb.balance
  FROM running_balance rb
  ORDER BY rb.period;
END;
$$;

-- وظيفة جديدة لاسترجاع أهم الحركات في المخزون
CREATE OR REPLACE FUNCTION get_important_inventory_movements(
  p_limit INTEGER DEFAULT 10,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  item_id TEXT,
  item_type TEXT,
  item_name TEXT,
  movement_type TEXT,
  quantity NUMERIC,
  reason TEXT,
  created_at TIMESTAMPTZ,
  user_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    im.id,
    im.item_id,
    im.item_type,
    COALESCE(
      (CASE 
        WHEN im.item_type = 'raw' THEN (SELECT name FROM raw_materials WHERE id::TEXT = im.item_id)
        WHEN im.item_type = 'semi' THEN (SELECT name FROM semi_finished_products WHERE id::TEXT = im.item_id)
        WHEN im.item_type = 'packaging' THEN (SELECT name FROM packaging_materials WHERE id::TEXT = im.item_id)
        WHEN im.item_type = 'finished' THEN (SELECT name FROM finished_products WHERE id::TEXT = im.item_id)
        ELSE NULL
      END),
      im.reason
    ) AS item_name,
    im.movement_type,
    im.quantity,
    im.reason,
    im.created_at,
    u.name AS user_name
  FROM
    inventory_movements im
  LEFT JOIN
    users u ON im.user_id = u.id
  WHERE
    im.created_at >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
  ORDER BY
    im.created_at DESC
  LIMIT p_limit;
END;
$$;
