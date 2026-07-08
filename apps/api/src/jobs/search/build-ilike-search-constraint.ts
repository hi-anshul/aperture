import type { Prisma } from "@aperture/db";

export function buildIlikeSearchConstraint(
  query: string,
  tagMatchIds: string[] = [],
): Prisma.JobWhereInput | undefined {
  const term = query.trim();
  if (!term) {
    return undefined;
  }

  const orConditions: Prisma.JobWhereInput[] = [
    { title: { contains: term, mode: "insensitive" } },
    { location: { contains: term, mode: "insensitive" } },
    { company: { name: { contains: term, mode: "insensitive" } } },
  ];

  if (tagMatchIds.length > 0) {
    orConditions.push({ id: { in: tagMatchIds } });
  }

  return { OR: orConditions };
}
