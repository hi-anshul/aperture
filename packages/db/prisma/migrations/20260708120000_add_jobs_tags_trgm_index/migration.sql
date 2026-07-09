-- array_to_string() is STABLE in Postgres, so wrap it for use in an index expression.
CREATE OR REPLACE FUNCTION immutable_array_to_string(arr text[], delimiter text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT array_to_string(arr, delimiter);
$$;

-- Enable trigram search for job tag lookups
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Expression index matches immutable_array_to_string(tags, ' ') ILIKE queries in PostgresIlikeJobSearch
CREATE INDEX "jobs_tags_search_trgm_idx" ON "jobs" USING gin ((immutable_array_to_string(tags, ' ')) gin_trgm_ops);
