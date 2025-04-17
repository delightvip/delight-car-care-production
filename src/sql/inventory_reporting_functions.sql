
-- وظيفة للحصول على حركات المخزون حسب الفترة الزمنية
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
    WHEN 'quarter' THEN date_format := 'YYYY-"Q"Q';
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
      CASE WHEN movement_type = 'in' OR quantity > 0 THEN COALESCE(quantity, 0) ELSE 0 END AS in_qty,
      CASE WHEN movement_type = 'out' OR quantity < 0 THEN COALESCE(ABS(quantity), 0) ELSE 0 END AS out_qty
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

-- وظيفة للحصول على حركات عنصر محدد
CREATE OR REPLACE FUNCTION get_inventory_movements_by_item(
  p_item_id TEXT,
  p_item_type TEXT
)
RETURNS TABLE (
  id UUID,
  item_id TEXT,
  item_type TEXT,
  movement_type TEXT,
  quantity NUMERIC,
  balance_after NUMERIC,
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
    im.item_id = p_item_id AND im.item_type = p_item_type
  ORDER BY
    im.created_at DESC;
END;
$$;

-- وظيفة للحصول على توزيع أسباب حركات المخزون
CREATE OR REPLACE FUNCTION get_inventory_usage_distribution(
  p_item_id TEXT,
  p_item_type TEXT,
  p_period TEXT DEFAULT 'month',
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
)
RETURNS TABLE (
  reason TEXT,
  quantity NUMERIC,
  percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_usage NUMERIC;
BEGIN
  -- تاريخ البدء الافتراضي
  IF p_start_date IS NULL THEN
    p_start_date := CURRENT_TIMESTAMP - CASE p_period
      WHEN 'week' THEN INTERVAL '7 days'
      WHEN 'month' THEN INTERVAL '30 days'
      WHEN 'quarter' THEN INTERVAL '90 days'
      WHEN 'year' THEN INTERVAL '365 days'
      ELSE INTERVAL '30 days'
    END;
  END IF;

  -- حساب إجمالي الاستهلاك للفترة المحددة
  SELECT SUM(ABS(quantity)) INTO total_usage
  FROM inventory_movements
  WHERE item_id = p_item_id
    AND item_type = p_item_type
    AND (movement_type = 'out' OR quantity < 0)
    AND created_at BETWEEN p_start_date AND p_end_date;

  -- إذا لم يكن هناك استهلاك، نعيد مجموعة فارغة
  IF total_usage IS NULL OR total_usage = 0 THEN
    RETURN;
  END IF;

  -- إرجاع توزيع الاستهلاك حسب السبب
  RETURN QUERY
  SELECT
    COALESCE(im.reason, 'أخرى') AS reason,
    SUM(ABS(im.quantity)) AS quantity,
    ROUND((SUM(ABS(im.quantity)) / total_usage * 100), 2) AS percentage
  FROM
    inventory_movements im
  WHERE
    im.item_id = p_item_id
    AND im.item_type = p_item_type
    AND (im.movement_type = 'out' OR im.quantity < 0)
    AND im.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY
    im.reason
  ORDER BY
    quantity DESC;
END;
$$;

-- وظيفة للحصول على ملخص إحصائيات المخزون
CREATE OR REPLACE FUNCTION get_inventory_summary_stats(
  p_item_id TEXT,
  p_item_type TEXT
)
RETURNS TABLE (
  total_movements INTEGER,
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
  -- الحصول على الكمية الحالية من الجدول المناسب
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
    COUNT(*)::INTEGER AS total_movements,
    SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END) AS total_in,
    SUM(CASE WHEN quantity < 0 THEN ABS(quantity) ELSE 0 END) AS total_out,
    SUM(CASE WHEN reason = 'adjustment' OR reason = 'تعديل' THEN ABS(quantity) ELSE 0 END) AS adjustments,
    COALESCE(v_current_quantity, 0) AS current_quantity
  FROM inventory_movements
  WHERE item_id = p_item_id
  AND item_type = p_item_type;
END;
$$;

-- وظيفة للحصول على الأصناف الأكثر حركة في المخزون
CREATE OR REPLACE FUNCTION get_most_active_inventory_items(
  p_limit INTEGER DEFAULT 10,
  p_period TEXT DEFAULT 'month',
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
)
RETURNS TABLE (
  item_id TEXT,
  item_type TEXT,
  item_name TEXT,
  total_movements INTEGER,
  total_in NUMERIC,
  total_out NUMERIC,
  current_quantity NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- تاريخ البدء الافتراضي
  IF p_start_date IS NULL THEN
    p_start_date := CURRENT_TIMESTAMP - CASE p_period
      WHEN 'week' THEN INTERVAL '7 days'
      WHEN 'month' THEN INTERVAL '30 days'
      WHEN 'quarter' THEN INTERVAL '90 days'
      WHEN 'year' THEN INTERVAL '365 days'
      ELSE INTERVAL '30 days'
    END;
  END IF;

  RETURN QUERY
  WITH movement_counts AS (
    SELECT 
      item_id,
      item_type,
      COUNT(*) AS movement_count,
      SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END) AS total_in,
      SUM(CASE WHEN quantity < 0 THEN ABS(quantity) ELSE 0 END) AS total_out
    FROM 
      inventory_movements
    WHERE
      created_at BETWEEN p_start_date AND p_end_date
    GROUP BY 
      item_id, item_type
    ORDER BY 
      movement_count DESC
    LIMIT p_limit
  ),
  raw_materials_data AS (
    SELECT 
      mc.item_id,
      mc.item_type,
      rm.name AS item_name,
      mc.movement_count,
      mc.total_in,
      mc.total_out,
      rm.quantity AS current_quantity
    FROM 
      movement_counts mc
    JOIN 
      raw_materials rm ON mc.item_id = rm.id::TEXT
    WHERE 
      mc.item_type = 'raw'
  ),
  packaging_materials_data AS (
    SELECT 
      mc.item_id,
      mc.item_type,
      pm.name AS item_name,
      mc.movement_count,
      mc.total_in,
      mc.total_out,
      pm.quantity AS current_quantity
    FROM 
      movement_counts mc
    JOIN 
      packaging_materials pm ON mc.item_id = pm.id::TEXT
    WHERE 
      mc.item_type = 'packaging'
  ),
  semi_finished_data AS (
    SELECT 
      mc.item_id,
      mc.item_type,
      sfp.name AS item_name,
      mc.movement_count,
      mc.total_in,
      mc.total_out,
      sfp.quantity AS current_quantity
    FROM 
      movement_counts mc
    JOIN 
      semi_finished_products sfp ON mc.item_id = sfp.id::TEXT
    WHERE 
      mc.item_type = 'semi'
  ),
  finished_products_data AS (
    SELECT 
      mc.item_id,
      mc.item_type,
      fp.name AS item_name,
      mc.movement_count,
      mc.total_in,
      mc.total_out,
      fp.quantity AS current_quantity
    FROM 
      movement_counts mc
    JOIN 
      finished_products fp ON mc.item_id = fp.id::TEXT
    WHERE 
      mc.item_type = 'finished'
  )
  SELECT * FROM raw_materials_data
  UNION ALL
  SELECT * FROM packaging_materials_data
  UNION ALL
  SELECT * FROM semi_finished_data
  UNION ALL
  SELECT * FROM finished_products_data
  ORDER BY movement_count DESC
  LIMIT p_limit;
END;
$$;

-- وظيفة للحصول على تحليل تقلبات المخزون (نسبة التغيير)
CREATE OR REPLACE FUNCTION get_inventory_volatility(
  p_item_id TEXT,
  p_item_type TEXT,
  p_period TEXT DEFAULT 'month',
  p_periods_count INTEGER DEFAULT 6
)
RETURNS TABLE (
  period TEXT,
  start_balance NUMERIC,
  end_balance NUMERIC,
  change_amount NUMERIC,
  change_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  date_format TEXT;
  interval_type TEXT;
  end_date TIMESTAMPTZ := CURRENT_TIMESTAMP;
  start_date TIMESTAMPTZ;
BEGIN
  -- تحديد شكل التاريخ ونوع الفترة الزمنية
  CASE p_period
    WHEN 'day' THEN 
      date_format := 'YYYY-MM-DD';
      interval_type := 'days';
    WHEN 'week' THEN 
      date_format := 'YYYY-WW';
      interval_type := 'weeks';
    WHEN 'month' THEN 
      date_format := 'YYYY-MM';
      interval_type := 'months';
    WHEN 'quarter' THEN 
      date_format := 'YYYY-"Q"Q';
      interval_type := 'months';
      p_periods_count := p_periods_count * 3;
    WHEN 'year' THEN 
      date_format := 'YYYY';
      interval_type := 'years';
    ELSE 
      date_format := 'YYYY-MM';
      interval_type := 'months';
  END CASE;

  -- تحديد تاريخ البدء بناءً على عدد الفترات المطلوبة
  IF p_period = 'quarter' THEN
    start_date := end_date - (p_periods_count || ' months')::INTERVAL;
  ELSE
    start_date := end_date - (p_periods_count || ' ' || interval_type)::INTERVAL;
  END IF;

  RETURN QUERY
  WITH periods AS (
    SELECT
      TO_CHAR(date_trunc(CASE p_period
        WHEN 'day' THEN 'day'
        WHEN 'week' THEN 'week'
        WHEN 'month' THEN 'month'
        WHEN 'quarter' THEN 'quarter'
        WHEN 'year' THEN 'year'
        ELSE 'month'
      END, (generate_series(start_date, end_date, (1 || ' ' || CASE WHEN p_period = 'quarter' THEN 'month' ELSE interval_type END)::INTERVAL))), date_format) AS period_name,
      date_trunc(CASE p_period
        WHEN 'day' THEN 'day'
        WHEN 'week' THEN 'week'
        WHEN 'month' THEN 'month'
        WHEN 'quarter' THEN 'quarter'
        WHEN 'year' THEN 'year'
        ELSE 'month'
      END, generate_series(start_date, end_date, (1 || ' ' || CASE WHEN p_period = 'quarter' THEN 'month' ELSE interval_type END)::INTERVAL)) AS period_start,
      date_trunc(CASE p_period
        WHEN 'day' THEN 'day'
        WHEN 'week' THEN 'week'
        WHEN 'month' THEN 'month'
        WHEN 'quarter' THEN 'quarter'
        WHEN 'year' THEN 'year'
        ELSE 'month'
      END, generate_series(start_date, end_date, (1 || ' ' || CASE WHEN p_period = 'quarter' THEN 'month' ELSE interval_type END)::INTERVAL) + (1 || ' ' || CASE WHEN p_period = 'quarter' THEN 'month' ELSE interval_type END)::INTERVAL) - INTERVAL '1 millisecond' AS period_end
  ),
  period_balances AS (
    SELECT
      p.period_name,
      p.period_start,
      p.period_end,
      -- الرصيد في بداية الفترة
      COALESCE((
        SELECT balance_after
        FROM inventory_movements
        WHERE item_id = p_item_id AND item_type = p_item_type AND created_at < p.period_start
        ORDER BY created_at DESC
        LIMIT 1
      ), 0) AS start_balance,
      -- الرصيد في نهاية الفترة
      COALESCE((
        SELECT balance_after
        FROM inventory_movements
        WHERE item_id = p_item_id AND item_type = p_item_type AND created_at <= p.period_end
        ORDER BY created_at DESC
        LIMIT 1
      ), 0) AS end_balance
    FROM
      periods p
    WHERE
      p_period = 'quarter' AND EXTRACT(MONTH FROM p.period_start) IN (1, 4, 7, 10)
      OR p_period != 'quarter'
    ORDER BY
      p.period_start
  ),
  filtered_periods AS (
    SELECT
      period_name,
      start_balance,
      end_balance,
      end_balance - start_balance AS change_amount,
      CASE
        WHEN start_balance = 0 THEN
          CASE WHEN end_balance = 0 THEN 0 ELSE 100 END
        ELSE
          ROUND(((end_balance - start_balance) / ABS(start_balance)) * 100, 2)
      END AS change_percentage
    FROM
      period_balances
    ORDER BY
      period_start DESC
    LIMIT
      p_periods_count
  )
  SELECT 
    period_name AS period,
    start_balance,
    end_balance,
    change_amount,
    change_percentage
  FROM filtered_periods
  ORDER BY period;
END;
$$;
