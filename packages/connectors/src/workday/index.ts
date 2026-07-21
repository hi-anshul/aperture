export {
  WorkdayConnector,
  type FetchFn as WorkdayFetchFn,
} from "./workday.connector";
export {
  extractWorkdayBoard,
  extractWorkdayBoardFromHtml,
  isWorkdayCareersUrl,
} from "./extract-board";
export {
  buildWorkdayJobDetailUrl,
  buildWorkdayJobSourceUrl,
  buildWorkdayJobsListUrl,
  parseWorkdayJobPostings,
  toWorkdayRawJob,
} from "./parse-jobs";
export type {
  WorkdayBoard,
  WorkdayJobDetailResponse,
  WorkdayJobPosting,
  WorkdayJobPostingInfo,
  WorkdayJobsListResponse,
  WorkdayRawJobPayload,
} from "./types";
