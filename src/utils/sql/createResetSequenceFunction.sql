
-- Function to reset table sequences
CREATE OR REPLACE FUNCTION reset_sequence(IN p_table_name text, IN p_seq_value bigint)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  seq_name text;
BEGIN
  -- Get the sequence name for the table
  SELECT pg_get_serial_sequence(p_table_name, 'id') INTO seq_name;
  
  -- Reset the sequence
  IF seq_name IS NOT NULL THEN
    EXECUTE format('ALTER SEQUENCE %s RESTART WITH %s', seq_name, p_seq_value);
  END IF;
END;
$$;

COMMENT ON FUNCTION reset_sequence IS 'Resets a sequence associated with a table to a specific value';
