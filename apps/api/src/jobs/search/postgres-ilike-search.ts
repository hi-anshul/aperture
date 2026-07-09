import { prisma } from "@aperture/db";
import type { JobSearchProvider } from "./job-search.provider";
import { buildIlikeSearchConstraint } from "./build-ilike-search-constraint";

/** Cap tag-match IDs passed into downstream Prisma filters. */
export const TAG_MATCH_LIMIT = 500;

export class PostgresIlikeJobSearch implements JobSearchProvider {
  async buildSearchConstraint(query: string) {
    const term = query.trim();
    if (!term) {
      return undefined;
    }

    const tagMatchIds = await this.findTagMatchIds(term);
    return buildIlikeSearchConstraint(term, tagMatchIds);
  }

  private async findTagMatchIds(term: string): Promise<string[]> {
    const pattern = `%${term}%`;
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM jobs
      WHERE immutable_array_to_string(tags, ' ') ILIKE ${pattern}
      LIMIT ${TAG_MATCH_LIMIT}
    `;

    return rows.map((row) => row.id);
  }
}
