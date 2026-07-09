export {
  computeJobDiff,
  hasMeaningfulChange,
  isEmptyDiff,
} from "./change-detection";
export { applyJobChanges, type ApplyChangesClient, type ApplyChangesResult } from "./apply-changes";
export { handoffJobDiff, type JobDiffHandoffDeps } from "./handoff";
export type { ExistingJobForDiff } from "./types";
