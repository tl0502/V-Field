ALTER TABLE platform_accounts ADD COLUMN user_id varchar(8);
ALTER TABLE platform_accounts ADD CONSTRAINT platform_accounts_user_id_key UNIQUE (user_id);

-- gen_random_uuid is a PostgreSQL built-in with a secure random source. This
-- backfill runs once; normal registration uses node:crypto.randomInt and retries.
DO $$
DECLARE
  account_record record;
  candidate text;
BEGIN
  FOR account_record IN SELECT id FROM platform_accounts WHERE user_id IS NULL ORDER BY id LOOP
    LOOP
      candidate := (10000000 + (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))::bit(48)::bigint % 90000000))::text;
      BEGIN
        UPDATE platform_accounts SET user_id = candidate WHERE id = account_record.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- A collision must never reassign another account's number.
      END;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE platform_accounts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE platform_accounts ADD CONSTRAINT platform_accounts_user_id_format
  CHECK (user_id ~ '^[1-9][0-9]{7}$');

CREATE FUNCTION keep_public_user_id() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'public user ID is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER platform_accounts_user_id_immutable BEFORE UPDATE OF user_id ON platform_accounts
FOR EACH ROW EXECUTE FUNCTION keep_public_user_id();
