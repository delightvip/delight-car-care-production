
-- Function to temporarily disable foreign key constraints
CREATE OR REPLACE FUNCTION disable_foreign_key_constraints()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Store the current value of foreign_key_checks
  SET CONSTRAINTS ALL DEFERRED;
END;
$$;

-- Function to re-enable foreign key constraints
CREATE OR REPLACE FUNCTION enable_foreign_key_constraints()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Restore the previous value of foreign_key_checks
  SET CONSTRAINTS ALL IMMEDIATE;
END;
$$;

-- Function to truncate a table with CASCADE option if needed
CREATE OR REPLACE FUNCTION truncate_table(table_name text, cascade boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF cascade THEN
    EXECUTE format('TRUNCATE TABLE %I CASCADE', table_name);
  ELSE
    EXECUTE format('TRUNCATE TABLE %I', table_name);
  END IF;
END;
$$;

COMMENT ON FUNCTION disable_foreign_key_constraints IS 'Temporarily disables foreign key constraint checking';
COMMENT ON FUNCTION enable_foreign_key_constraints IS 'Re-enables foreign key constraint checking';
COMMENT ON FUNCTION truncate_table IS 'Truncates a table with optional CASCADE parameter';
