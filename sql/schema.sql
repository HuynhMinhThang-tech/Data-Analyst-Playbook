-- Schema for Data Analyst Playbook (Thư viện phương pháp phân tích dữ liệu)
-- Target: Postgres (Neon / Vercel Postgres). Run via `npm run migrate`.

CREATE TABLE IF NOT EXISTS categories (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  icon        text,
  description text,
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS methods (
  id           text PRIMARY KEY,
  category_id  text NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title        text NOT NULL,
  question     text,
  when_to_use  text,
  inputs       text,
  how          text,
  output       text,
  caution      text,
  next_methods text,
  level        text,
  tags         text,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(tags, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(question, '') || ' ' || coalesce(when_to_use, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(inputs, '') || ' ' || coalesce(how, '') || ' ' || coalesce(output, '') || ' ' || coalesce(caution, '')), 'C')
  ) STORED
);

CREATE INDEX IF NOT EXISTS methods_category_idx ON methods (category_id);
CREATE INDEX IF NOT EXISTS methods_search_idx ON methods USING GIN (search_vector);

CREATE TABLE IF NOT EXISTS method_examples (
  method_id   text PRIMARY KEY REFERENCES methods(id) ON DELETE CASCADE,
  title       text,
  context     text,
  input       text,
  read        text,
  result      text,
  caveat      text,
  practice    text,
  viz_note    text,
  walkthrough jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps       jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Room to grow: future AI-search feature can cache queries / log usage here.
CREATE TABLE IF NOT EXISTS ai_search_log (
  id          bigserial PRIMARY KEY,
  query       text NOT NULL,
  answer      text,
  method_ids  jsonb NOT NULL DEFAULT '[]'::jsonb,
  sources     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
