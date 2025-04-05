
-- إحصائيات الإنتاج

-- دالة لجلب إحصائيات الإنتاج
CREATE OR REPLACE FUNCTION get_production_stats()
RETURNS TABLE (
  total_production_orders BIGINT,
  completed_orders BIGINT,
  pending_orders BIGINT,
  in_progress_orders BIGINT,
  cancelled_orders BIGINT,
  total_cost NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) AS total_production_orders,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
    COUNT(*) FILTER (WHERE status = 'inProgress') AS in_progress_orders,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
    SUM(total_cost) FILTER (WHERE status = 'completed') AS total_cost
  FROM 
    production_orders;
END;
$$;

-- دالة لجلب إحصائيات الإنتاج الشهرية
CREATE OR REPLACE FUNCTION get_monthly_production_stats()
RETURNS TABLE (
  month TEXT,
  production_count BIGINT,
  packaging_count BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT to_char(date_trunc('month', dd), 'YYYY-MM') AS month
    FROM generate_series(
      date_trunc('month', CURRENT_DATE - INTERVAL '5 months'),
      date_trunc('month', CURRENT_DATE),
      '1 month'::interval
    ) dd
  ),
  prod_data AS (
    SELECT to_char(date_trunc('month', date::timestamp), 'YYYY-MM') AS month, 
           COUNT(*) AS count
    FROM production_orders
    WHERE date >= (CURRENT_DATE - INTERVAL '6 months')
    GROUP BY 1
  ),
  pkg_data AS (
    SELECT to_char(date_trunc('month', date::timestamp), 'YYYY-MM') AS month, 
           COUNT(*) AS count
    FROM packaging_orders
    WHERE date >= (CURRENT_DATE - INTERVAL '6 months')
    GROUP BY 1
  )
  SELECT 
    m.month,
    COALESCE(pd.count, 0) AS production_count,
    COALESCE(pk.count, 0) AS packaging_count
  FROM months m
  LEFT JOIN prod_data pd ON m.month = pd.month
  LEFT JOIN pkg_data pk ON m.month = pk.month
  ORDER BY m.month;
END;
$$;
