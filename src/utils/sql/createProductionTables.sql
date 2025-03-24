
-- جداول للإنتاج

-- جدول أوامر الإنتاج
CREATE TABLE IF NOT EXISTS production_orders (
  id SERIAL PRIMARY KEY,
  code VARCHAR NOT NULL,
  product_code VARCHAR NOT NULL,
  product_name VARCHAR NOT NULL,
  quantity NUMERIC NOT NULL,
  unit VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  date DATE NOT NULL,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول مكونات أوامر الإنتاج
CREATE TABLE IF NOT EXISTS production_order_ingredients (
  id SERIAL PRIMARY KEY,
  production_order_id INTEGER NOT NULL,
  raw_material_code VARCHAR NOT NULL,
  raw_material_name VARCHAR NOT NULL,
  required_quantity NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول أوامر التعبئة
CREATE TABLE IF NOT EXISTS packaging_orders (
  id SERIAL PRIMARY KEY,
  code VARCHAR NOT NULL,
  product_code VARCHAR NOT NULL,
  product_name VARCHAR NOT NULL,
  quantity NUMERIC NOT NULL,
  unit VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  date DATE NOT NULL,
  semi_finished_code VARCHAR NOT NULL,
  semi_finished_name VARCHAR NOT NULL,
  semi_finished_quantity NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول مواد التعبئة لأوامر التعبئة
CREATE TABLE IF NOT EXISTS packaging_order_materials (
  id SERIAL PRIMARY KEY,
  packaging_order_id INTEGER NOT NULL,
  packaging_material_code VARCHAR NOT NULL,
  packaging_material_name VARCHAR NOT NULL,
  required_quantity NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers for updating timestamps
CREATE OR REPLACE TRIGGER update_production_orders_timestamp
BEFORE UPDATE ON production_orders
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE OR REPLACE TRIGGER update_packaging_orders_timestamp
BEFORE UPDATE ON packaging_orders
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
