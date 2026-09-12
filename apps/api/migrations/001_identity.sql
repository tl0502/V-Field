CREATE TABLE platform_accounts (
  id uuid PRIMARY KEY,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE wechat_identities (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
  app_id varchar(64) NOT NULL,
  openid varchar(128) NOT NULL,
  unionid varchar(128),
  first_bound_at timestamptz NOT NULL,
  last_login_at timestamptz NOT NULL,
  UNIQUE (app_id, openid),
  UNIQUE (account_id, app_id)
);

CREATE INDEX wechat_identities_account_idx ON wechat_identities (account_id);

CREATE TABLE business_domains (
  id uuid PRIMARY KEY,
  slug varchar(64) NOT NULL UNIQUE,
  name varchar(128) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL
);

CREATE TABLE domain_memberships (
  account_id uuid NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES business_domains(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL CHECK (status IN ('active', 'removed')),
  approved_at timestamptz,
  approved_by uuid REFERENCES platform_accounts(id),
  PRIMARY KEY (account_id, domain_id)
);

CREATE TABLE domain_join_requests (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES business_domains(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL,
  decided_at timestamptz,
  decided_by uuid REFERENCES platform_accounts(id),
  reason text
);

CREATE UNIQUE INDEX domain_join_requests_pending_idx
  ON domain_join_requests (account_id, domain_id)
  WHERE status = 'pending';

CREATE TABLE platform_operator_grants (
  account_id uuid PRIMARY KEY REFERENCES platform_accounts(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL,
  source varchar(32) NOT NULL
);

CREATE TABLE domain_operator_grants (
  account_id uuid NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES business_domains(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL,
  granted_by uuid REFERENCES platform_accounts(id),
  PRIMARY KEY (account_id, domain_id)
);

CREATE TABLE admin_credentials (
  account_id uuid PRIMARY KEY REFERENCES platform_accounts(id) ON DELETE CASCADE,
  login_name varchar(64) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
  audience varchar(20) NOT NULL CHECK (audience IN ('miniprogram', 'admin')),
  token_hash varchar(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX auth_sessions_account_idx ON auth_sessions (account_id, expires_at DESC);
CREATE INDEX auth_sessions_active_idx ON auth_sessions (token_hash, expires_at)
  WHERE revoked_at IS NULL;

INSERT INTO business_domains (id, slug, name, status, created_at)
VALUES (
  '8b1c0e2a-4d3f-4a6b-9c1d-0e2f3a4b5c6d',
  'auto-verify',
  '汽车验证域',
  'active',
  now()
);
