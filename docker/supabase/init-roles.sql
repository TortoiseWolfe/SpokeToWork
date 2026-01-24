-- Initialize Supabase role passwords
-- This script runs after the Supabase postgres image initializes its default roles
-- It sets passwords to match the POSTGRES_PASSWORD environment variable

DO $$
DECLARE
    db_pass TEXT := current_setting('app.settings.postgres_password', true);
BEGIN
    IF db_pass IS NULL OR db_pass = '' THEN
        db_pass := 'your-super-secret-and-long-postgres-password';
    END IF;

    EXECUTE format('ALTER USER supabase_auth_admin WITH PASSWORD %L', db_pass);
    EXECUTE format('ALTER USER authenticator WITH PASSWORD %L', db_pass);
    EXECUTE format('ALTER USER supabase_storage_admin WITH PASSWORD %L', db_pass);

    RAISE NOTICE 'Supabase role passwords updated successfully';
END $$;
