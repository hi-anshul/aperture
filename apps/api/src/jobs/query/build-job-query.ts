import type { Prisma } from "@aperture/db";
import type { JobFilters } from "../filters/job-filters";
import { buildJobFilterConstraint } from "../filters/job-filters";

export async function buildJobWhereClause(input: {
  filters: JobFilters;
  searchConstraint?: Prisma.JobWhereInput;
}): Promise<Prisma.JobWhereInput> {
  const conditions: Prisma.JobWhereInput[] = [{ isActive: true }];

  const filterConstraint = buildJobFilterConstraint(input.filters);
  if (filterConstraint) {
    conditions.push(filterConstraint);
  }

  if (input.searchConstraint) {
    conditions.push(input.searchConstraint);
  }

  return { AND: conditions };
}
