export {
  computeJobDiff,
  hasMeaningfulChange,
  isEmptyDiff,
} from "./change-detection";
export { applyJobChanges, type ApplyChangesClient, type ApplyChangesResult } from "./apply-changes";
export { handoffJobDiff } from "./handoff";
export type { ExistingJobForDiff } from "./types";
