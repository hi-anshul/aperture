-- Enable trigram search for job tag lookups
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Expression index matches array_to_string(tags, ' ') ILIKE queries in PostgresIlikeJobSearch
CREATE INDEX "jobs_tags_search_trgm_idx" ON "jobs" USING gin ((array_to_string(tags, ' ')) gin_trgm_ops);
