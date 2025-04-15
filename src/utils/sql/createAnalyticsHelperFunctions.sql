
-- Function to get top selling products
CREATE OR REPLACE FUNCTION get_top_selling_products(limit_count INTEGER)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  total_sold NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (ii.item_id)::INTEGER AS id,
    ii.item_name AS name,
    SUM(ii.quantity) AS total_sold
  FROM 
    invoice_items ii
  JOIN
    invoices i ON ii.invoice_id = i.id
  WHERE 
    i.invoice_type = 'sale'
    AND ii.item_type = 'finished_products'
  GROUP BY
    ii.item_id, ii.item_name
  ORDER BY
    total_sold DESC
  LIMIT limit_count;
END;
$$;

-- Function to get most profitable products
CREATE OR REPLACE FUNCTION get_most_profitable_products(limit_count INTEGER)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  profit NUMERIC,
  profit_percentage NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH invoice_profit_items AS (
    SELECT
      p.invoice_id,
      p.profit_amount,
      p.profit_percentage,
      ii.item_id::INTEGER AS id,
      ii.item_name AS name,
      ii.quantity,
      ii.item_type
    FROM
      profits p
    JOIN
      invoice_items ii ON p.invoice_id = ii.invoice_id
    WHERE
      ii.item_type = 'finished_products'
  ),
  product_profits AS (
    SELECT
      id,
      name,
      SUM(profit_amount * quantity / (SELECT SUM(quantity) FROM invoice_items WHERE invoice_id = ipi.invoice_id)) AS total_profit,
      AVG(profit_percentage) AS avg_profit_percentage
    FROM
      invoice_profit_items ipi
    GROUP BY
      id, name
  )
  SELECT
    id,
    name,
    total_profit AS profit,
    avg_profit_percentage AS profit_percentage
  FROM
    product_profits
  ORDER BY
    profit DESC
  LIMIT limit_count;
END;
$$;

-- Function to get most used raw materials in production
CREATE OR REPLACE FUNCTION get_most_used_raw_materials(limit_count INTEGER)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  usage_count BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rm.id,
    rm.name,
    COUNT(DISTINCT sfi.semi_finished_id) AS usage_count
  FROM
    raw_materials rm
  JOIN
    semi_finished_ingredients sfi ON rm.id = sfi.raw_material_id
  GROUP BY
    rm.id, rm.name
  ORDER BY
    usage_count DESC
  LIMIT limit_count;
END;
$$;

