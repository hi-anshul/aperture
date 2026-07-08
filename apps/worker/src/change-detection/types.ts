/** Job fields loaded from the DB for diffing against a fresh sync */
export interface ExistingJobForDiff {
  id: string;
  companyId: string;
  externalId: string;
  title: string;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  isActive: boolean;
}
