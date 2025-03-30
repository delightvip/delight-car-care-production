-- Function to get inventory summary statistics
CREATE OR REPLACE FUNCTION get_inventory_summary_stats(
  p_item_id TEXT,
  p_item_type TEXT
)
RETURNS TABLE (
  total_movements INT,
  total_in NUMERIC,
  total_out NUMERIC,
  adjustments NUMERIC,
  current_quantity NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_quantity NUMERIC;
BEGIN
  -- Get current quantity from the appropriate table
  CASE p_item_type
    WHEN 'raw' THEN
      SELECT quantity INTO v_current_quantity 
      FROM raw_materials 
      WHERE id = p_item_id::integer;
    WHEN 'semi' THEN
      SELECT quantity INTO v_current_quantity 
      FROM semi_finished_products 
      WHERE id = p_item_id::integer;
    WHEN 'packaging' THEN
      SELECT quantity INTO v_current_quantity 
      FROM packaging_materials 
      WHERE id = p_item_id::integer;
    WHEN 'finished' THEN
      SELECT quantity INTO v_current_quantity 
      FROM finished_products 
      WHERE id = p_item_id::integer;
    ELSE
      v_current_quantity := 0;
  END CASE;

  RETURN QUERY
  SELECT 
    COUNT(*)::INT AS total_movements,
    SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END) AS total_in,
    SUM(CASE WHEN quantity < 0 THEN ABS(quantity) ELSE 0 END) AS total_out,
    SUM(CASE WHEN reason = 'adjustment' THEN ABS(quantity) ELSE 0 END) AS adjustments,
    COALESCE(v_current_quantity, 0) AS current_quantity
  FROM inventory_movements
  WHERE item_id = p_item_id
  AND item_type = p_item_type;
END;
$$;

-- Function to get inventory movements by time period
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
  -- Set date format based on period
  CASE p_period
    WHEN 'day' THEN date_format := 'YYYY-MM-DD';
    WHEN 'week' THEN date_format := 'YYYY-MM-DD';
    WHEN 'month' THEN date_format := 'YYYY-MM';
    WHEN 'year' THEN date_format := 'YYYY';
    ELSE date_format := 'YYYY-MM-DD';
  END CASE;

  -- Default start date if NULL
  IF p_start_date IS NULL THEN
    p_start_date := CURRENT_TIMESTAMP - INTERVAL '6 months';
  END IF;

  RETURN QUERY
  WITH movements AS (
    SELECT 
      TO_CHAR(created_at, date_format) AS time_period,
      CASE WHEN quantity > 0 THEN quantity ELSE 0 END AS in_qty,
      CASE WHEN quantity < 0 THEN ABS(quantity) ELSE 0 END AS out_qty
    FROM inventory_movements
    WHERE item_id = p_item_id
    AND item_type = p_item_type
    AND created_at BETWEEN p_start_date AND p_end_date
  ),
  aggregated AS (
    SELECT 
      time_period,
      SUM(in_qty) AS in_qty_sum,
      SUM(out_qty) AS out_qty_sum
    FROM movements
    GROUP BY time_period
    ORDER BY time_period
  ),
  running_balance AS (
    SELECT
      time_period AS period,
      in_qty_sum AS in_quantity,
      out_qty_sum AS out_quantity,
      SUM(in_qty_sum - out_qty_sum) OVER (ORDER BY time_period) AS balance
    FROM aggregated
  )
  SELECT * FROM running_balance;
END;
$$;

-- Function to get inventory usage statistics
CREATE OR REPLACE FUNCTION get_inventory_usage_stats(
  p_item_id TEXT,
  p_item_type TEXT,
  p_period TEXT DEFAULT 'month',
  p_limit INT DEFAULT 6
)
RETURNS TABLE (
  category TEXT,
  usage_amount NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(reason, 'Other') AS category,
    SUM(ABS(quantity)) AS usage_amount
  FROM inventory_movements
  WHERE item_id = p_item_id
  AND item_type = p_item_type
  AND quantity < 0 -- Only outgoing movements
  AND created_at > CURRENT_TIMESTAMP - CASE p_period
      WHEN 'week' THEN INTERVAL '7 days'
      WHEN 'month' THEN INTERVAL '30 days'
      WHEN 'quarter' THEN INTERVAL '3 months'
      WHEN 'year' THEN INTERVAL '12 months'
      ELSE INTERVAL '30 days'
    END
  GROUP BY reason
  ORDER BY usage_amount DESC
  LIMIT p_limit;
END;
$$;
