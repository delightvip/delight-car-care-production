
-- Add the ingredient_type column to the semi_finished_ingredients table
ALTER TABLE semi_finished_ingredients
ADD COLUMN ingredient_type VARCHAR(20) NOT NULL DEFAULT 'raw',
ADD COLUMN semi_finished_product_id INTEGER REFERENCES semi_finished_products(id);

-- Update existing records to have proper references
UPDATE semi_finished_ingredients
SET ingredient_type = 'raw', semi_finished_product_id = semi_finished_id
WHERE semi_finished_id IS NOT NULL;

-- Create index to improve query performance
CREATE INDEX IF NOT EXISTS idx_semi_finished_ingredients_product_id
ON semi_finished_ingredients(semi_finished_product_id);

-- Ensure we can identify the type of ingredient
CREATE INDEX IF NOT EXISTS idx_semi_finished_ingredients_type
ON semi_finished_ingredients(ingredient_type);
