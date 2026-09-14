ALTER TABLE domain_join_requests DROP CONSTRAINT domain_join_requests_status_check;
ALTER TABLE domain_join_requests ADD CONSTRAINT domain_join_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));

CREATE TABLE article_types (
  id uuid PRIMARY KEY,
  domain_id uuid NOT NULL REFERENCES business_domains(id),
  name varchar(32) NOT NULL,
  normalized_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  rules jsonb NOT NULL CHECK (jsonb_typeof(rules) = 'object'),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (domain_id, normalized_name),
  UNIQUE (id, domain_id)
);

CREATE TABLE domain_tags (
  id uuid PRIMARY KEY,
  domain_id uuid NOT NULL REFERENCES business_domains(id),
  name varchar(24) NOT NULL,
  normalized_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES platform_accounts(id),
  source varchar(16) NOT NULL CHECK (source IN ('member', 'operator')),
  created_at timestamptz NOT NULL,
  UNIQUE (domain_id, normalized_name)
);

CREATE TABLE articles (
  id uuid PRIMARY KEY,
  domain_id uuid NOT NULL REFERENCES business_domains(id),
  author_id uuid NOT NULL REFERENCES platform_accounts(id),
  type_id uuid NOT NULL,
  operation_id varchar(80) NOT NULL,
  submission_hash varchar(64) NOT NULL,
  title varchar(80) NOT NULL,
  type_snapshot jsonb NOT NULL CHECK (jsonb_typeof(type_snapshot) = 'object'),
  blocks jsonb NOT NULL CHECK (jsonb_typeof(blocks) = 'array'),
  tags jsonb NOT NULL CHECK (jsonb_typeof(tags) = 'array'),
  excerpt varchar(180) NOT NULL,
  created_at timestamptz NOT NULL,
  deleted_at timestamptz,
  FOREIGN KEY (type_id, domain_id) REFERENCES article_types(id, domain_id),
  UNIQUE (author_id, domain_id, operation_id)
);

CREATE INDEX articles_domain_feed_idx ON articles (domain_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX domain_join_requests_review_idx ON domain_join_requests (domain_id, created_at, id)
  WHERE status = 'pending';
