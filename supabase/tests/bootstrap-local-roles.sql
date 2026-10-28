-- Test-only cluster bootstrap for a fresh GitHub Actions runner.
-- Run only against the runner's disposable local PostgreSQL cluster.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
