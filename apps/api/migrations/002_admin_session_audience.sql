ALTER TABLE auth_sessions DROP CONSTRAINT IF EXISTS auth_sessions_audience_check;

ALTER TABLE auth_sessions
  ADD CONSTRAINT auth_sessions_audience_check
  CHECK (audience IN ('miniprogram', 'admin', 'admin-platform', 'admin-domain'));
