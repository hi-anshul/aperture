import type { Prisma } from "@aperture/db";

/**
 * Swappable search layer for GET /api/jobs.
 * Postgres ILIKE today; Meilisearch can replace this without changing the API contract.
 */
export interface JobSearchProvider {
  buildSearchConstraint(
    query: string,
  ): Promise<Prisma.JobWhereInput | undefined>;
}

export const JOB_SEARCH_PROVIDER = Symbol("JOB_SEARCH_PROVIDER");
