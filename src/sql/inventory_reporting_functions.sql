
-- Function to get inventory movements grouped by time periods
CREATE OR REPLACE FUNCTION get_inventory_movements_by_time(
  p_item_id TEXT,
  p_item_type TEXT,
  p_timeframe TEXT DEFAULT 'month'
)
RETURNS TABLE (
  movement_date DATE,
  movement_in NUMERIC,
  movement_out NUMERIC,
  closing_balance NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH movements_with_date AS (
    SELECT 
      CASE
        WHEN p_timeframe = 'day' THEN DATE(created_at)
        WHEN p_timeframe = 'week' THEN DATE_TRUNC('week', created_at)::DATE
        ELSE DATE_TRUNC('month', created_at)::DATE
      END AS date,
      movement_type,
      quantity,
      balance_after
    FROM inventory_movements
    WHERE 
      item_id = p_item_id AND 
      item_type = p_item_type AND
      created_at >= CURRENT_DATE - INTERVAL '6 months'
  ),
  aggregated AS (
    SELECT 
      date,
      SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END) AS in_qty,
      SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END) AS out_qty,
      -- Get the last balance after for each date
      MAX(balance_after) AS closing_balance
    FROM movements_with_date
    GROUP BY date
  )
  SELECT 
    date AS movement_date,
    in_qty AS movement_in,
    out_qty AS movement_out,
    closing_balance
  FROM aggregated
  ORDER BY date;
END;
$$;

-- Function to get inventory usage statistics
CREATE OR REPLACE FUNCTION get_inventory_usage_stats(
  p_item_id TEXT,
  p_item_type TEXT,
  p_period TEXT DEFAULT 'year'
)
RETURNS TABLE (
  period_label TEXT,
  usage_amount NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_period = 'month' THEN
    -- Monthly stats for the last year
    RETURN QUERY
    WITH monthly_usage AS (
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_period,
        SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END) AS usage
      FROM inventory_movements
      WHERE 
        item_id = p_item_id AND 
        item_type = p_item_type AND
        created_at >= CURRENT_DATE - INTERVAL '1 year'
      GROUP BY month_period
      ORDER BY month_period DESC
      LIMIT 12
    )
    SELECT
      month_period AS period_label,
      usage AS usage_amount
    FROM monthly_usage
    ORDER BY month_period;
    
  ELSIF p_period = 'quarter' THEN
    -- Quarterly stats
    RETURN QUERY
    WITH quarterly_usage AS (
      SELECT
        TO_CHAR(DATE_TRUNC('quarter', created_at), 'YYYY-"Q"Q') AS quarter_period,
        SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END) AS usage
      FROM inventory_movements
      WHERE 
        item_id = p_item_id AND 
        item_type = p_item_type AND
        created_at >= CURRENT_DATE - INTERVAL '2 years'
      GROUP BY quarter_period
      ORDER BY quarter_period DESC
      LIMIT 8
    )
    SELECT
      quarter_period AS period_label,
      usage AS usage_amount
    FROM quarterly_usage
    ORDER BY quarter_period;
    
  ELSE
    -- Yearly stats
    RETURN QUERY
    WITH yearly_usage AS (
      SELECT
        TO_CHAR(DATE_TRUNC('year', created_at), 'YYYY') AS year_period,
        SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END) AS usage
      FROM inventory_movements
      WHERE 
        item_id = p_item_id AND 
        item_type = p_item_type
      GROUP BY year_period
      ORDER BY year_period DESC
      LIMIT 5
    )
    SELECT
      year_period AS period_label,
      usage AS usage_amount
    FROM yearly_usage
    ORDER BY year_period;
  END IF;
END;
$$;

-- Function to get inventory summary statistics
CREATE OR REPLACE FUNCTION get_inventory_summary_stats(
  p_item_id TEXT,
  p_item_type TEXT
)
RETURNS TABLE (
  total_movements INTEGER,
  total_in NUMERIC,
  total_out NUMERIC,
  adjustments INTEGER,
  current_quantity NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_quantity NUMERIC := 0;
BEGIN
  -- Get current quantity from the appropriate table
  IF p_item_type = 'raw_materials' THEN
    SELECT quantity INTO v_current_quantity FROM raw_materials WHERE id::TEXT = p_item_id;
  ELSIF p_item_type = 'packaging_materials' THEN
    SELECT quantity INTO v_current_quantity FROM packaging_materials WHERE id::TEXT = p_item_id;
  ELSIF p_item_type = 'semi_finished_products' THEN
    SELECT quantity INTO v_current_quantity FROM semi_finished_products WHERE id::TEXT = p_item_id;
  ELSIF p_item_type = 'finished_products' THEN
    SELECT quantity INTO v_current_quantity FROM finished_products WHERE id::TEXT = p_item_id;
  END IF;

  -- Return the aggregated statistics
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_movements,
    SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END) AS total_in,
    SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END) AS total_out,
    COUNT(CASE WHEN movement_type = 'adjustment' THEN 1 END)::INTEGER AS adjustments,
    v_current_quantity AS current_quantity
  FROM inventory_movements
  WHERE item_id = p_item_id AND item_type = p_item_type;
END;
$$;
