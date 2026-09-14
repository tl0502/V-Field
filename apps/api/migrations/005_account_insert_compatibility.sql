-- A previously deployed API may still be draining traffic during an upgrade.
-- Give its old INSERT shape a number too; the new API explicitly allocates and
-- retries candidates under the unique constraint in account-id.js.
CREATE FUNCTION default_public_user_id() RETURNS text LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  candidate text;
  attempt integer;
BEGIN
  FOR attempt IN 1..32 LOOP
    candidate := (10000000 + (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))::bit(48)::bigint % 90000000))::text;
    IF NOT EXISTS (SELECT 1 FROM platform_accounts WHERE user_id = candidate) THEN
      RETURN candidate;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'user_id_allocation_unavailable';
END $$;

ALTER TABLE platform_accounts ALTER COLUMN user_id SET DEFAULT default_public_user_id();
