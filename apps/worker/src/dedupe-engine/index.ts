export {
  DedupeEngine,
  createDedupeEngine,
} from "./dedupe-engine";
export {
  buildExternalIdKey,
  buildFuzzyKey,
  isFuzzyMatch,
  normalizeMatchText,
} from "./match-keys";
export type {
  DedupeAction,
  DedupeContext,
  DedupeMatchType,
  DedupeResult,
  DedupedJob,
  ExistingJobSnapshot,
} from "./types";
