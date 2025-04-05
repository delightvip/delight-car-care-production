
-- Function to temporarily disable foreign key constraints
CREATE OR REPLACE FUNCTION disable_foreign_key_constraints()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set constraints to deferred mode until transaction end
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
  -- Set constraints back to immediate mode
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
  -- Use the CASCADE option if requested
  IF cascade THEN
    EXECUTE format('TRUNCATE TABLE %I CASCADE', table_name);
  ELSE
    EXECUTE format('TRUNCATE TABLE %I', table_name);
  END IF;
END;
$$;

-- Function to delete all data from a table with better error handling
CREATE OR REPLACE FUNCTION delete_all_from_table(table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    -- Try to use TRUNCATE first (faster)
    EXECUTE format('TRUNCATE TABLE %I CASCADE', table_name);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      -- If truncate fails, fall back to DELETE
      EXECUTE format('DELETE FROM %I', table_name);
    EXCEPTION WHEN OTHERS THEN
      -- If both fail, log the error but don't stop the process
      RAISE NOTICE 'Could not clear table %: %', table_name, SQLERRM;
    END;
  END;
END;
$$;

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  exists_bool boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = table_name
  ) INTO exists_bool;
  
  RETURN exists_bool;
END;
$$;

-- Comments for documentation
COMMENT ON FUNCTION disable_foreign_key_constraints IS 'Temporarily disables foreign key constraint checking';
COMMENT ON FUNCTION enable_foreign_key_constraints IS 'Re-enables foreign key constraint checking';
COMMENT ON FUNCTION truncate_table IS 'Truncates a table with optional CASCADE parameter';
COMMENT ON FUNCTION delete_all_from_table IS 'Deletes all data from a table with fallback mechanisms';
COMMENT ON FUNCTION table_exists IS 'Checks if a table exists in the public schema';
