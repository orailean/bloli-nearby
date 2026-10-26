-- Run as the temporary local migration administrator, connected to postgres.
-- Stop app readers and wait for every importer to exit before running.
-- SCRAM passwords remain valid when a role is renamed; no secret is printed.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_authid WHERE rolname='loo' AND rolpassword LIKE 'SCRAM-SHA-256$%') THEN
    RAISE EXCEPTION 'SCRAM hash required to retain password during role rename';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='bloli') OR EXISTS (SELECT 1 FROM pg_database WHERE datname='bloli_nearby') THEN
    RAISE EXCEPTION 'Target database or role already exists';
  END IF;
END
$$;
ALTER DATABASE loo RENAME TO bloli_nearby;
ALTER ROLE loo RENAME TO bloli;
