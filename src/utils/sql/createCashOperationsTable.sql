
-- Check if cash_operations table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cash_operations') THEN
        CREATE TABLE public.cash_operations (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            operation_type TEXT NOT NULL,
            account_type TEXT,
            from_account TEXT,
            to_account TEXT,
            amount NUMERIC NOT NULL,
            reference TEXT,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        RAISE NOTICE 'Created cash_operations table';
    ELSE
        RAISE NOTICE 'cash_operations table already exists';
    END IF;
END
$$;

-- Ensure all tables have the needed triggers for timestamps
DO $$
DECLARE
    tables_array TEXT[] := ARRAY[
        'cash_operations',
        'financial_transactions',
        'financial_categories',
        'financial_balance',
        'party_balances',
        'parties',
        'invoices',
        'invoice_items',
        'payments',
        'returns',
        'return_items',
        'ledger',
        'profits'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables_array
    LOOP
        -- Check if the table exists
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            -- Check if updated_at column exists
            IF EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = t 
                AND column_name = 'updated_at'
            ) THEN
                -- Check if update_timestamp trigger exists for this table
                IF NOT EXISTS (
                    SELECT FROM pg_trigger
                    WHERE tgname = t || '_updated_at_trigger'
                    AND tgrelid = ('public.' || t)::regclass
                ) THEN
                    EXECUTE format('
                        CREATE TRIGGER %I
                        BEFORE UPDATE ON %I
                        FOR EACH ROW
                        EXECUTE FUNCTION update_timestamp();
                    ', t || '_updated_at_trigger', t);
                    
                    RAISE NOTICE 'Created updated_at trigger for %', t;
                END IF;
            END IF;
        END IF;
    END LOOP;
END
$$;

-- Ensure we have a function to reset all tables - useful for debugging and maintenance
CREATE OR REPLACE FUNCTION reset_all_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tables_array TEXT[] := ARRAY[
        'cash_operations',
        'financial_transactions',
        'return_items',
        'returns',
        'invoice_items',
        'invoices',
        'payments',
        'profits',
        'ledger',
        'party_balances',
        'inventory_movements',
        'packaging_order_materials',
        'packaging_orders',
        'production_order_ingredients',
        'production_orders',
        'finished_product_packaging',
        'semi_finished_ingredients',
        'finished_products',
        'semi_finished_products',
        'packaging_materials',
        'raw_materials',
        'parties',
        'financial_categories',
        'financial_balance'
    ];
    t TEXT;
BEGIN
    -- Disable foreign key constraints temporarily
    PERFORM disable_foreign_key_constraints();
    
    FOREACH t IN ARRAY tables_array
    LOOP
        -- Try to truncate each table
        BEGIN
            EXECUTE format('TRUNCATE TABLE %I CASCADE', t);
            RAISE NOTICE 'Truncated table %', t;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error truncating table %: %', t, SQLERRM;
        END;
    END LOOP;
    
    -- Re-enable foreign key constraints
    PERFORM enable_foreign_key_constraints();
    
    -- Reset sequences
    PERFORM reset_sequence('raw_materials', 1);
    PERFORM reset_sequence('semi_finished_products', 1);
    PERFORM reset_sequence('packaging_materials', 1);
    PERFORM reset_sequence('finished_products', 1);
    PERFORM reset_sequence('production_orders', 1);
    PERFORM reset_sequence('packaging_orders', 1);
    
    -- Initialize financial_balance with default values
    INSERT INTO financial_balance (id, cash_balance, bank_balance)
    VALUES ('1', 0, 0)
    ON CONFLICT (id) DO UPDATE 
    SET cash_balance = 0, bank_balance = 0, last_updated = CURRENT_TIMESTAMP;
    
    RAISE NOTICE 'All tables have been reset successfully';
END;
$$;

COMMENT ON FUNCTION reset_all_tables IS 'Resets all tables in the system. Use with extreme caution - all data will be lost.';
