/** Structured experience entry extracted from a resume. */
export interface ResumeExperienceEntry {
  company: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  highlights: string[];
}

/** Structured education entry extracted from a resume. */
export interface ResumeEducationEntry {
  institution: string;
  degree: string | null;
  field: string | null;
  graduationYear: string | null;
}

/** Canonical extracted resume payload stored on `resumes` and returned by the API. */
export interface ExtractedResumeData {
  skills: string[];
  experience: ResumeExperienceEntry[];
  education: ResumeEducationEntry[];
  keywords: string[];
}
